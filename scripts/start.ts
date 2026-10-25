import { spawn } from 'node:child_process';
const children: any[] = [];
for (const port of [4318, 4319, 4320])
  children.push(
    spawn(process.execPath, ['--import', 'tsx', 'server/api.ts'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    }),
  );
children.push(
  spawn(process.execPath, ['--import', 'tsx', 'server/gateway.ts'], { stdio: 'inherit' }),
);
for (let i = 0; i < Number(process.env.WORKER_PROCESSES || 3); i++)
  children.push(
    spawn(process.execPath, ['--import', 'tsx', 'server/worker.ts'], { stdio: 'inherit' }),
  );
const stop = () => {
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(), 1500);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
