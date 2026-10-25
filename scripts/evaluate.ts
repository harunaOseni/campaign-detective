import { mkdir, writeFile } from 'node:fs/promises';
const cases = [
  {
    dataset: 'inventory',
    question: 'Why did campaign revenue drop despite steady ad spend? Check stock availability.',
    expected: 'inventory',
  },
  {
    dataset: 'delay',
    question:
      'Is the recent sales decline real or caused by delayed reporting? Compare mature windows.',
    expected: 'freshness',
  },
  {
    dataset: 'duplicates',
    question:
      'Are duplicate purchase events inflating campaign revenue? Use verified order identifiers.',
    expected: 'quality',
  },
];
const results = [];
for (const c of cases) {
  const started = Date.now();
  const r = await fetch('http://127.0.0.1:4317/api/investigations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(c),
  });
  if (!r.ok) throw Error('Could not enqueue evaluation');
  const { id } = await r.json();
  let job: any;
  do {
    await new Promise((r) => setTimeout(r, 1500));
    job = await (await fetch('http://127.0.0.1:4317/api/investigations/' + id)).json();
    if (Date.now() - started > 300000) throw Error('Evaluation timeout');
  } while (['queued', 'running'].includes(job.status));
  const evidence = job.result?.evidence || [];
  const e = evidence.find((e: any) => e.id === c.expected);
  const cited = job.result?.findings?.some((f: any) => f.evidenceIds.includes(c.expected));
  const expectedObserved =
    c.dataset === 'inventory'
      ? e?.rows.some((r: any) => r.out_of_stock_days === 7)
      : c.dataset === 'delay'
        ? e?.rows.some((r: any) => r.pending_rows > 0)
        : e?.rows[0]?.duplicate_rows > 0;
  const safeDelay =
    c.dataset !== 'delay' ||
    (job.status === 'incomplete' &&
      job.result?.supported === false &&
      job.result?.headline === 'Recent reporting is incomplete');
  const passed =
    ['completed', 'incomplete'].includes(job.status) &&
    !!cited &&
    !!expectedObserved &&
    safeDelay &&
    !job.error;
  results.push({
    dataset: c.dataset,
    id,
    status: job.status,
    passed,
    expectedEvidence: c.expected,
    cited,
    expectedObserved,
    durationMs: Date.now() - started,
    modelCalls: job.model_calls,
    inputTokens: job.input_tokens,
    outputTokens: job.output_tokens,
    summary: job.result?.summary,
    error: job.error,
  });
  console.log(JSON.stringify(results.at(-1)));
}
await mkdir('.runtime', { recursive: true });
await writeFile(
  '.runtime/evaluation.json',
  JSON.stringify(
    {
      at: new Date().toISOString(),
      scope:
        'Three live model runs; checks expected evidence, citations, and deterministic incomplete-reporting behavior; not exhaustive semantic correctness.',
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
