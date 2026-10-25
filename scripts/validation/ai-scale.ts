import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { db } from '../../server/db.js';
const count = Number(process.argv[2] || 10);
const modelConcurrency = Number(process.env.MODEL_CONCURRENCY || 25);
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
    Array.from({ length: count }, async (_, i) => {
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
  assert.equal(rows.length, count);
  assert.ok(peakRunning <= count);
  const failures = rows.filter(
    (r) => r.error || !r.result?.evidence?.length || r.result.evidence.some((e: any) => e.error),
  );
  const delays = rows.filter((r) => r.dataset === 'delay');
  const delayedDataGatePassed = delays.every(
    (r) =>
      r.status === 'incomplete' &&
      r.result?.supported === false &&
      r.result?.headline === 'Recent reporting is incomplete',
  );
  const useful = rows.filter(
    (r) => r.result?.findings?.length && r.result?.evidence?.length && !r.error,
  );
  const expectedChecksPassed = rows.filter((r) => {
    if (r.error) return false;
    if (r.dataset === 'delay')
      return (
        r.result?.headline === 'Recent reporting is incomplete' && r.result?.supported === false
      );
    const expected = r.dataset === 'inventory' ? 'inventory' : 'quality';
    return (
      r.result?.findings?.some((f: any) => f.evidenceIds?.includes(expected)) &&
      r.result?.headline !== 'Some findings could not be verified'
    );
  }).length;
  const result = {
    partialBreakdown: Object.fromEntries(
      cases.map((c) => [
        c.dataset,
        rows.filter((r) => r.dataset === c.dataset && r.status === 'incomplete').length,
      ]),
    ),
    modelConcurrency,
    usefulAnswers: useful.length,
    expectedChecksPassed,
    kind: 'Live AI scaling: ' + count + ' investigations',
    scope:
      count +
      ' simultaneous submissions with ' +
      count +
      ' worker slots. Real model calls and warehouse queries. Active investigations can be waiting for a database connection or provider response. Answers with findings counts nonempty evidence-backed output, not a human usefulness rating. Partial answers and factual checks are separate from execution success. Model calls are globally capped at ' +
      modelConcurrency +
      '.',
    jobs: count,
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
    delayedDataGatePassed,
    investigationIds: ids,
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/ai-scale-' + count + '.json', JSON.stringify(result, null, 2));
  await writeFile(
    '.runtime/ai-scale-' + count + '-' + Date.now() + '.json',
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  if (
    failures.length ||
    !delayedDataGatePassed ||
    useful.length < count ||
    expectedChecksPassed < count
  )
    process.exitCode = 1;
} finally {
  await db.end();
}
