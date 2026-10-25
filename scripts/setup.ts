import { readFile } from 'node:fs/promises';
import { db } from '../server/db.js';
await db.query(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
const { rows } = await db.query('SELECT count(*)::int n FROM warehouse.orders');
if (!rows[0].n) {
  await db.query(`INSERT INTO warehouse.orders
 SELECT i, d, CASE WHEN d='duplicates' AND i%8=0 THEN i-3 ELSE i END,
 '2026-10-12'::date+(i%14)::int,
 CASE WHEN i%5<2 THEN 'Alpine Jacket' WHEN i%5<4 THEN 'Everyday Shoes' ELSE 'Trail Socks' END,
 CASE WHEN i%2=0 THEN 'Returning' ELSE 'New' END,
 CASE WHEN d='inventory' AND i%14>=7 AND i%5<2 THEN 0 ELSE 40+(i%50) END,
 '2026-10-12'::date+(i%14)::int+CASE WHEN d='delay' AND i%14>=12 THEN 3 ELSE 0 END
 FROM generate_series(1,1000000) i CROSS JOIN LATERAL (SELECT CASE WHEN i%3=0 THEN 'inventory' WHEN i%3=1 THEN 'delay' ELSE 'duplicates' END d) x`);
  await db.query(
    `INSERT INTO warehouse.ads SELECT d,c,'2026-10-12'::date+n,1000,500 FROM unnest(ARRAY['inventory','delay','duplicates']) d CROSS JOIN unnest(ARRAY['Alpine Jacket','Everyday Shoes','Trail Socks']) c CROSS JOIN generate_series(0,13) n ON CONFLICT DO NOTHING`,
  );
  await db.query(
    `INSERT INTO warehouse.inventory SELECT d,c,'2026-10-12'::date+n, CASE WHEN d='inventory' AND c='Alpine Jacket' AND n>=7 THEN 0 ELSE 100 END FROM unnest(ARRAY['inventory','delay','duplicates']) d CROSS JOIN unnest(ARRAY['Alpine Jacket','Everyday Shoes','Trail Socks']) c CROSS JOIN generate_series(0,13) n ON CONFLICT DO NOTHING`,
  );
  await db.query(
    `INSERT INTO warehouse.metadata VALUES('seed_version','2'),('rows','1000000') ON CONFLICT DO NOTHING`,
  );
  await db.query(
    `UPDATE warehouse.orders d SET order_id=o.id,day=o.day,campaign=o.campaign,segment=o.segment,net_revenue=o.net_revenue,reported_at=o.reported_at FROM warehouse.orders o WHERE d.dataset='duplicates' AND d.id%8=0 AND o.id=d.id-3`,
  );
  await db.query('ANALYZE warehouse.orders');
}
console.log('Database ready: 1,000,000 synthetic order-event rows across three scenarios.');
await db.end();
