import { buildFacts, type Fact } from './facts.js';
import type { Evidence } from './queries.js';
export type ReportingScope = 'full_period' | 'matching_weekdays';
export function explicitlyRequestsWeekdaysOnly(question: string) {
  return (
    /\b(?:only|exclusively)\s+(?:the\s+)?(?:fully arrived\s+)?(?:matching\s+)?(?:monday[ -]+through[ -]+friday|weekdays?)\b|\bweekday[ -]only\b/i.test(
      question,
    ) && !/(?:do not|don't|not)\s+(?:compare\s+)?(?:only|exclusively)\b/i.test(question)
  );
}
export function pendingInScope(evidence: Evidence[], scope: ReportingScope = 'full_period') {
  const freshness = evidence.find((e) => e.id === 'freshness' && !e.error);
  return (
    freshness?.rows
      .filter(
        (r) =>
          scope !== 'matching_weekdays' ||
          (Number.isFinite(Date.parse(r.day)) &&
            ![0, 6].includes(new Date(r.day + 'T00:00:00Z').getUTCDay())),
      )
      .reduce((sum, r) => sum + Number(r.pending_rows || 0), 0) || 0
  );
}
export function scopeCanUseWeekdays(evidence: Evidence[], scope: ReportingScope) {
  // A missing manifest is not proof that the scoped data is complete.
  return (
    scope === 'matching_weekdays' &&
    evidence.some((e) => e.id === 'freshness' && !e.error && e.rows.length >= 14) &&
    evidence.some(
      (e) =>
        e.id === 'aligned' &&
        !e.error &&
        e.rows.some((r) => r.period === 'current') &&
        e.rows.some((r) => r.period === 'previous'),
    ) &&
    pendingInScope(evidence, scope) === 0
  );
}
const format = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
export function trendSentences(selected: Fact[], evidence: Evidence[]): string[] {
  const groups = new Map<
    string,
    { label: string; field: string; previous?: number; current?: number }
  >();
  for (const fact of selected) {
    const row = evidence.find((e) => e.id === fact.evidenceId)?.rows[fact.rowIndex];
    if (!row || !['previous', 'current'].includes(row.period)) continue;
    const entity = [row.campaign, row.segment].filter(Boolean).join(' · ') || 'All records';
    const key = JSON.stringify([fact.evidenceId, entity, fact.field]);
    const group = groups.get(key) || { label: entity, field: fact.field.replaceAll('_', ' ') };
    if (row.period === 'current') group.current = fact.value;
    else group.previous = fact.value;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.previous !== undefined && g.current !== undefined)
    .map((g) =>
      g.current === g.previous
        ? `${g.label}: ${g.field} stayed at ${format(g.current!)} across the recorded periods.`
        : `${g.label}: ${g.field} ${g.current! > g.previous! ? 'increased' : 'decreased'} from ${format(g.previous!)} to ${format(g.current!)}.`,
    );
}
// The model selects evidence. Code owns all published factual prose and comparisons.
// A valid citation alone does not validate a model-written sentence.
export function renderVerifiedReport(
  report: any,
  evidence: Evidence[],
  goal: string,
  scope: ReportingScope = 'full_period',
) {
  if (!report.findings?.length) return report;
  const catalog = buildFacts(evidence),
    map = new Map(catalog.map((f) => [f.id, f]));
  const sourceFindings =
    scope === 'matching_weekdays'
      ? [{ factIds: catalog.filter((f) => f.evidenceId === 'aligned').map((f) => f.id) }]
      : report.findings;
  const findings = sourceFindings
    .map((finding: any) => {
      const requested = [...new Set<string>(finding.factIds || [])]
        .map((id) => map.get(id))
        .filter((f): f is Fact => !!f);
      // Include the matching period for a selected metric, so a comparison cannot omit its baseline.
      const paired = requested.flatMap((f) => {
        const source = evidence.find((e) => e.id === f.evidenceId)!;
        const row = source.rows[f.rowIndex];
        if (!['previous', 'current'].includes(row.period)) return [f];
        return catalog.filter((other) => {
          const candidate = source.rows[other.rowIndex];
          return (
            other.evidenceId === f.evidenceId &&
            other.field === f.field &&
            candidate &&
            candidate.campaign === row.campaign &&
            candidate.segment === row.segment &&
            ['previous', 'current'].includes(candidate.period)
          );
        });
      });
      const selected = [...new Map(paired.map((f) => [f.id, f])).values()];
      // Completeness-gate findings are produced later; model findings must have valid facts.
      if (!selected.length) return null;
      return {
        title: [
          ...new Set(selected.map((f) => evidence.find((e) => e.id === f.evidenceId)!.label)),
        ].join(' / '),
        explanation: [...trendSentences(selected, evidence), ...selected.map((f) => f.text)].join(
          ' ',
        ),
        factIds: selected.map((f) => f.id),
        evidenceIds: [...new Set(selected.map((f) => f.evidenceId))],
        measurements: selected.map(({ evidenceId, rowIndex, field, value }) => ({
          evidenceId,
          rowIndex,
          field,
          value,
        })),
        uncertainties: [],
      };
    })
    .filter(Boolean);
  const allSelected = [...new Set<string>(findings.flatMap((f: any) => f.factIds))].map((id) =>
    map.get(id)!,
  );
  const trends = trendSentences(allSelected, evidence);
  const causal = goal === 'explain_cause';
  return {
    ...report,
    rendering: 'verified_measurements',
    supported: causal ? false : report.supported,
    headline: causal ? 'Observed evidence; cause not established' : 'Recorded findings',
    summary: causal
      ? 'The recorded measurements below describe observations. They do not establish a cause or demonstrate an experiment.'
      : !report.supported
        ? 'The available measurements below do not establish the full requested answer.'
        : trends.slice(0, 3).join(' ') || 'The requested recorded measurements are shown below.',
    findings,
    recommendations: causal
      ? [
          'Use an appropriately designed experiment or additional causal evidence before attributing the outcome to an intervention.',
        ]
      : [],
    uncertainties: [
      ...(causal
        ? ['Observational measurements cannot establish the requested causal explanation.']
        : []),
      ...(scope === 'matching_weekdays'
        ? ['This comparison covers matching Monday-through-Friday periods only.']
        : []),
      'Findings are limited to the selected records and reporting periods.',
    ],
  };
}
