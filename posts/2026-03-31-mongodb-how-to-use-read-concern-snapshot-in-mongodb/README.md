# How to Use Read Concern 'snapshot' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Transaction, Snapshot, Consistency, Replication

Description: Learn how to use read concern snapshot in MongoDB transactions to get a consistent view of data across multiple operations.

---

## Introduction

Read concern `snapshot` provides a consistent view of data at a single point in time across multiple read operations within a transaction. It was originally available only inside multi-document transactions (MongoDB 4.0+), though starting in MongoDB 5.0 it can also be used outside transactions for `find`, `aggregate`, and `distinct` operations. Within a transaction, it ensures that all reads see the same majority-committed snapshot, eliminating non-repeatable reads and phantoms.

## How "snapshot" Works

When a transaction starts with read concern `snapshot`, MongoDB pins all reads to the same majority-committed snapshot timestamp. This means:
- Reads within the transaction are consistent with each other
- External writes that occurred after the transaction started are not visible
- The data you see will not change between read operations in the same transaction

## Availability

In MongoDB 4.0 through 4.4, read concern `snapshot` is only supported inside transactions. Starting in MongoDB 5.0, it is also available outside transactions for `find`, `aggregate`, and `distinct` operations on both replica sets and sharded clusters.

## Using snapshot in a Transaction

```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();

const session = client.startSession();

try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
  });

  const db = client.db("mydb");

  // Both reads see the same snapshot
  const user = await db.collection("users").findOne(
    { _id: userId },
    { session }
  );

  const orders = await db.collection("orders").find(
    { userId },
    { session }
  ).toArray();

  // Compute total from consistent snapshot
  const total = orders.reduce((sum, o) => sum + o.amount, 0);

  await db.collection("summaries").updateOne(
    { userId },
    { $set: { orderTotal: total, updatedAt: new Date() } },
    { session, upsert: true }
  );

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## Snapshot vs. Majority in Transactions

| Concern | Scope | Consistent across ops | Outside transaction |
|---------|-------|----------------------|---------------------|
| majority | Per-operation | No | Yes |
| snapshot | Transaction-wide | Yes | No |

Use `snapshot` when you need consistency across multiple reads in a single transaction. Use `majority` for single reads outside transactions.

## Limitations

- Available in transactions starting with MongoDB 4.0. Available outside transactions for certain read operations starting with MongoDB 5.0.
- Transactions have a maximum duration (default 60 seconds) and size limit
- Long-running transactions hold a snapshot which can increase storage pressure

## Summary

Read concern `snapshot` guarantees a consistent view of data across all operations within a transaction. It eliminates non-repeatable reads by pinning every read to the same majority-committed point in time. Use it for complex multi-document operations where consistent data across reads is critical, such as financial calculations or report generation.
