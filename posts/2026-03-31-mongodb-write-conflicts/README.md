# How to Handle Write Conflicts in MongoDB Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Concurrency, Write Conflict, Data Integrity

Description: Learn what causes write conflicts in MongoDB transactions, how to detect and handle WriteConflict errors, and strategies to minimize conflict frequency in high-concurrency applications.

---

## What is a Write Conflict

A write conflict in MongoDB occurs when two concurrent transactions attempt to modify the same document. When a transaction writes to a document, it acquires a lock on that document. If a second transaction tries to modify the same locked document, the second transaction's write operation blocks briefly and then fails with a `WriteConflict` error (error code 112). The lock wait timeout is controlled by `maxTransactionLockRequestTimeoutMillis` (default: 5ms).

```mermaid
sequenceDiagram
    participant TxA as Transaction A
    participant TxB as Transaction B
    participant MongoDB
    TxA->>MongoDB: startTransaction
    TxB->>MongoDB: startTransaction
    TxA->>MongoDB: updateOne({ _id: "doc1" }, { $inc: { stock: -1 } })
    MongoDB-->>TxA: Write succeeds (lock acquired on doc1)
    TxB->>MongoDB: updateOne({ _id: "doc1" }, { $inc: { stock: -1 } })
    MongoDB-->>TxB: WriteConflict error (doc1 locked by TxA)
    Note over TxB: Must retry from the start
    TxA->>MongoDB: commitTransaction
    MongoDB-->>TxA: Committed (stock=4)
```

## When Write Conflicts Happen

Write conflicts occur in two common scenarios:

**Scenario 1 - Concurrent lock contention:**
1. Transaction A writes document X, acquiring a lock on it.
2. Transaction B attempts to write document X while Transaction A holds the lock.
3. Transaction B's write operation fails with a WriteConflict error after a brief wait.

**Scenario 2 - Stale snapshot:**
1. Transaction A starts and takes a snapshot of the data.
2. Transaction B modifies document X and commits.
3. Transaction A attempts to write document X - MongoDB detects that the document changed since A's snapshot and fails with a WriteConflict error.

## Reproducing a Write Conflict

The following example simulates two transactions conflicting on the same document:

```javascript
// Run in two separate mongosh sessions simultaneously

// Session 1
const s1 = db.getMongo().startSession();
s1.startTransaction();
s1.getDatabase("myapp").inventory.updateOne(
  { _id: "product1" },
  { $inc: { stock: -1 } }
);
// Write succeeds - s1 now holds a lock on product1
// Do NOT commit yet

// Session 2 (run while Session 1 has not committed)
const s2 = db.getMongo().startSession();
s2.startTransaction();
s2.getDatabase("myapp").inventory.updateOne(
  { _id: "product1" },
  { $inc: { stock: -1 } }
);
// This write throws WriteConflict - product1 is locked by Session 1

// Back in Session 1
s1.commitTransaction();  // This succeeds
```

## Error Code and Label

A write conflict produces an error like:

```text
MongoServerError: WriteConflict error: this operation conflicted with another operation.
Please retry your operation or multi-document transaction.
Code: 112
ErrorLabel: TransientTransactionError
```

The `TransientTransactionError` label is key: it tells the driver and application that it is safe to retry the entire transaction from scratch.

## Handling Write Conflicts in Node.js

The `withTransaction()` helper automatically retries on `TransientTransactionError`:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://admin:password@127.0.0.1:27017/?authSource=admin&replicaSet=rs0"
);

async function reserveItem(productId, customerId) {
  await client.connect();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const db = client.db("store");

      const item = await db.collection("inventory").findOneAndUpdate(
        { _id: productId, stock: { $gte: 1 } },
        { $inc: { stock: -1 } },
        { returnDocument: "after", session }
      );

      if (!item) {
        throw new Error("Out of stock");
      }

      await db.collection("reservations").insertOne({
        productId,
        customerId,
        reservedAt: new Date()
      }, { session });
    });

    console.log("Reservation successful");
  } finally {
    await session.endSession();
    await client.close();
  }
}
```

`withTransaction()` retries the entire callback automatically when it receives `TransientTransactionError` (which includes `WriteConflict`).

## Manual Retry Pattern

When you need manual transaction control, implement explicit retry logic:

```javascript
const MAX_RETRIES = 3;

async function executeWithRetry(session, txnFunc) {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }
      });

      await txnFunc(session);
      await session.commitTransaction();
      return;  // success
    } catch (error) {
      await session.abortTransaction();
      attempts++;

      if (error.code === 112 || error.hasErrorLabel("TransientTransactionError")) {
        if (attempts < MAX_RETRIES) {
          const delay = Math.pow(2, attempts) * 50;  // exponential backoff
          console.log(`WriteConflict - retry ${attempts} after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      throw error;  // non-retryable error or max retries exceeded
    }
  }

  throw new Error(`Transaction failed after ${MAX_RETRIES} retries`);
}
```

## Handling Write Conflicts in Python

```python
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import time

client = MongoClient(
    "mongodb://admin:password@127.0.0.1:27017/?authSource=admin&replicaSet=rs0"
)

def reserve_item_with_retry(product_id, customer_id, max_retries=3):
    for attempt in range(max_retries):
        with client.start_session() as session:
            try:
                with session.start_transaction():
                    db = client["store"]

                    item = db["inventory"].find_one_and_update(
                        {"_id": product_id, "stock": {"$gte": 1}},
                        {"$inc": {"stock": -1}},
                        return_document=True,
                        session=session
                    )

                    if not item:
                        raise ValueError("Out of stock")

                    db["reservations"].insert_one({
                        "productId": product_id,
                        "customerId": customer_id,
                        "reservedAt": __import__("datetime").datetime.utcnow()
                    }, session=session)

                print("Reservation successful")
                return

            except PyMongoError as e:
                if "WriteConflict" in str(e) or "TransientTransactionError" in str(e):
                    if attempt < max_retries - 1:
                        delay = (2 ** attempt) * 0.05
                        print(f"WriteConflict - retry {attempt + 1} after {delay:.3f}s")
                        time.sleep(delay)
                        continue
                raise

    raise RuntimeError(f"Transaction failed after {max_retries} retries")
```

## Strategies to Reduce Write Conflicts

**1. Narrow the transaction scope**

Only include operations that must be atomic. Fetch data before the transaction if possible:

```javascript
// Bad: read inside transaction when not needed
await session.withTransaction(async () => {
  const config = await db.collection("config").findOne({}, { session });
  const price = config.basePrice * 1.1;
  await db.collection("orders").insertOne({ price }, { session });
});

// Better: read outside transaction if config rarely changes
const config = await db.collection("config").findOne({});
const price = config.basePrice * 1.1;

await session.withTransaction(async () => {
  await db.collection("orders").insertOne({ price }, { session });
});
```

**2. Use field-level updates instead of full document reads**

Use `$inc`, `$push`, `$set` instead of read-modify-write patterns:

```javascript
// Avoids conflict by letting MongoDB handle the increment atomically
await db.collection("counters").updateOne(
  { _id: "orderCount" },
  { $inc: { count: 1 } },
  { session }
);
```

**3. Partition hot documents**

If many transactions conflict on a single high-contention document (like a global counter), split it into multiple documents and aggregate them:

```javascript
// Instead of one counter document, use N sharded counter documents
const shardKey = Math.floor(Math.random() * 10);  // 0-9
await db.collection("counters").updateOne(
  { _id: `orderCount_${shardKey}` },
  { $inc: { count: 1 } },
  { session }
);

// Aggregate total: sum all 10 shards
const total = await db.collection("counters").aggregate([
  { $match: { _id: /^orderCount_/ } },
  { $group: { _id: null, total: { $sum: "$count" } } }
]).toArray();
```

**4. Keep transactions short**

The longer a transaction runs, the higher the chance another transaction modifies the same documents. Minimize external calls and processing inside transactions.

## Monitoring Write Conflicts

Check write conflict frequency:

```javascript
db.serverStatus().globalLock.currentQueue
db.serverStatus().metrics.operation.writeConflicts
```

Or with a query on the profiler:

```javascript
db.system.profile.find({ "errInfo.code": 112 }).count()
```

## Best Practices

- Always use `withTransaction()` or an equivalent retry helper - never let a single `WriteConflict` fail an operation permanently.
- Implement exponential backoff (50ms, 100ms, 200ms) between retries to reduce thundering herd.
- Limit retries to 3-5 attempts; after that, surface the error to the caller.
- Design data models to minimize hotspots - documents written by many concurrent transactions are conflict magnets.
- Keep transaction scope minimal and duration short.

## Summary

Write conflicts in MongoDB transactions occur when two concurrent transactions modify the same document. MongoDB labels these errors `TransientTransactionError`, indicating they should be retried. Use `session.withTransaction()` for automatic retries, or implement manual retry logic with exponential backoff. Reduce conflict frequency by keeping transactions short, using atomic update operators instead of read-modify-write patterns, and partitioning hot documents across multiple records.
