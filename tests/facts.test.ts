import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacts, groundReport, omitNumericalProse } from '../server/facts.js';
import type { Evidence } from '../server/queries.js';
const report = (id: string) => ({
  headline: 'Observed results',
  summary: 'These are observed totals, not a causal explanation.',
  findings: [
    {
      title: 'Campaign revenue',
      explanation: 'Compare the reported values.',
      factIds: [id],
      uncertainties: [],
    },
  ],
  recommendations: ['Review the evidence.'],
  uncertainties: [],
  supported: true,
  recheck: [],
});
for (const value of [0, 0.01, 12.35, 1000, 1537463.29, -51.25])
  test('renders exact evidence-derived amount ' + value, () => {
    const evidence: Evidence[] = [
      {
        id: 'revenue',
        label: 'Revenue',
        sql: '',
        durationMs: 0,
        rows: [{ campaign: 'Alpine Jacket', period: 'current', revenue: value }],
      },
    ];
    const grounded = groundReport(report('revenue:0:revenue'), evidence);
    assert.deepEqual(grounded.errors, []);
    assert.equal(grounded.report.findings[0].measurements[0].value, value);
    assert.match(grounded.report.findings[0].explanation, /Alpine Jacket · current/);
  });
for (const id of [
  'revenue:99:revenue',
  'inventory:0:available',
  'revenue:0:campaign',
  'fake:0:value',
])
  test('rejects nonexistent numerical fact ' + id, () => {
    const e: Evidence[] = [
      {
        id: 'revenue',
        label: 'Revenue',
        sql: '',
        durationMs: 0,
        rows: [{ revenue: 20, campaign: 'Alpine' }],
      },
    ];
    assert.ok(groundReport(report(id), e).errors.length);
  });
test('does not allow model-written numbers to bypass fact binding', () => {
  const e: Evidence[] = [
    { id: 'revenue', label: 'Revenue', sql: '', durationMs: 0, rows: [{ revenue: 20 }] },
  ];
  for (const field of ['summary', 'headline']) {
    const r: any = report('revenue:0:revenue');
    r[field] = 'Revenue was 999';
    assert.ok(groundReport(r, e).errors.length);
  }
});
test('failed evidence cannot create facts', () => {
  assert.deepEqual(
    buildFacts([
      {
        id: 'revenue',
        label: 'r',
        sql: '',
        durationMs: 0,
        error: 'Failed',
        rows: [{ revenue: 100 }],
      },
    ]),
    [],
  );
});
test('empty findings cannot pretend to provide evidence', () => {
  const r = report('');
  r.findings[0].factIds = [];
  assert.ok(groundReport(r, []).errors.length);
});

test('number words cannot bypass fact binding', () => {
  const e: Evidence[] = [
    { id: 'revenue', label: 'Revenue', sql: '', durationMs: 0, rows: [{ revenue: 20 }] },
  ];
  for (const text of ['Revenue was twenty million dollars.', 'There were zero orders.']) {
    const r = report('revenue:0:revenue');
    r.summary = text;
    assert.ok(groundReport(r, e).errors.length);
  }
});
test('direct stockout causal claim is rejected even with a valid citation', () => {
  const e: Evidence[] = [
    { id: 'revenue', label: 'Revenue', sql: '', durationMs: 0, rows: [{ revenue: 20 }] },
  ];
  const r = report('revenue:0:revenue');
  r.summary = 'Revenue fell due to significant stock-outs.';
  assert.ok(groundReport(r, e).errors.some((x) => x.includes('causal')));
  r.summary = 'Revenue fell alongside stockouts; causation is not established.';
  assert.deepEqual(groundReport(r, e).errors, []);
});

test('numerical prose fallback retains exact evidence without inventing a replacement claim', () => {
  const e: Evidence[] = [
    { id: 'revenue', label: 'Revenue', sql: '', durationMs: 0, rows: [{ revenue: 20 }] },
  ];
  const r = report('revenue:0:revenue');
  r.summary = 'Revenue was ninety million.';
  r.findings[0].explanation = 'Revenue was 999.';
  r.supported = false;
  const result = groundReport(omitNumericalProse(r), e);
  assert.deepEqual(result.errors, []);
  assert.equal(result.report.supported, false);
  assert.equal(result.report.findings[0].measurements[0].value, 20);
  assert.ok(!result.report.summary.includes('ninety'));
  assert.ok(!result.report.findings[0].explanation.includes('999'));
  r.findings[0].factIds = ['fake'];
  assert.ok(groundReport(omitNumericalProse(r), e).errors.length);
});
