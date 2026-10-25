import { numericalProsePattern } from '../../server/facts.js';
import { db } from '../../server/db.js';
import { mkdir, writeFile } from 'node:fs/promises';
const cases = [
  {
    name: 'original inventory comparison',
    dataset: 'inventory',
    question: 'Compare revenue and inventory availability. Give cautious evidence-backed findings.',
    expected: 'completed',
    evidence: 'inventory',
  },
  {
    name: 'stock availability',
    dataset: 'inventory',
    question:
      'Which products were out of stock during the current period? Describe availability only.',
    expected: 'completed',
    evidence: 'inventory',
  },
  {
    name: 'revenue observation',
    dataset: 'inventory',
    question:
      'Compare Alpine Jacket campaign revenue in the current and previous periods. I want observed results, not proof of cause.',
    expected: 'completed',
    evidence: 'revenue',
  },
  {
    name: 'duplicate count',
    dataset: 'duplicates',
    question:
      'How many duplicate order events exist? Compare raw revenue with deduplicated revenue.',
    expected: 'completed',
    evidence: 'quality',
  },
  {
    name: 'quality diagnosis',
    dataset: 'duplicates',
    question: 'Does counting every event overstate revenue compared with counting each order once?',
    expected: 'completed',
    evidence: 'quality',
  },
  {
    name: 'late reporting',
    dataset: 'delay',
    question: 'Did sales really decline, or is recent reporting incomplete?',
    expected: 'incomplete',
    evidence: 'freshness',
  },
  {
    name: 'causal proof',
    dataset: 'inventory',
    question: 'Prove that stockouts caused the revenue decline, ruling out all other explanations.',
    expected: 'incomplete',
    evidence: 'inventory',
  },
  {
    name: 'unavailable forecast',
    dataset: 'inventory',
    question: 'Exactly what will our revenue be next month? Give a verified prediction.',
    expected: 'incomplete',
    evidence: 'revenue',
  },
];
const results: any[] = [];
try {
  for (let repeat = 1; repeat <= 2; repeat++) {
    await Promise.all(
      cases.map(async (c) => {
        const started = Date.now();
        const response = await fetch('http://127.0.0.1:4317/api/investigations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify(c),
        });
        if (!response.ok) throw Error('Evaluation submission failed');
        const { id } = await response.json();
        let row: any;
        do {
          await new Promise((r) => setTimeout(r, 500));
          row = (await db.query('SELECT * FROM investigations WHERE id=$1', [id])).rows[0];
          if (Date.now() - started > 300000) throw Error('Evaluation timed out');
        } while (['queued', 'running'].includes(row.status));
        const cited = row.result?.findings?.some((f: any) => f.evidenceIds?.includes(c.evidence));
        const grounded = row.result?.evidence?.some((e: any) => e.id === c.evidence && !e.error);
        const proseClean =
          row.result?.rendering === 'verified_measurements' ||
          !numericalProsePattern.test(row.result?.summary || '') ||
          c.name === 'late reporting';
        const causalSafe =
          !/(?:due to|caused by|because of) (?:the )?(?:significant |complete |reported )?(?:stock[ -]?outs?|inventory shortages?)/i.test(
            row.result?.summary || '',
          );
        const measurementsValid = (row.result?.findings || []).every((f: any) =>
          (f.measurements || []).every(
            (m: any) =>
              row.result.evidence.find((e: any) => e.id === m.evidenceId)?.rows[m.rowIndex]?.[
                m.field
              ] === m.value,
          ),
        );
        const passed =
          measurementsValid &&
          proseClean &&
          causalSafe &&
          row.status === c.expected &&
          grounded &&
          !!cited &&
          !row.error &&
          row.result?.headline !== 'Some findings could not be verified';
        results.push({
          case: c.name,
          repeat,
          id,
          expected: c.expected,
          actual: row.status,
          cited,
          grounded,
          measurementsValid,
          proseClean,
          causalSafe,
          passed,
          summary: row.result?.summary,
          uncertainties: row.result?.uncertainties,
          error: row.error,
        });
      }),
    );
  }
  const result = {
    kind: 'Answer scope quality evaluation',
    scope:
      'Eight question variants, two runs each. Tests expected completion versus abstention, required evidence citations, numerical prose and a direct stockout-causality regression. This is a narrow automated evaluation, not universal semantic accuracy.',
    qualityCases: results,
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    errors: results.filter((r) => r.error).length,
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/answer-quality.json', JSON.stringify(result, null, 2));
  await writeFile(
    '.runtime/answer-quality-' + Date.now() + '.json',
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  if (result.passed < result.total) process.exitCode = 1;
} finally {
  await db.end();
}
