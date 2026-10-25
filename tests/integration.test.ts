import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, warehouse } from '../server/db.js';
import { queryEvidence } from '../server/queries.js';
import { createJob, checkpoint, finish, claim, heartbeat, reserveCall } from '../server/store.js';
import { applyCompletenessGate, validateReport } from '../server/agents.js';
const ids: string[] = [];
test.after(async () => {
  if (ids.length) {
    await db.query('DELETE FROM events WHERE job_id=ANY($1::uuid[])', [ids]);
    await db.query('DELETE FROM investigations WHERE id=ANY($1::uuid[])', [ids]);
  }
  await db.end();
  await warehouse.end();
});
test('one million synthetic records, with stockout evidence', async () => {
  assert.equal(
    Number((await warehouse.query('SELECT count(*) n FROM warehouse.orders')).rows[0].n),
    1000000,
  );
  const stock = await queryEvidence('inventory', 'inventory');
  assert.equal(
    stock.rows.find((r) => r.campaign === 'Alpine Jacket' && r.period === 'current')
      ?.out_of_stock_days,
    7,
  );
  const rev = await queryEvidence('revenue', 'inventory');
  assert.equal(
    rev.rows.find((r) => r.campaign === 'Alpine Jacket' && r.period === 'current')?.revenue,
    0,
  );
});
test('delay and duplicate fixtures produce independently detectable evidence', async () => {
  const delay = await queryEvidence('freshness', 'delay');
  assert.ok(delay.rows.some((r) => r.pending_rows > 0));
  const dup = await queryEvidence('quality', 'duplicates');
  assert.ok(dup.rows[0].duplicate_rows > 40000);
});
test('warehouse role cannot mutate data', async () => {
  await assert.rejects(
    warehouse.query('DELETE FROM warehouse.orders WHERE false'),
    /read-only|permission denied/,
  );
});
test('query runner rejects arbitrary SQL / unknown tool names', async () => {
  await assert.rejects(
    queryEvidence('DROP TABLE warehouse.orders' as any, 'inventory'),
    /Unknown analytical check/,
  );
});
test('fenced writes reject stale workers without overwriting saved evidence', async () => {
  const id = randomUUID();
  ids.push(id);
  await db.query(
    `INSERT INTO investigations(id,request_key,question,dataset,status,fence,lease_until) VALUES($1,$2,'test','inventory','running',2,now()+interval '5 minutes')`,
    [id, id],
  );
  const stale: any = { id, fence: 1, checkpoint: {} };
  await assert.rejects(checkpoint(stale, 'wrong', 'wrong'), /Lease lost/);
  await finish(stale, 'completed', { wrong: true });
  assert.equal(
    (await db.query('SELECT result FROM investigations WHERE id=$1', [id])).rows[0].result,
    null,
  );
});
test('create and queue are one durable idempotent record', async () => {
  const key = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => createJob('Test idempotent question', 'inventory', key)),
  );
  ids.push(results[0].id);
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  await assert.rejects(createJob('Different question', 'inventory', key));
  await db.query(`UPDATE investigations SET status='cancelled' WHERE id=$1`, [results[0].id]);
});
test('verifier flags invented measurements and missing citations', () => {
  const report: any = {
    findings: [
      {
        evidenceIds: ['revenue'],
        measurements: [{ evidenceId: 'revenue', rowIndex: 0, field: 'revenue', value: 999 }],
      },
    ],
  };
  assert.ok(
    validateReport(report, [
      { id: 'revenue', label: 'r', sql: '', durationMs: 1, rows: [{ revenue: 10 }] },
    ]).some((x) => x.includes('measurement')),
  );
  report.findings[0].evidenceIds = ['inventory'];
  assert.ok(validateReport(report, []).some((x) => x.includes('citations')));
});

test('incomplete reporting overrides a confident but unsupported model conclusion', () => {
  const report: any = {
    headline: 'Sales fell',
    summary: 'Data is complete',
    supported: true,
    findings: [],
    recommendations: ['Cut the budget'],
    uncertainties: [],
    recheck: [],
  };
  const result = applyCompletenessGate(report, [
    { id: 'freshness', label: 'freshness', sql: '', durationMs: 1, rows: [{ pending_rows: 10 }] },
  ]);
  assert.equal(result.supported, false);
  assert.match(result.summary, /10 expected/);
  assert.ok(!result.recommendations.includes('Cut the budget'));
  assert.equal(result.findings[0].evidenceIds[0], 'freshness');
});

test('expired leases cannot be revived and cancelled jobs reject checkpoints', async () => {
  const id = randomUUID();
  ids.push(id);
  await db.query(
    `INSERT INTO investigations(id,request_key,question,dataset,status,fence,lease_until) VALUES($1,$2,'Lease test','inventory','running',2,now()-interval '1 second')`,
    [id, id],
  );
  const j: any = { id, fence: 2, checkpoint: {} };
  await assert.rejects(heartbeat(j), /Lease lost/);
  await db.query(`UPDATE investigations SET status='cancelled',fence=3 WHERE id=$1`, [id]);
  await assert.rejects(checkpoint(j, 'Late result', 'Rejected'), /Lease lost/);
});
test('concurrent model reservations cannot exceed the shared per-job budget', async () => {
  const id = randomUUID();
  ids.push(id);
  await db.query(
    `INSERT INTO investigations(id,request_key,question,dataset,status,fence,lease_until) VALUES($1,$2,'Budget test','inventory','running',1,now()+interval '1 minute')`,
    [id, id],
  );
  const j: any = { id, fence: 1, checkpoint: {} };
  const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => reserveCall(j)));
  assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 10);
  assert.equal(
    (await db.query('SELECT model_calls FROM investigations WHERE id=$1', [id])).rows[0]
      .model_calls,
    10,
  );
});

test('simultaneous submissions cannot bypass queue capacity', async () => {
  const { config } = await import('../server/config.js');
  const previous = config.queueLimit;
  const baseline = Number(
    (await db.query("SELECT count(*) n FROM investigations WHERE status IN('queued','running')"))
      .rows[0].n,
  );
  config.queueLimit = baseline + 1;
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => createJob('Queue admission test', 'inventory', randomUUID())),
    );
    const accepted = attempts.filter(
      (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
    );
    accepted.forEach((r) => ids.push(r.value.id));
    assert.equal(accepted.length, 1);
    assert.equal(attempts.filter((r) => r.status === 'rejected').length, 7);
    await db.query("UPDATE investigations SET status='cancelled' WHERE id=$1", [
      accepted[0].value.id,
    ]);
  } finally {
    config.queueLimit = previous;
  }
});
