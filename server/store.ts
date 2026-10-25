import { randomUUID } from 'node:crypto';
import { db, transaction } from './db.js';
import { config, type Dataset } from './config.js';
export type Job = Record<string, any> & {
  id: string;
  question: string;
  dataset: Dataset;
  fence: number;
  checkpoint: Record<string, any>;
};
export async function createJob(question: string, dataset: Dataset, key: string) {
  return transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(274368)');
    const old = await c.query('SELECT * FROM investigations WHERE request_key=$1', [key]);
    if (old.rows[0]) {
      if (old.rows[0].question !== question || old.rows[0].dataset !== dataset)
        throw Error('Request key already used for another question');
      return old.rows[0];
    }
    const waiting = await c.query(
      "SELECT count(*)::int n FROM investigations WHERE status IN('queued','running')",
    );
    if (waiting.rows[0].n >= config.queueLimit) throw Error('Queue capacity reached');
    const r = await c.query(
      `INSERT INTO investigations(id,request_key,question,dataset) VALUES($1,$2,$3,$4) ON CONFLICT(request_key) DO NOTHING RETURNING *`,
      [randomUUID(), key, question, dataset],
    );
    if (!r.rows[0]) {
      const x = await c.query('SELECT * FROM investigations WHERE request_key=$1', [key]);
      if (x.rows[0].question !== question || x.rows[0].dataset !== dataset)
        throw Error('Request key conflict');
      return x.rows[0];
    }
    await c.query(
      `INSERT INTO events(job_id,stage,detail) VALUES($1,'Queued','Investigation saved durably and available to workers.')`,
      [r.rows[0].id],
    );
    return r.rows[0];
  });
}
export async function claim(owner: string): Promise<Job | undefined> {
  return transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(274365)');
    await c.query(
      `UPDATE investigations SET status='incomplete',stage='Recovery limit reached',finished_at=now(),error='Worker recovery limit reached; saved evidence remains available.' WHERE status='running' AND lease_until<now() AND attempts>=3`,
    );
    const n = await c.query(
      `SELECT count(*)::int n FROM investigations WHERE status='running' AND lease_until>now()`,
    );
    if (n.rows[0].n >= config.maxJobs) return;
    const r = await c.query(
      `UPDATE investigations SET status='running',stage='Worker acquired job',owner=$1,fence=fence+1,attempts=attempts+1,started_at=coalesce(started_at,now()),lease_until=now()+($2*interval '1 millisecond') WHERE id=(SELECT id FROM investigations WHERE (status='queued' OR (status='running' AND lease_until<now())) AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      [owner, config.leaseMs],
    );
    return r.rows[0];
  });
}
export async function heartbeat(j: Job) {
  const r = await db.query(
    `UPDATE investigations SET lease_until=now()+($3*interval '1 millisecond') WHERE id=$1 AND fence=$2 AND status='running' AND lease_until>now()`,
    [j.id, j.fence, config.leaseMs],
  );
  if (!r.rowCount) throw Error('Lease lost');
}
export async function checkpoint(
  j: Job,
  stage: string,
  detail: string,
  patch: Record<string, any> = {},
) {
  await transaction(async (c) => {
    const r = await c.query(
      `UPDATE investigations SET checkpoint=checkpoint||$3::jsonb,stage=$4 WHERE id=$1 AND fence=$2 AND status='running' AND lease_until>now()`,
      [j.id, j.fence, JSON.stringify(patch), stage],
    );
    if (!r.rowCount) throw Error('Lease lost');
    await c.query('INSERT INTO events(job_id,stage,detail) VALUES($1,$2,$3)', [
      j.id,
      stage,
      detail,
    ]);
  });
  Object.assign(j.checkpoint, patch);
}
export async function reserveCall(j: Job) {
  const r = await db.query(
    `UPDATE investigations SET model_calls=model_calls+1 WHERE id=$1 AND fence=$2 AND status='running' AND lease_until>now() AND model_calls<$3 RETURNING model_calls`,
    [j.id, j.fence, config.maxCalls],
  );
  if (!r.rowCount) throw Error('Model call budget exhausted or lease lost');
}
export async function usage(j: Job, input: number, output: number) {
  await db.query(
    'UPDATE investigations SET input_tokens=input_tokens+$3,output_tokens=output_tokens+$4 WHERE id=$1 AND fence=$2',
    [j.id, j.fence, input, output],
  );
}
export async function finish(j: Job, status: string, result: any, error: string | null = null) {
  await db.query(
    `UPDATE investigations SET status=$3,result=$4,error=$5,stage=$6,finished_at=now(),lease_until=null WHERE id=$1 AND fence=$2 AND status='running' AND lease_until>now()`,
    [
      j.id,
      j.fence,
      status,
      result,
      error,
      status === 'completed' ? 'Complete' : status === 'cancelled' ? 'Cancelled' : 'Incomplete',
    ],
  );
}
export async function getJob(id: string) {
  const r = await db.query('SELECT * FROM investigations WHERE id=$1', [id]);
  if (!r.rows[0]) return null;
  const e = await db.query('SELECT at,stage,detail FROM events WHERE job_id=$1 ORDER BY id', [id]);
  return { ...r.rows[0], events: e.rows };
}
