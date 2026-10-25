import { numericalProsePattern } from '../../server/facts.js';
import { db } from '../../server/db.js';
import { mkdir, writeFile } from 'node:fs/promises';
// Originally frozen unseen questions; after diagnosis these are regression cases, not a fresh holdout.
const cases = [
  {
    name: 'ad spend versus revenue',
    dataset: 'inventory',
    question:
      'Did Alpine Jacket ad spending fall along with its revenue? Compare the recorded periods, without explaining the cause.',
    expected: 'completed',
    evidence: 'revenue',
  },
  {
    name: 'unaffected products',
    dataset: 'inventory',
    question:
      'Compare the recorded revenue and stock availability for Everyday Shoes and Trail Socks only.',
    expected: 'completed',
    evidence: 'inventory',
  },
  {
    name: 'duplicate fraction inputs',
    dataset: 'duplicates',
    question:
      'Show total event rows and unique orders so I can assess duplication. Do not infer the ingestion bug.',
    expected: 'completed',
    evidence: 'quality',
  },
  {
    name: 'no duplicate assumption',
    dataset: 'inventory',
    question:
      'Are duplicate order events present in this dataset? Use the actual duplicate count, even if there are none.',
    expected: 'completed',
    evidence: 'quality',
  },
  {
    name: 'customer segment observation',
    dataset: 'inventory',
    question:
      'How does recorded revenue compare across customer segments and periods? Describe the observed totals only.',
    expected: 'completed',
    evidence: 'customers',
  },
  {
    name: 'mature dates despite delay',
    dataset: 'delay',
    question:
      'Compare only the fully arrived Monday-through-Friday revenue totals across the two periods. I am not asking about the incomplete weekend.',
    expected: 'completed',
    evidence: 'aligned',
  },
  {
    name: 'profit unavailable',
    citationRequired: false,
    dataset: 'inventory',
    question: 'What is net profit after product costs, salaries and shipping expenses?',
    expected: 'incomplete',
    evidence: 'revenue',
  },
  {
    name: 'unavailable older period',
    citationRequired: false,
    dataset: 'inventory',
    question:
      'Compare revenue in January with February of this year. Do not substitute the available October periods.',
    expected: 'incomplete',
    evidence: 'revenue',
  },
  {
    name: 'causal experiment absent',
    citationRequired: false,
    dataset: 'inventory',
    question:
      'What experiment proves that replenishing inventory will restore sales? Distinguish an observed association from experimental proof.',
    expected: 'incomplete',
    evidence: 'inventory',
  },
  {
    name: 'late reporting pause decision',
    dataset: 'delay',
    question:
      'Should I pause the campaign because the latest sales total is low? First establish whether those records have arrived.',
    expected: 'incomplete',
    evidence: 'freshness',
  },
];
const results: any[] = [];
try {
  for (let repeat = 1; repeat <= 1; repeat++) {
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
          c.dataset === 'delay';
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
          (c.citationRequired === false || (grounded && !!cited)) &&
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
          findings: row.result?.findings,
          uncertainties: row.result?.uncertainties,
          error: row.error,
        });
      }),
    );
  }
  const result = {
    kind: 'Unseen-question sanity check',
    scope:
      'Ten originally unseen questions, now rerun as regressions after the first review. Expected status and evidence checks plus manual review; not a general accuracy benchmark. The mature-date question deliberately tests whether the completeness gate is too broad.',
    qualityCases: results,
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    errors: results.filter((r) => r.error).length,
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/sanity-check.json', JSON.stringify(result, null, 2));
  await writeFile('.runtime/sanity-check-' + Date.now() + '.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (result.passed < result.total) process.exitCode = 1;
} finally {
  await db.end();
}
