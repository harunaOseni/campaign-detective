import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { db } from '../../server/db.js';
import { config } from '../../server/config.js';
const schema = 'validation_' + Date.now();
const children: ChildProcess[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const percentile = (a: number[], p: number) =>
  a.sort((x, y) => x - y)[Math.max(0, Math.ceil(a.length * p) - 1)];
const results: any[] = [];
const spawnWorker = (cap: number, crash = false) => {
  const url = new URL(config.databaseUrl);
  url.searchParams.set('options', '-c search_path=' + schema);
  const c = spawn(process.execPath, ['--import', 'tsx', 'scripts/validation/worker.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      MAX_CONCURRENT_JOBS: String(cap),
      JOB_LEASE_MS: '1500',
      CRASH_TARGET: crash ? '1' : '0',
    },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  children.push(c);
  return c;
};
try {
  await db.query(`CREATE SCHEMA ${schema}`);
  const ddl = (await readFile('server/schema.sql', 'utf8'))
    .split('CREATE TABLE IF NOT EXISTS warehouse.orders')[0]
    .replace('CREATE SCHEMA IF NOT EXISTS warehouse;', '');
  const c = await db.connect();
  try {
    await c.query(`SET search_path TO ${schema}`);
    await c.query(ddl);
  } finally {
    await c.query('RESET search_path');
    c.release();
  }
  for (const cap of [1, 3]) {
    const ids = Array.from({ length: 12 }, () => randomUUID());
    for (const id of ids)
      await db.query(
        `INSERT INTO ${schema}.investigations(id,request_key,question,dataset) VALUES($1,$2,'Infrastructure workload','inventory')`,
        [id, id],
      );
    const start = performance.now();
    const workers = Array.from({ length: cap }, () => spawnWorker(cap));
    let peak = 0,
      terminal = 0;
    while (terminal < 12) {
      if (performance.now() - start > 60000) throw Error('Queue test timed out');
      const rows = (
        await db.query(
          `SELECT status,count(*)::int n FROM ${schema}.investigations WHERE id=ANY($1::uuid[]) GROUP BY status`,
          [ids],
        )
      ).rows;
      peak = Math.max(peak, rows.find((r) => r.status === 'running')?.n || 0);
      terminal = rows.find((r) => r.status === 'completed')?.n || 0;
      await sleep(50);
    }
    const elapsedMs = performance.now() - start;
    workers.forEach((w) => w.kill('SIGTERM'));
    const rows = (
      await db.query(
        `SELECT extract(epoch FROM(started_at-created_at))*1000 wait_ms,attempts FROM ${schema}.investigations WHERE id=ANY($1::uuid[])`,
        [ids],
      )
    ).rows;
    assert.ok(peak <= cap);
    assert.ok(rows.every((r) => r.attempts === 1));
    results.push({
      workers: cap,
      jobs: 12,
      completed: terminal,
      peakRunning: peak,
      elapsedMs,
      throughputPerSecond: 12 / (elapsedMs / 1000),
      p95WaitMs: percentile(
        rows.map((r) => Number(r.wait_ms)),
        0.95,
      ),
    });
  }
  const id = randomUUID();
  await db.query(
    `INSERT INTO ${schema}.investigations(id,request_key,question,dataset) VALUES($1,$2,'Crash recovery','inventory')`,
    [id, id],
  );
  const victim = spawnWorker(1, true);
  const ready: any = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Error('Crash checkpoint timeout')), 15000);
    victim.once('message', (m) => {
      clearTimeout(t);
      resolve(m);
    });
  });
  victim.kill('SIGKILL');
  await new Promise((r) => victim.once('exit', r));
  const replacement = spawnWorker(1);
  const start = performance.now();
  let row: any;
  do {
    await sleep(100);
    row = (await db.query(`SELECT * FROM ${schema}.investigations WHERE id=$1`, [id])).rows[0];
    if (performance.now() - start > 15000) throw Error('Recovery timeout');
  } while (row.status !== 'completed');
  replacement.kill('SIGTERM');
  assert.equal(row.attempts, 2);
  assert.equal(row.result.resumed, true);
  assert.equal(row.result.evidence.id, 'inventory');
  const stale = await db.query(
    `UPDATE ${schema}.investigations SET result='{}' WHERE id=$1 AND fence=$2 AND status='running' AND lease_until>now()`,
    [id, ready.fence],
  );
  assert.equal(stale.rowCount, 0);
  const result = {
    kind: 'Queue scaling and process crash recovery',
    scope:
      'Isolated queue, real Postgres and warehouse queries, fixed 400 ms simulated model latency. Not full AI throughput.',
    results,
    speedup: results[0].elapsedMs / results[1].elapsedMs,
    recovery: {
      passed: true,
      attempts: row.attempts,
      savedEvidenceResumed: true,
      staleWriteRejected: true,
      recoveryMs: performance.now() - start,
    },
    errors: 0,
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/infrastructure-validation.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  for (const c of children) c.kill('SIGKILL');
  await sleep(200);
  await db.query(`DROP SCHEMA ${schema} CASCADE`);
  await db.end();
}
