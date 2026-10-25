import express from 'express';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { createJob, getJob } from './store.js';
import { context, config, datasets } from './config.js';
import { queries, queryEvidence, type Check } from './queries.js';
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):(5176|4317)$/.test(origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true, instance: process.env.PORT, model: config.model });
});
app.get('/api/investigations', async (_req, res) => {
  res.json(
    (
      await db.query(
        'SELECT id,question,dataset,status,stage,created_at,saved FROM investigations ORDER BY created_at DESC LIMIT 100',
      )
    ).rows,
  );
});
app.post('/api/investigations', async (req, res) => {
  const question = String(req.body.question || '').trim(),
    dataset = req.body.dataset,
    key = req.header('Idempotency-Key') || randomUUID();
  if (
    question.length < 4 ||
    question.length > 2000 ||
    !datasets.includes(dataset) ||
    key.length > 100
  ) {
    res
      .status(400)
      .json({ error: 'Provide a question of 4–2,000 characters and a valid dataset.' });
    return;
  }
  const job = await createJob(question, dataset, key);
  res.status(202).json({ id: job.id, status: job.status });
});
app.get('/api/investigations/:id', async (req, res) => {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid investigation' });
    return;
  }
  const job = await getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Investigation not found' });
    return;
  }
  const { request_key, owner, ...publicJob } = job;
  res.json(publicJob);
});
app.post('/api/investigations/:id/cancel', async (req, res) => {
  await db.query(
    `UPDATE investigations SET status='cancelled',stage='Cancelled',finished_at=now(),lease_until=null,fence=fence+1 WHERE id=$1 AND status IN('queued','running')`,
    [req.params.id],
  );
  res.json({ ok: true });
});
app.post('/api/investigations/:id/preferences', async (req, res) => {
  await db.query(
    `UPDATE investigations SET saved=coalesce($2,saved),feedback=coalesce($3,feedback) WHERE id=$1`,
    [
      req.params.id,
      typeof req.body.saved === 'boolean' ? req.body.saved : null,
      ['up', 'down'].includes(req.body.feedback) ? req.body.feedback : null,
    ],
  );
  res.json({ ok: true });
});
app.get('/api/context', async (_req, res) => {
  const tables = await db.query(
    `SELECT dataset,count(*)::int rows,min(day)::text first_day,max(day)::text last_day FROM warehouse.orders GROUP BY dataset ORDER BY dataset`,
  );
  res.json({
    context,
    datasets: tables.rows,
    catalog: Object.entries(queries).map(([id, q]) => ({ id, label: q.label })),
    engine: 'PostgreSQL 16 analytical schema',
    totalRows: tables.rows.reduce((n, r) => n + r.rows, 0),
    model: config.model,
    limits: {
      concurrentJobs: config.maxJobs,
      modelCalls: config.maxCalls,
      deadlineSeconds: config.deadlineMs / 1000,
    },
    scope: 'Synthetic data only. Single company. Local development deployment.',
  });
});
app.get('/api/metrics', async (_req, res) => {
  const r = await db.query(
    `SELECT count(*)::int total,count(*) FILTER(WHERE status='completed')::int completed,count(*) FILTER(WHERE status='incomplete')::int incomplete,count(*) FILTER(WHERE status='running')::int running,count(*) FILTER(WHERE status='queued')::int queued,coalesce(sum(model_calls),0)::int model_calls,coalesce(sum(input_tokens),0)::float8 input_tokens,coalesce(sum(output_tokens),0)::float8 output_tokens,percentile_cont(.95) WITHIN GROUP(ORDER BY extract(epoch FROM(finished_at-created_at))) FILTER(WHERE finished_at IS NOT NULL) p95_seconds,avg(extract(epoch FROM(started_at-created_at))) wait_seconds FROM investigations`,
  );
  res.json({
    ...r.rows[0],
    benchmarks: (await db.query('SELECT at,result FROM benchmarks ORDER BY id DESC LIMIT 10')).rows,
    costNote:
      'Token usage is measured. Dollar cost is not estimated without configured provider pricing.',
  });
});
app.post('/api/benchmarks', async (_req, res) => {
  const c = await db.connect();
  const lock = await c.query('SELECT pg_try_advisory_lock(274366) locked');
  if (!lock.rows[0].locked) {
    c.release();
    res.status(409).json({ error: 'A benchmark is already running.' });
    return;
  }
  try {
    const start = performance.now(),
      times: number[] = [];
    let errors = 0;
    await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        for (let n = 0; n < 3; n++) {
          const t = performance.now();
          try {
            await queryEvidence(Object.keys(queries)[(i + n) % 6] as Check, datasets[i % 3]);
          } catch {
            errors++;
          }
          times.push(performance.now() - t);
        }
      }),
    );
    times.sort((a, b) => a - b);
    const result = {
      kind: 'Warehouse query load test',
      scope:
        '30 real analytical queries, 10 concurrent clients, 4 database connections. No model calls; not end-to-end agent capacity.',
      queries: 30,
      concurrentClients: 10,
      p95Ms: times[Math.ceil(times.length * 0.95) - 1],
      elapsedMs: performance.now() - start,
      errors,
    };
    await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
    res.json(result);
  } finally {
    await c.query('SELECT pg_advisory_unlock(274366)');
    c.release();
  }
});
app.use((error: any, _req: any, res: any, _next: any) => {
  if (error.message === 'Queue capacity reached') {
    res.status(429).json({ error: 'The local queue is full. Try again shortly.' });
    return;
  }
  console.error('API request failed:', error.code || error.name);
  res
    .status(500)
    .json({ error: 'The request could not be completed. Check local service status and retry.' });
});
app.listen(Number(process.env.PORT || 4318), '127.0.0.1', () =>
  console.log('API instance ready on ' + (process.env.PORT || 4318)),
);
