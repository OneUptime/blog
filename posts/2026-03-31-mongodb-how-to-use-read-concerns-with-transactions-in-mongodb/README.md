# How to Use Read Concerns with Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Read Concern, Consistency, Replica Set

Description: Learn how MongoDB read concerns work inside multi-document transactions and when to use snapshot versus local read concerns for data consistency.

---

## What Are Read Concerns in Transactions

Read concerns control what data a transaction sees when it reads documents. Inside a transaction, the read concern determines whether you see the latest committed data, majority-acknowledged data, or a consistent snapshot from transaction start time.

## Available Read Concerns for Transactions

MongoDB supports three read concerns inside transactions: `local`, `majority`, and `snapshot`.

- `local` - reads the latest data on the current node; may include data that rolls back after a failover
- `majority` - reads data acknowledged by a majority of replica set members
- `snapshot` - reads a consistent view of data as of the transaction start timestamp (provides snapshot isolation for consistent reads within a transaction)

## Setting Read Concern on a Transaction

```javascript
const session = client.startSession();
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});
```

For most financial or inventory transactions where causally consistent reads matter, use `snapshot`.

## Snapshot Read Concern Behavior

With `snapshot`, all reads inside the transaction see data as of the same point-in-time snapshot, even if another transaction commits changes between your reads.

```javascript
const session = client.startSession();
try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
  });

  const db = client.db("shop");

  // Both reads see the same consistent snapshot
  const product = await db.collection("products").findOne(
    { _id: productId },
    { session }
  );

  const inventory = await db.collection("inventory").findOne(
    { productId: productId },
    { session }
  );

  // Check stock based on consistent view
  if (inventory.stock < order.quantity) {
    throw new Error("Insufficient stock");
  }

  await db.collection("orders").insertOne({ ...order }, { session });
  await db.collection("inventory").updateOne(
    { productId },
    { $inc: { stock: -order.quantity } },
    { session }
  );

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  await session.endSession();
}
```

## Local Read Concern Inside Transactions

`local` read concern inside a transaction reads the most recent data but without snapshot isolation. It can cause read skew if another transaction commits between two reads in the same transaction.

```javascript
session.startTransaction({
  readConcern: { level: "local" },
  writeConcern: { w: 1 }
});
```

Use `local` only when you need lowest latency and can tolerate potential read skew.

## Causally Consistent Sessions

For workflows spanning multiple transactions that need causal ordering, enable causally consistent sessions:

```javascript
const session = client.startSession({ causalConsistency: true });
```

This ensures reads in a later transaction always see writes from earlier transactions in the same session.

## Summary

MongoDB transactions do not default to `snapshot` read concern; the default is inherited from the session or client level, which is typically `local`. When you explicitly set `snapshot` read concern, it provides consistent point-in-time reads across all operations in the transaction and prevents read skew. Use `majority` when you need externally acknowledged data without full snapshot isolation, and use causally consistent sessions when chaining multiple transactions that depend on each other's results.
