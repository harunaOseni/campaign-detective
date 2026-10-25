import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, warehouse } from '../server/db.js';
import { investigate, Prose } from '../server/agents.js';
const ids: string[] = [];
test.after(async () => {
  if (ids.length) {
    await db.query('DELETE FROM events WHERE job_id=ANY($1::uuid[])', [ids]);
    await db.query('DELETE FROM investigations WHERE id=ANY($1::uuid[])', [ids]);
  }
  await db.end();
  await warehouse.end();
});
const finding = (factId = 'revenue:0:revenue') => ({
  title: 'Observed values',
  explanation: 'These are recorded observations.',
  factIds: [factId],
  uncertainties: [],
});
const report = (supported: boolean, recheck: string[] = []) => ({
  headline: 'Evidence comparison',
  summary: 'The observed values are available.',
  findings: [finding()],
  recommendations: [],
  uncertainties: [],
  supported,
  recheck,
});
async function job() {
  const id = randomUUID();
  ids.push(id);
  return (
    await db.query(
      `INSERT INTO investigations(id,request_key,question,dataset,status,fence,lease_until) VALUES($1,$2,'Compare inventory and revenue','inventory','running',1,now()+interval '5 minutes') RETURNING *`,
      [id, id],
    )
  ).rows[0];
}
test('scope review collects a required missing check before completing', async () => {
  const j = await job();
  let reviews = 0;
  await investigate(j, new AbortController().signal, (async (
    _j: any,
    name: string,
    _instructions: any,
    _schema: any,
    input: any,
  ) => {
    if (name === 'Planner')
      return {
        summary: 'Compare observations',
        goal: 'describe',
        deliverable: 'Inventory and revenue comparison',
        checks: ['revenue'],
      };
    if (name.endsWith('specialist')) return finding();
    if (name === 'Verifier') return report(false);
    if (name === 'Answer scope reviewer') {
      reviews++;
      if (!input.evidence.some((e: any) => e.id === 'inventory'))
        return report(false, ['inventory']);
      return { ...report(true), findings: [finding(), finding('inventory:0:minimum_stock')] };
    }
    throw Error('Unexpected step ' + name);
  }) as any);
  const row = (await db.query('SELECT status,result FROM investigations WHERE id=$1', [j.id]))
    .rows[0];
  assert.equal(reviews, 2);
  assert.equal(row.status, 'completed');
  assert.equal(row.result.partialReason, null);
  assert.ok(row.result.evidence.some((e: any) => e.id === 'inventory'));
  assert.ok(row.result.findings.some((f: any) => f.evidenceIds.includes('inventory')));
});
test('unavailable goal cannot be marked completed by a confident model', async () => {
  const j = await job();
  await investigate(j, new AbortController().signal, (async (_j: any, name: string) => {
    if (name === 'Planner')
      return {
        summary: 'Unavailable forecast',
        goal: 'unsupported',
        deliverable: 'Future revenue',
        checks: ['revenue'],
      };
    if (name.endsWith('specialist')) return finding();
    return {
      ...report(true),
      findings: [{ ...finding(), explanation: 'Revenue will rise next month.' }],
    };
  }) as any);
  const row = (await db.query('SELECT status,result FROM investigations WHERE id=$1', [j.id]))
    .rows[0];
  assert.equal(row.status, 'incomplete');
  assert.match(row.result.partialReason, /outside the available data/);
  assert.ok(!row.result.findings[0].explanation.includes('will rise'));
  assert.match(row.result.findings[0].explanation, /recorded observations, not a forecast/);
});
test('generation schema disallows numerical prose while allowing observational language', () => {
  assert.equal(Prose.safeParse('Revenue was 999').success, false);
  assert.equal(Prose.safeParse('See revenue:0:revenue').success, false);
  assert.equal(Prose.safeParse('Revenue fell; cause is not established.').success, true);
});
for (const mode of ['valid', 'invalid', 'missing'])
  test(
    'coverage assessment ' + mode + ' preserves evidence and completion boundaries',
    async () => {
      const j = await job();
      j.question = 'Compare reported revenue across periods';
      await investigate(j, new AbortController().signal, (async (_j: any, name: string) => {
        if (name === 'Planner')
          return {
            summary: 'Compare revenue',
            goal: 'describe',
            deliverable: 'Recorded period revenue',
            checks: ['revenue'],
          };
        if (name.endsWith('specialist')) return finding();
        if (name === 'Evidence coverage assessor')
          return {
            answerable: mode !== 'missing',
            factIds: mode === 'invalid' ? ['fake'] : ['revenue:0:revenue', 'revenue:1:revenue'],
            missingRequirement: mode === 'missing' ? 'Requested period is unavailable' : '',
          };
        return report(false);
      }) as any);
      const row = (await db.query('SELECT status,result FROM investigations WHERE id=$1', [j.id]))
        .rows[0];
      assert.equal(row.status, mode === 'valid' ? 'completed' : 'incomplete');
      if (mode === 'valid') {
        assert.equal(row.result.findings[0].measurements.length, 2);
        assert.ok(row.result.uncertainties.some((s: string) => s.includes('reporting periods')));
      }
    },
  );
