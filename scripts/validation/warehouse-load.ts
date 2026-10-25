import { performance } from 'node:perf_hooks';
import { writeFile, mkdir } from 'node:fs/promises';
import { db, warehouse } from '../../server/db.js';
import { queryEvidence, queries, type Check } from '../../server/queries.js';
const levels = [10, 25, 50, 100],
  runs: any[] = [];
const checks = Object.keys(queries) as Check[];
try {
  for (const clients of levels) {
    for (let repeat = 1; repeat <= 3; repeat++) {
      const start = performance.now(),
        times: number[] = [];
      let errors = 0,
        successful = 0;
      await Promise.all(
        Array.from({ length: clients }, async (_, i) => {
          for (let n = 0; n < 3; n++) {
            const t = performance.now();
            try {
              await queryEvidence(
                checks[(i * 3 + n) % checks.length],
                (['inventory', 'delay', 'duplicates'] as const)[i % 3],
              );
              successful++;
            } catch {
              errors++;
            }
            times.push(performance.now() - t);
          }
        }),
      );
      times.sort((a, b) => a - b);
      const elapsedMs = performance.now() - start;
      const r = {
        clients,
        repeat,
        queries: clients * 3,
        successful,
        errors,
        elapsedMs,
        p50Ms: times[Math.ceil(times.length * 0.5) - 1],
        p95Ms: times[Math.ceil(times.length * 0.95) - 1],
        throughput: successful / (elapsedMs / 1000),
      };
      runs.push(r);
      console.log(JSON.stringify(r));
    }
  }
  const result = {
    kind: 'Repeated warehouse concurrency sweep',
    scope:
      '10, 25, 50 and 100 concurrent clients; three queries per client, three runs per level. Real warehouse queries over one million total synthetic rows, using a fixed four-connection pool. Latency includes pool wait. No model calls; warm-cache local results, not end-to-end agent capacity.',
    runs,
    errors: runs.reduce((n, r) => n + r.errors, 0),
    at: new Date().toISOString(),
  };
  await db.query('INSERT INTO benchmarks(result) VALUES($1)', [result]);
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/warehouse-concurrency.json', JSON.stringify(result, null, 2));
} finally {
  await db.end();
  await warehouse.end();
}
