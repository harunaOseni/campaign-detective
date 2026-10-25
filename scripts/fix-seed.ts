import { db } from '../server/db.js';
await db.query(
  `UPDATE warehouse.orders d SET order_id=o.id,day=o.day,campaign=o.campaign,segment=o.segment,net_revenue=o.net_revenue,reported_at=o.reported_at FROM warehouse.orders o WHERE d.dataset='duplicates' AND d.id%8=0 AND o.id=d.id-3`,
);
await db.query(`UPDATE warehouse.metadata SET value='2' WHERE key='seed_version'`);
console.log('Duplicate scenario aligned with original order events.');
await db.end();
