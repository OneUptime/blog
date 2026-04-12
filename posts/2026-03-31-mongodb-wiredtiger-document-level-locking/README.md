# How to Use MongoDB's WiredTiger Document-Level Locking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Locking, Concurrency, Performance

Description: Learn how WiredTiger document-level locking works in MongoDB, how it enables high concurrency, and how to diagnose lock contention issues.

---

## Overview

WiredTiger, MongoDB's default storage engine since version 3.2, uses document-level locking instead of collection-level or database-level locks. This means multiple operations can modify different documents in the same collection simultaneously, dramatically improving write throughput.

## How Document-Level Locking Works

WiredTiger uses an MVCC (Multi-Version Concurrency Control) model. Each write operation acquires an intent lock at the database and collection level, and an exclusive lock only on the specific document being modified. Reads use snapshot isolation and do not block writes.

The lock hierarchy is:
1. Global (read/write intent)
2. Database (read/write intent)
3. Collection (read/write intent)
4. Document (optimistic concurrency control for writes; reads use snapshots and do not acquire document-level locks)

## Checking Current Lock Status

Use `db.serverStatus()` to view current lock metrics.

```javascript
db.serverStatus().locks
```

Look at `Collection.acquireCount` and `Collection.deadlockCount` for contention indicators.

## Monitoring with currentOp

Find operations waiting for locks.

```javascript
db.currentOp({ waitingForLock: true });
```

This shows operations blocked waiting to acquire a lock, their namespace, and how long they have been waiting.

## Operations That Acquire Exclusive Locks

Some operations still acquire exclusive locks at the database or collection level and will block other operations:

- `db.createCollection()` acquires a database-level exclusive lock
- `collMod` (collection modification) acquires a database-level exclusive lock
- Foreground index builds before MongoDB 4.2 acquired a collection-level exclusive lock

Check for these in `currentOp` output.

```javascript
db.currentOp({
  "command.createIndexes": { $exists: true }
});
```

## Diagnosing Lock Contention

High `timeAcquiringMicros` in server status signals contention.

```javascript
const status = db.serverStatus();
const globalLock = status.globalLock;

printjson({
  currentQueueTotal: globalLock.currentQueue.total,
  activeReaders: globalLock.activeClients.readers,
  activeWriters: globalLock.activeClients.writers
});
```

A growing queue means operations are waiting for locks.

## Reducing Lock Contention

- Break large bulk writes into smaller batches.
- Avoid long-running transactions that hold locks for extended periods.
- Use `ordered: false` for bulk inserts to allow parallel execution.

```javascript
db.orders.bulkWrite(
  operations,
  { ordered: false }
);
```

## Multi-Document Transactions and Locking

Multi-document transactions use pessimistic locking. They acquire document-level locks at the start of each write and hold them until commit or abort. Long transactions increase contention.

```javascript
const session = client.startSession();
session.startTransaction();
// Locks acquired here are held until commitTransaction or abortTransaction
session.commitTransaction();
```

## Summary

WiredTiger's document-level locking gives MongoDB high write concurrency by isolating locks to individual documents. Monitor lock contention with `db.serverStatus().locks` and `db.currentOp()`, avoid operations requiring global locks in production, and keep transactions short to minimize lock duration.
