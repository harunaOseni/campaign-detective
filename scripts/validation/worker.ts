// Isolated infrastructure test worker: real queue, checkpoints and warehouse;
// fixed delay stands in for model latency. Never presented as an AI benchmark.
import { claim, checkpoint, finish, heartbeat } from '../../server/store.js';
import { queryEvidence } from '../../server/queries.js';
import { db, warehouse } from '../../server/db.js';
let idle = 0;
while (idle < 20) {
  const j = await claim('validation-' + process.pid);
  if (!j) {
    idle++;
    await new Promise((r) => setTimeout(r, 100));
    continue;
  }
  idle = 0;
  const pulse = setInterval(() => heartbeat(j).catch(() => {}), 200);
  try {
    if (!j.checkpoint.evidence) {
      const evidence = await queryEvidence('inventory', 'inventory');
      await checkpoint(j, 'Evidence saved', 'Infrastructure validation', { evidence });
    }
    if (process.env.CRASH_TARGET === '1') {
      process.send?.({ ready: true, id: j.id, fence: j.fence });
      await new Promise(() => {});
    }
    await new Promise((r) => setTimeout(r, 400));
    await finish(j, 'completed', { resumed: j.attempts > 1, evidence: j.checkpoint.evidence });
  } finally {
    clearInterval(pulse);
  }
}
await db.end();
await warehouse.end();
