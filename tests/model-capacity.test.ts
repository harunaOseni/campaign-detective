import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireModelSlot } from '../server/model-capacity.js';
import { db, warehouse } from '../server/db.js';
test.after(async () => {
  await db.end();
  await warehouse.end();
});
test('model capacity queues calls, honors cancellation, and releases slots', async () => {
  // Run tests with model workers idle, so this test owns its leases.
  const old = process.env.MODEL_CONCURRENCY;
  process.env.MODEL_CONCURRENCY = '2';
  const a = new AbortController(),
    b = new AbortController();
  let releaseA: (() => Promise<void>) | undefined, releaseB: (() => Promise<void>) | undefined;
  try {
    releaseA = await acquireModelSlot(a.signal);
    releaseB = await acquireModelSlot(a.signal);
    const waiting = acquireModelSlot(b.signal);
    setTimeout(() => b.abort(), 100);
    await assert.rejects(waiting, /deadline/);
    assert.equal((await db.query('SELECT count(*)::int n FROM model_leases')).rows[0].n, 2);
    await releaseA();
    releaseA = undefined;
    const releaseNext = await acquireModelSlot(a.signal);
    await releaseNext();
  } finally {
    await releaseA?.();
    await releaseB?.();
    if (old === undefined) delete process.env.MODEL_CONCURRENCY;
    else process.env.MODEL_CONCURRENCY = old;
  }
});
