import { warehouse } from './db.js';
import type { Dataset } from './config.js';
const source = `WITH clean AS (SELECT DISTINCT ON(order_id) * FROM warehouse.orders WHERE dataset=$1 AND reported_at<='2026-10-26' ORDER BY order_id,id), o AS(SELECT *, CASE WHEN day<'2026-10-19' THEN 'previous' ELSE 'current' END period FROM clean)`;
export const queries = {
  revenue: {
    label: 'Campaign revenue and spend',
    sql: `${source} SELECT campaign,period,count(*)::int orders,round(sum(net_revenue),2)::float8 revenue,(SELECT sum(spend)::float8 FROM warehouse.ads a WHERE a.dataset=$1 AND a.campaign=o.campaign AND (CASE WHEN a.day<'2026-10-19' THEN 'previous' ELSE 'current' END)=o.period) spend FROM o GROUP BY campaign,period ORDER BY campaign,period`,
  },
  freshness: {
    label: 'Reporting completeness by day',
    sql: `SELECT day::text,count(*)::int total_rows,count(*) FILTER(WHERE reported_at<='2026-10-26')::int reported_rows,count(*) FILTER(WHERE reported_at>'2026-10-26')::int pending_rows FROM warehouse.orders WHERE dataset=$1 GROUP BY day ORDER BY day`,
  },
  quality: {
    label: 'Duplicate order identifiers',
    sql: `SELECT count(*)::int event_rows,count(DISTINCT order_id)::int unique_orders,(count(*)-count(DISTINCT order_id))::int duplicate_rows,round(sum(net_revenue),2)::float8 raw_revenue,(SELECT round(sum(net_revenue),2)::float8 FROM (SELECT DISTINCT ON(order_id) net_revenue FROM warehouse.orders WHERE dataset=$1 ORDER BY order_id,id) d) deduplicated_revenue, (sum(net_revenue)-(SELECT sum(net_revenue) FROM (SELECT DISTINCT ON(order_id) net_revenue FROM warehouse.orders WHERE dataset=$1 ORDER BY order_id,id) d))::float8 duplicate_revenue FROM warehouse.orders WHERE dataset=$1`,
  },
  inventory: {
    label: 'Product availability',
    sql: `SELECT campaign,CASE WHEN day<'2026-10-19' THEN 'previous' ELSE 'current' END period,min(available)::int minimum_stock,count(*) FILTER(WHERE available=0)::int out_of_stock_days FROM warehouse.inventory WHERE dataset=$1 GROUP BY campaign,period ORDER BY campaign,period`,
  },
  customers: {
    label: 'Customer segment comparison',
    sql: `${source} SELECT segment,period,count(*)::int orders,round(sum(net_revenue),2)::float8 revenue FROM o GROUP BY segment,period ORDER BY segment,period`,
  },
  aligned: {
    label: 'Mature matching weekdays',
    sql: `${source} SELECT period,round(sum(net_revenue),2)::float8 revenue,count(*)::int orders FROM o WHERE extract(isodow FROM day) BETWEEN 1 AND 5 GROUP BY period ORDER BY period`,
  },
};
export type Check = keyof typeof queries;
export type Evidence = {
  id: Check;
  label: string;
  sql: string;
  rows: Record<string, any>[];
  durationMs: number;
  error?: string;
};
export async function queryEvidence(id: Check, dataset: Dataset): Promise<Evidence> {
  if (!Object.hasOwn(queries, id)) throw Error('Unknown analytical check');
  const t = performance.now();
  const q = queries[id];
  const c = await warehouse.connect();
  try {
    await c.query('BEGIN READ ONLY');
    const result = await c.query(q.sql, [dataset]);
    await c.query('COMMIT');
    return { id, label: q.label, sql: q.sql, rows: result.rows, durationMs: performance.now() - t };
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
