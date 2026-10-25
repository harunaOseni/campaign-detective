import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderVerifiedReport,
  explicitlyRequestsWeekdaysOnly,
  pendingInScope,
  scopeCanUseWeekdays,
} from '../server/answer-rendering.js';
import { groundReport } from '../server/facts.js';
import { applyCompletenessGate } from '../server/agents.js';
import type { Evidence } from '../server/queries.js';
const customer: Evidence = {
  id: 'customers',
  label: 'Segments',
  sql: '',
  durationMs: 0,
  rows: [
    { segment: 'New', period: 'previous', orders: 71429 },
    { segment: 'New', period: 'current', orders: 95238 },
  ],
};
const report = {
  supported: true,
  headline: 'Sales restored',
  summary: 'Orders fell after replenishment.',
  findings: [
    {
      title: 'Replenishment',
      explanation: 'Orders decreased after inventory was replenished.',
      factIds: ['customers:0:orders', 'customers:1:orders'],
      uncertainties: ['Reporting is incomplete.'],
    },
  ],
  uncertainties: ['Reporting is incomplete.'],
  recommendations: ['Replenish inventory to restore revenue.'],
  recheck: [],
};
test('published trend uses values, and removes invented events and stale caveats', () => {
  const r = renderVerifiedReport(report, [customer], 'describe');
  assert.match(r.summary, /increased from 71,429 to 95,238/);
  assert.ok(!JSON.stringify(r).includes('replenish'));
  assert.ok(!JSON.stringify(r).includes('Reporting is incomplete'));
  assert.equal(r.findings[0].measurements[0].value, 71429);
});
test('causal requests remain observations-only even if model marks them supported', () => {
  const r = renderVerifiedReport(report, [customer], 'explain_cause');
  assert.equal(r.supported, false);
  assert.match(r.summary, /do not establish a cause/);
  assert.ok(!JSON.stringify(r).includes('after inventory'));
});
const freshness: Evidence = {
  id: 'freshness',
  label: 'Freshness',
  sql: '',
  durationMs: 0,
  rows: Array.from({ length: 14 }, (_, i) => ({
    day: '2026-10-' + (12 + i),
    pending_rows: i === 12 || i === 13 ? 5 : 0,
  })),
};
const aligned: Evidence = {
  id: 'aligned',
  label: 'Weekdays',
  sql: '',
  durationMs: 0,
  rows: [
    { period: 'previous', revenue: 100 },
    { period: 'current', revenue: 120 },
  ],
};
test('complete weekday scope excludes missing weekends but full-period scope does not', () => {
  assert.equal(pendingInScope([freshness]), 10);
  assert.equal(pendingInScope([freshness], 'matching_weekdays'), 0);
  assert.equal(scopeCanUseWeekdays([freshness, aligned], 'matching_weekdays'), true);
  assert.equal(
    applyCompletenessGate(report, [freshness, aligned], 'matching_weekdays').supported,
    true,
  );
  assert.equal(applyCompletenessGate(report, [freshness, aligned]).supported, false);
});
test('weekday answers render only the matching-period evidence', () => {
  const r = renderVerifiedReport(
    report,
    [freshness, aligned, customer],
    'describe',
    'matching_weekdays',
  );
  assert.deepEqual(r.findings[0].evidenceIds, ['aligned']);
  assert.match(r.summary, /increased from 100 to 120/);
});
test('missing weekday records or missing manifest cannot bypass completeness protection', () => {
  const missing = structuredClone(freshness);
  missing.rows[4].pending_rows = 5;
  assert.equal(scopeCanUseWeekdays([missing, aligned], 'matching_weekdays'), false);
  assert.equal(scopeCanUseWeekdays([aligned], 'matching_weekdays'), false);
  assert.equal(scopeCanUseWeekdays([freshness], 'matching_weekdays'), false);
});
test('completeness replacement discards contradictory earlier caveats', () => {
  const r = applyCompletenessGate({ ...report, uncertainties: ['Reporting is complete.'] }, [
    freshness,
  ]);
  assert.ok(!r.uncertainties.includes('Reporting is complete.'));
  assert.equal(r.supported, false);
});
test('unicode number forms cannot bypass prose validation', () => {
  for (const text of ['³³³,³³³', '１２３', '١٢٣', 'Ⅳ']) {
    const r = groundReport({ ...report, summary: text }, [customer]);
    assert.ok(r.errors.some((e) => e.includes('Numerical')));
  }
});

test('only explicit weekday restrictions authorize narrowing the reporting scope', () => {
  assert.equal(
    explicitlyRequestsWeekdaysOnly(
      'Compare only the fully arrived Monday-through-Friday revenue totals.',
    ),
    true,
  );
  assert.equal(explicitlyRequestsWeekdaysOnly('Show a weekday-only comparison.'), true);
  for (const q of [
    'Compare Alpine Jacket revenue across the current and previous periods.',
    'Is revenue down or reporting incomplete? Check mature dates.',
    'Do not compare only weekdays.',
  ])
    assert.equal(explicitlyRequestsWeekdaysOnly(q), false);
});
test('comparison adds the matching baseline without using model-written trends', () => {
  const r = renderVerifiedReport(
    { ...report, findings: [{ ...report.findings[0], factIds: ['customers:1:orders'] }] },
    [customer],
    'describe',
  );
  assert.equal(r.findings[0].measurements.length, 2);
  assert.match(r.summary, /increased from 71,429 to 95,238/);
});
