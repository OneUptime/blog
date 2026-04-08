# How to Ensure Data Consistency with Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, ACID, Consistency, Data Integrity

Description: Learn how to use MongoDB multi-document transactions to ensure data consistency across multiple collections, with practical patterns for order processing and inventory updates.

---

## When to Use Transactions

MongoDB documents support atomic single-document updates. Transactions are needed when a business operation must update multiple documents atomically - for example, decrementing inventory and creating an order simultaneously. Without a transaction, a crash between the two writes leaves data inconsistent.

## Basic Transaction Pattern

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(uri);
const session = client.startSession();

try {
  const result = await session.withTransaction(async () => {
    const orders = client.db("shop").collection("orders");
    const inventory = client.db("shop").collection("inventory");

    // Check and decrement inventory
    const item = await inventory.findOneAndUpdate(
      { productId: "prod_001", qty: { $gte: 1 } },
      { $inc: { qty: -1 } },
      { session, returnDocument: "after" }
    );

    if (!item) {
      throw new Error("Insufficient inventory");
    }

    // Create the order
    await orders.insertOne({
      productId: "prod_001",
      qty: 1,
      customerId: "cust_123",
      status: "confirmed",
      createdAt: new Date()
    }, { session });

  }, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
  });

} finally {
  await session.endSession();
}
```

## Transaction with Manual Commit/Abort

For cases where you need more control:

```javascript
const session = client.startSession();
await session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5000
});

try {
  await debitAccount(session, fromAccountId, amount);
  await creditAccount(session, toAccountId, amount);
  await recordTransfer(session, fromAccountId, toAccountId, amount);

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  await session.endSession();
}
```

## Handling Transient Errors

MongoDB recommends retrying transactions that fail with transient errors (like election failovers):

```javascript
async function runTransactionWithRetry(txnFn, session) {
  while (true) {
    try {
      await txnFn(session);
      break;
    } catch (err) {
      if (err.hasErrorLabel("TransientTransactionError")) {
        continue; // retry
      }
      throw err;
    }
  }
}

async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction();
      break;
    } catch (err) {
      if (err.hasErrorLabel("UnknownTransactionCommitResult")) {
        continue; // retry commit
      }
      throw err;
    }
  }
}
```

## Transaction Constraints

```text
Max duration:    60 seconds (default), configurable via transactionLifetimeLimitSeconds
Oplog limit:     Each transaction must fit within a 16 MB oplog entry
Collections:     Collections can be created inside transactions (MongoDB 4.4+)
Aggregations:    $out and $merge not allowed inside transactions
```

## Monitoring Transaction Performance

```javascript
const ss = db.adminCommand({ serverStatus: 1 });
print("Transactions started:   ", ss.transactions.totalStarted);
print("Transactions committed: ", ss.transactions.totalCommitted);
print("Transactions aborted:   ", ss.transactions.totalAborted);
print("Transactions active:    ", ss.transactions.currentActive);
```

## Summary

MongoDB multi-document transactions provide ACID guarantees across collections and databases. Use `session.withTransaction()` for automatic retry on `TransientTransactionError` and commit, pass the `session` to every operation in the transaction, and set `writeConcern: { w: "majority" }` to ensure durability. Keep transactions short (under 1 second in practice) to minimize contention and avoid the 60-second timeout limit.
