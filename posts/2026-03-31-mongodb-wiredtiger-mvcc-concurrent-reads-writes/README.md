# How WiredTiger MVCC Enables Concurrent Reads and Writes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, MVCC, Concurrency, Storage Engine

Description: Learn how WiredTiger's MVCC implementation in MongoDB allows readers and writers to operate concurrently without blocking each other, and what this means for transactions.

---

WiredTiger uses Multi-Version Concurrency Control (MVCC) to allow reads and writes to proceed simultaneously without locks. Understanding MVCC helps you reason about transaction isolation, snapshot reads, and performance under concurrent workloads.

## How MVCC Works

Instead of blocking readers when a write occurs, WiredTiger keeps multiple versions of each document. A reader always sees a consistent snapshot from when its transaction started, regardless of concurrent writes happening at the same time.

```text
Timeline:
  T=0: Document { balance: 100 }
  T=1: Writer starts update to { balance: 200 }
  T=2: Reader starts - sees { balance: 100 } (snapshot from T=2)
  T=3: Writer commits { balance: 200 }
  T=4: Reader sees { balance: 100 } (still using T=2 snapshot)
  T=5: New reader starts - sees { balance: 200 }
```

Readers never block writers. Writers never block readers.

## Snapshot Isolation in Transactions

MongoDB multi-document transactions use MVCC snapshot isolation. Every operation in a transaction reads from the same consistent snapshot:

```javascript
const session = client.startSession();
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});

try {
  const account = await db.collection("accounts")
    .findOne({ _id: "alice" }, { session });

  await db.collection("accounts").updateOne(
    { _id: "alice" },
    { $inc: { balance: -100 } },
    { session }
  );

  await db.collection("accounts").updateOne(
    { _id: "bob" },
    { $inc: { balance: 100 } },
    { session }
  );

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
}
```

All operations in the transaction read from the same consistent snapshot, even if another transaction modified those documents concurrently.

## Write Conflicts

MVCC prevents readers from blocking writers, but two concurrent writers on the same document do conflict. WiredTiger uses optimistic locking - if a conflict is detected, one transaction is aborted with a `WriteConflict` error:

```text
MongoServerError: WriteConflict error: this operation conflicted with another operation.
```

The application must retry:

```javascript
async function transferWithRetry(session, from, to, amount) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      session.startTransaction();
      // ... transfer logic
      await session.commitTransaction();
      return;
    } catch (err) {
      await session.abortTransaction();
      if (err.hasErrorLabel("TransientTransactionError")) continue;
      throw err;
    }
  }
}
```

## Version Pinning and Long-Running Transactions

Long-running transactions pin old document versions in the WiredTiger cache. This prevents the cache from reclaiming space used by older versions, increasing memory pressure.

```javascript
// Check for long-running transactions
db.adminCommand({ currentOp: true, active: true }).inprog
  .filter(op => op.transaction)
  .map(op => ({ opid: op.opid, secs: op.secs_running }));
```

Transactions running longer than a few seconds can cause cache bloat. MongoDB's default transaction timeout is 60 seconds.

## Configuring Max Transaction Lifetime

```javascript
db.adminCommand({
  setParameter: 1,
  transactionLifetimeLimitSeconds: 30
});
```

## Summary

WiredTiger MVCC allows MongoDB to process concurrent reads and writes without mutual blocking by maintaining multiple document versions. Readers see a consistent snapshot from their transaction start time while writers append new versions. Write conflicts are resolved optimistically - the losing transaction receives a `WriteConflict` error and must retry. Long-running transactions pin old versions in cache, so keep transactions short and set a reasonable `transactionLifetimeLimitSeconds`.
