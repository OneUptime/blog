# How to Use Read Concern 'local' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Replication, Consistency, Transaction, Query

Description: Learn how to use read concern local in MongoDB to read the most recent data from the current node without waiting for replication acknowledgment.

---

## Introduction

Read concern controls what data a read operation sees with respect to the replication state of the cluster. The `local` read concern returns data from the node being queried regardless of whether that data has been replicated to a majority. It is the default for most operations and offers the lowest latency.

## What "local" Means

With read concern `local`:
- Data that has not yet been replicated to other nodes can be returned
- In the event of a primary failover, reads may include data that is later rolled back
- It is the fastest read concern because no replication coordination is required

## Setting Read Concern in mongosh

```javascript
db.orders.find({ status: "pending" }).readConcern("local")
```

Using `runCommand`:

```javascript
db.runCommand({
  find: "orders",
  filter: { status: "pending" },
  readConcern: { level: "local" }
});
```

## Setting Read Concern in Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();

const db = client.db("mydb");
const orders = db.collection("orders");

const results = await orders
  .find(
    { status: "pending" },
    { readConcern: { level: "local" } }
  )
  .toArray();
```

## When to Use "local"

Use read concern `local` when:
- You need the lowest possible read latency
- Slight staleness is acceptable and rollback risk is tolerable
- You are reading data immediately after writing and the write went to the primary you are reading from
- You are running analytics on a secondary and do not need majority guarantees

## When Not to Use "local"

Avoid `local` when:
- You need to guarantee reads reflect a majority-committed state
- You are building workflows where rollback would cause data inconsistency (use `majority` instead)
- You need cross-shard consistent reads in a sharded cluster (use `majority` or `snapshot`)

## Behavior in Transactions

Inside a multi-document transaction, `local` reads the data that exists at the start of the transaction from the local node:

```javascript
const session = client.startSession();
session.startTransaction({ readConcern: { level: "local" } });
try {
  const doc = await orders.findOne({ _id: orderId }, { session });
  // ... modify doc
  await session.commitTransaction();
} finally {
  session.endSession();
}
```

## Summary

Read concern `local` is the default and fastest option in MongoDB, reading the most recent data available on the queried node. It is appropriate for high-throughput, latency-sensitive workloads where the risk of reading data that may be rolled back is acceptable. For stricter consistency guarantees, consider `majority` or `linearizable` read concerns.
