# How to Use Snapshot Sessions for Consistent Reads in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Snapshot, Session, Read Concern, Consistency

Description: Learn how to use snapshot read concern sessions in MongoDB to read a consistent point-in-time view of data across multiple queries without a full transaction.

---

## Overview

MongoDB 5.0 introduced snapshot read concern for sessions outside of multi-document transactions. A snapshot session allows you to execute multiple read operations that all see the same consistent point-in-time view of the data, preventing phantom reads and non-repeatable reads without the overhead of write locks.

## When to Use Snapshot Sessions

Snapshot sessions are ideal for:
- Generating reports that must be internally consistent
- Exporting data where all reads must reflect the same state
- Implementing pagination where the result set should not shift between pages
- Any multi-query read that requires repeatable read semantics

## Creating a Snapshot Session

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

// Start a session with snapshot enabled
const session = client.startSession({ snapshot: true });
```

## Using Snapshot Read Concern on Individual Operations

When a session is started with `snapshot: true`, all read operations on that session automatically use the same point-in-time snapshot:

```javascript
const db = client.db('analytics');

// Both queries see the same point-in-time snapshot
const totalUsers = await db.collection('users').countDocuments(
  {},
  { session }
);

const activeUsers = await db.collection('users').countDocuments(
  { lastActive: { $gte: new Date(Date.now() - 7 * 86400_000) } },
  { session }
);

// These two counts are consistent - no new users can appear between them
const inactiveUsers = totalUsers - activeUsers;
```

## Full Report Generation with Snapshot Consistency

```javascript
async function generateReport() {
  const session = client.startSession({ snapshot: true });

  try {
    const db = client.db('shop');

    // Run sequentially — sessions are not safe for concurrent use
    const orderCount = await db.collection('orders').countDocuments(
      { status: 'completed' },
      { session }
    );

    const revenue = await db.collection('orders').aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ], { session }).toArray();

    const topProducts = await db.collection('orders').aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', count: { $sum: '$items.qty' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ], { session }).toArray();

    return {
      orderCount,
      revenue: revenue[0]?.total ?? 0,
      topProducts,
    };
  } finally {
    await session.endSession();
  }
}
```

## Requirements and Limitations

- Snapshot read concern requires MongoDB 5.0+ and a replica set or sharded cluster.
- It is not available on standalone deployments.
- You cannot perform write operations using snapshot read concern outside of a transaction.
- Each snapshot session holds a consistent view from the first operation; the snapshot is released when the session ends.
- Snapshot sessions that hold open a very old snapshot can cause the WiredTiger storage engine to retain more history, increasing storage pressure.

## Snapshot vs linearizable vs majority Read Concerns

```text
majority    - Reads data acknowledged by majority of replica set members
linearizable - Reads most recent data, but waits for majority acknowledgment (slowest)
snapshot    - Reads a consistent point-in-time view, ideal for multi-read consistency
```

## Summary

Snapshot sessions in MongoDB 5.0+ let you run multiple read queries against a consistent point-in-time view without the overhead of a full transaction. Start the session with `client.startSession({ snapshot: true })` and pass `{ session }` to each read operation to ensure all queries in the session see the same data state. End the session promptly when done to release the snapshot and avoid storage pressure from retained history.
