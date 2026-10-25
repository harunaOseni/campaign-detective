import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { db } from '../../server/db.js';
const root = 'http://127.0.0.1:4317/api';
const percentile = (a: number[], p: number) => a.sort((x, y) => x - y)[Math.ceil(a.length * p) - 1];
try {
  const instances: Record<string, number> = {};
  await Promise.all(
    Array.from({ length: 30 }, async () => {
      const r = await fetch(root + '/health');
      assert.ok(r.ok);
      const h = await r.json();
      instances[h.instance] = (instances[h.instance] || 0) + 1;
    }),
  );
  assert.equal(Object.keys(instances).length, 3);
  const start = performance.now(),
    acceptance: number[] = [];
  const cases = [
    {
      dataset: 'inventory',
      question:
        'Compare revenue and inventory availability. Give cautious evidence-backed findings.',
    },
    {
      dataset: 'delay',
      question: 'Is the revenue decline real or incomplete reporting? Check mature dates.',
    },
    {
      dataset: 'duplicates',
      question: 'Do duplicate events inflate raw revenue? Compare raw and deduplicated totals.',
    },
  ];
  const ids = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const t = performance.now();
      const r = await fetch(root + '/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        body: JSON.stringify(cases[i % 3]),
      });
      assert.equal(r.status, 202);
      acceptance.push(performance.now() - t);
      return (await r.json()).id;
    }),
  );
  let peakRunning = 0,
    peakQueued = 0,
    rows: any[] = [];
  do {
    rows = (await db.query('SELECT * FROM investigations WHERE id=ANY($1::uuid[])', [ids])).rows;
    peakRunning = Math.max(peakRunning, rows.filter((r) => r.status === 'running').length);
    peakQueued = Math.max(peakQueued, rows.filter((r) => r.status === 'queued').length);
    if (performance.now() - start > 300000) throw Error('Live burst timed out');
    await new Promise((r) => setTimeout(r, 100));
  } while (rows.some((r) => ['queued', 'running'].includes(r.status)));
  assert.equal(rows.length, 6);
  assert.ok(peakRunning <= 3);
  assert.ok(peakQueued > 0);
  const failures = rows.filter((r) => r.error || !r.result?.evidence?.length);
  assert.equal(failures.length, 0);
  const delays = rows.filter((r) => r.dataset === 'delay');
  assert.ok(
    delays.every(
      (r) =>
        r.status === 'incomplete' &&
        r.result.supported === false &&
        r.result.headline === 'Recent reporting is incomplete',
    ),
  );
  const result = {
    kind: 'Live AI concurrent investigation burst',
    scope:
      'Six simultaneous HTTP submissions using real model calls, three workers, and the seeded million-row warehouse. Incomplete answers are counted separately from execution errors; this is not a correctness score.',
    jobs: 6,
    peakRunning,
    peakQueued,
    completed: rows.filter((r) => r.status === 'completed').length,
    incomplete: rows.filter((r) => r.status === 'incomplete').length,
    rejectedFindings: rows.filter(
      (r) => r.result?.headline === 'Some findings could not be verified',
    ).length,
    errors: failures.length,
    elapsedMs: performance.now() - start,
    p95AcceptMs: percentile(acceptance, 0.95),
    p95WaitMs: percentile(
      rows.map((r) => new Date(r.started_at).getTime() - new Date(r.created_at).getTime()),
      0.95,
    ),
    p95EndToEndMs: percentile(
      rows.map((r) => new Date(r.finished_at).getTime() - new Date(r.created_at).getTime()),
      0.95,
    ),
    inputTokens: rows.reduce((n, r) => n + Number(r.input_tokens), 0),
    outputTokens: rows.reduce((n, r) => n + Number(r.output_tokens), 0),
    modelCalls: rows.reduce((n, r) => n + r.model_calls, 0),
    gatewayDistribution: instances,
    delayedDataGatePassed: true,
    investigationIds: ids,
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/live-load-validation.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await db.end();
}
