import pg from 'pg';
import { config } from './config.js';
export const db = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.DB_POOL_MAX || 4),
});
export const warehouse = new pg.Pool({
  connectionString: config.warehouseUrl,
  max: 4,
  statement_timeout: 5000,
  query_timeout: 6000,
});
export async function transaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const x = await fn(c);
    await c.query('COMMIT');
    return x;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
