import type { Evidence, Check } from './queries.js';
export type Fact = {
  id: string;
  text: string;
  evidenceId: Check;
  rowIndex: number;
  field: string;
  value: number;
};
export function buildFacts(evidence: Evidence[]): Fact[] {
  return evidence.flatMap((e) =>
    e.error
      ? []
      : e.rows.flatMap((row, rowIndex) =>
          Object.entries(row)
            .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
            .map(([field, value]) => ({
              id: `${e.id}:${rowIndex}:${field}`,
              text: `${e.label} — ${[row.campaign, row.segment, row.period, row.day].filter(Boolean).join(' · ') || 'All records'}: ${field.replaceAll('_', ' ')} = ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}.`,
              evidenceId: e.id,
              rowIndex,
              field,
              value: Number(value),
            })),
        ),
  );
}
// Quantities written as words must not bypass numerical fact binding.
export const numericalProsePattern =
  /\p{N}|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|percent)\b/iu;
// Prose cannot supply numeric literals. Selected, validated facts supply all displayed numbers.
export function groundReport(report: any, evidence: Evidence[]) {
  const facts = buildFacts(evidence),
    map = new Map(facts.map((f) => [f.id, f]));
  const errors: string[] = [];
  if (!report.findings.length)
    errors.push('A useful answer needs at least one evidence-backed finding.');
  const prose = [
    report.headline,
    report.summary,
    ...report.recommendations,
    ...report.uncertainties,
    ...report.findings.flatMap((f: any) => [f.title, f.explanation, ...f.uncertainties]),
  ];
  if (
    prose.some((s) =>
      /(?:due to|caused by|because of) (?:the )?(?:significant |complete |reported )?(?:stock[ -]?outs?|inventory shortages?)/i.test(
        s,
      ),
    )
  )
    errors.push('Inventory association cannot establish a causal explanation.');
  if (prose.some((s) => numericalProsePattern.test(s)))
    errors.push('Numerical prose must come from verified facts.');
  for (const f of report.findings) {
    if (!f.factIds?.length) errors.push('A finding needs at least one verified fact.');
    if (f.factIds?.some((id: string) => !map.has(id))) errors.push('Unknown fact reference.');
  }
  if (errors.length) return { report, errors: [...new Set(errors)] };
  return {
    errors: [],
    report: {
      ...report,
      findings: report.findings.map((f: any) => {
        const selected: Fact[] = [...new Set<string>(f.factIds)].map((id) => map.get(id)!);
        return {
          ...f,
          explanation: f.explanation + ' ' + selected.map((x) => x.text).join(' '),
          evidenceIds: [...new Set(selected.map((x) => x.evidenceId))],
          measurements: selected.map(({ evidenceId, rowIndex, field, value }) => ({
            evidenceId,
            rowIndex,
            field,
            value,
          })),
        };
      }),
    },
  };
}

// Keep valid selected evidence when the only defect is model-written quantities.
// Drop the whole affected prose field rather than editing a number into a new claim.
export function omitNumericalProse(report: any) {
  const clean = (text: string, fallback: string) =>
    numericalProsePattern.test(text) ? fallback : text;
  return {
    ...report,
    headline: clean(report.headline, 'Recorded observations'),
    summary: clean(
      report.summary,
      'The verified measurements are shown below. Generated numerical wording was omitted.',
    ),
    findings: report.findings.map((f: any) => ({
      ...f,
      title: clean(f.title, 'Verified measurements'),
      explanation: clean(f.explanation, 'The selected query measurements are recorded below.'),
      uncertainties: f.uncertainties.filter((s: string) => !numericalProsePattern.test(s)),
    })),
    recommendations: report.recommendations.filter((s: string) => !numericalProsePattern.test(s)),
    uncertainties: [
      ...report.uncertainties.filter((s: string) => !numericalProsePattern.test(s)),
      'Generated numerical wording was omitted; displayed measurements come directly from query results.',
    ],
  };
}
