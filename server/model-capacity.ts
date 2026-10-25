import { randomUUID } from 'node:crypto';
import { db, transaction } from './db.js';
export async function acquireModelSlot(signal: AbortSignal) {
  const id = randomUUID();
  while (!signal.aborted) {
    const acquired = await transaction(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(274367)');
      await c.query('DELETE FROM model_leases WHERE expires_at<now()');
      const n = await c.query('SELECT count(*)::int n FROM model_leases');
      if (n.rows[0].n >= Number(process.env.MODEL_CONCURRENCY || 25)) return false;
      await c.query(
        "INSERT INTO model_leases(id,expires_at) VALUES($1,now()+interval '90 seconds')",
        [id],
      );
      return true;
    });
    if (acquired)
      return async () => {
        await db.query('DELETE FROM model_leases WHERE id=$1', [id]);
      };
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));
  }
  throw Error('Investigation deadline reached');
}
