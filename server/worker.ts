import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { claim, heartbeat } from './store.js';
import { investigate } from './agents.js';
const owner = 'worker-' + randomUUID();
let stopping = false;
process.on('SIGTERM', () => {
  stopping = true;
});
process.on('SIGINT', () => {
  stopping = true;
});
console.log('Investigation worker ready');
async function work() {
  while (!stopping) {
    try {
      const job = await claim(owner);
      if (!job) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const controller = new AbortController();
      const remaining = config.deadlineMs - (Date.now() - new Date(job.started_at).getTime());
      const timeout = setTimeout(() => controller.abort(), Math.max(1, remaining));
      const pulse = setInterval(
        () => heartbeat(job).catch(() => controller.abort()),
        Math.max(1000, config.leaseMs / 3),
      );
      try {
        await investigate(job, controller.signal);
      } finally {
        clearTimeout(timeout);
        clearInterval(pulse);
      }
    } catch {
      console.error('Worker could not acquire or process a job; retrying.');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
await Promise.all(
  Array.from({ length: Number(process.env.WORKER_CONCURRENCY || 1) }, () => work()),
);
process.exit(0);
