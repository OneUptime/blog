# How to Tune Read Concern and Write Concern for Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Write Concern, Performance, Consistency, Replication

Description: Learn how to configure MongoDB read concern and write concern levels to balance data consistency guarantees with write throughput and read performance.

---

## Overview

MongoDB's read concern and write concern settings control the consistency guarantees for read and write operations. Stricter guarantees improve data safety but reduce performance. Tuning these settings to match your application's actual requirements can significantly improve throughput and latency.

## Write Concern

Write concern specifies how many replica set members must acknowledge a write before it is considered successful.

```javascript
// Primary-only acknowledgment (default is w:"majority" since MongoDB 5.0)
db.orders.insertOne(
  { customerId: "c1", amount: 100 },
  { writeConcern: { w: 1 } }
);

// Majority write concern: wait for majority of replica set members
db.orders.insertOne(
  { customerId: "c1", amount: 100 },
  { writeConcern: { w: "majority" } }
);

// Unacknowledged: fire and forget (dangerous, use only for non-critical data)
db.metrics.insertOne(
  { event: "page_view", ts: new Date() },
  { writeConcern: { w: 0 } }
);
```

### Write Concern with Journal

Add `j: true` to ensure the write is persisted to the journal before acknowledging:

```javascript
// Wait for journal flush before acknowledging
db.financialTransactions.insertOne(
  { txnId: "t123", amount: 500 },
  { writeConcern: { w: "majority", j: true } }
);
```

### Write Concern with Timeout

Prevent indefinite waiting with `wtimeout`:

```javascript
db.orders.insertOne(
  { amount: 50 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }  // timeout in ms
);
```

## Read Concern

Read concern controls which version of data a read operation returns.

| Level | Description | Use Case |
|---|---|---|
| `local` | Returns data from the local member (may be rolled back) | Lowest latency, non-critical reads |
| `available` | Like local, but for sharded clusters may return orphaned docs | High availability over consistency |
| `majority` | Returns data acknowledged by majority of replica set | Financial and audit data |
| `linearizable` | Guarantees reading the most recent majority-committed data | Strongest consistency |
| `snapshot` | Reads a consistent snapshot (for multi-document transactions) | Transactions |

```javascript
// Fast read - may not reflect latest majority-committed write
db.products.find({ sku: "ABC123" }).readConcern("local");

// Safe read - only returns majority-committed data
db.accounts.find({ userId: "u1" }).readConcern("majority");
```

## Setting Defaults at the Client Level

Configure defaults when creating the client to apply to all operations:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  readConcernLevel: "majority",
  w: "majority",
  journal: true
});
```

## Performance Trade-offs

```text
Write Throughput:
  w:0 (fire-forget) > w:1 (primary ack) > w:"majority" > w:"majority" + j:true

Read Latency:
  local < available < majority < linearizable
```

For high-throughput metrics or event tracking, use `w: 1, j: false`:

```javascript
const metricsClient = new MongoClient(uri, {
  w: 1,
  journal: false
});
```

For financial or inventory writes that must survive primary failure, use:

```javascript
const safeClient = new MongoClient(uri, {
  w: "majority",
  journal: true,
  wtimeoutMS: 10000
});
```

## Tuning for Specific Workloads

### High-throughput analytics ingestion

```javascript
await db.collection("events").insertMany(eventBatch, {
  writeConcern: { w: 1, j: false }
});
```

### E-commerce order placement

```javascript
await db.collection("orders").insertOne(order, {
  writeConcern: { w: "majority", j: true, wtimeout: 5000 }
});
```

### Session data reads

```javascript
const session = await db.collection("sessions").findOne(
  { token },
  { readConcern: { level: "local" } }
);
```

## Using Transactions with Appropriate Concerns

For multi-document transactions, use `snapshot` read concern:

```javascript
const session = client.startSession();
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});
```

## Summary

Read concern and write concern are powerful levers for balancing data safety and performance in MongoDB. Use `w: 1, j: false` for analytics and metrics where occasional data loss is acceptable, and `w: "majority", j: true` for critical business data. Similarly, use `local` read concern for low-latency reads on non-critical data, and `majority` for reads that must reflect committed state. Always set `wtimeout` to avoid indefinite blocking under replication lag.
