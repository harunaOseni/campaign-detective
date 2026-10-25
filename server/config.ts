import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
export const config = {
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://detective:local_detective_only@127.0.0.1:55436/detective',
  warehouseUrl:
    process.env.WAREHOUSE_URL ||
    'postgres://warehouse_reader:local_reader_only@127.0.0.1:55436/detective',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  deadlineMs: Number(process.env.JOB_DEADLINE_MS || 240000),
  leaseMs: Number(process.env.JOB_LEASE_MS || 30000),
  maxJobs: Number(process.env.MAX_CONCURRENT_JOBS || 3),
  queueLimit: Number(process.env.QUEUE_LIMIT || 100),
  maxCalls: 10,
};
export const context = {
  company: 'Northstar Retail',
  synthetic: true,
  timezone: 'UTC',
  currency: 'USD',
  revenue:
    'Completed orders, net of refunds; excludes tax and shipping. Never use duplicate event revenue as order revenue.',
  previous: '2026-10-12 through 2026-10-18',
  current: '2026-10-19 through 2026-10-25',
  asOf: '2026-10-26',
  rules: [
    'Compare matching weekdays.',
    'Use fully ingested dates for decisions.',
    'Inventory correlation is not causal proof.',
    'Campaign changes require human review.',
    'Do not equate missing records with zero sales.',
  ],
};
export const datasets = ['inventory', 'delay', 'duplicates'] as const;
export type Dataset = (typeof datasets)[number];
