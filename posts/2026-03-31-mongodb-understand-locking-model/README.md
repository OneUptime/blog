# How to Understand MongoDB's Locking Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Concurrency, Performance

Description: Learn how MongoDB intent lock hierarchy works, when locks are held, and how to avoid lock contention in high-concurrency applications.

---

MongoDB uses a multi-granularity locking model to allow concurrent reads and writes at different levels of the data hierarchy. Understanding this model helps you design schemas and operations that minimize contention.

## Lock Hierarchy

MongoDB's lock hierarchy has four levels, from coarsest to finest:

```text
Global
  └── Database
        └── Collection
              └── Document (WiredTiger storage engine)
```

At the Global and Database levels, MongoDB uses intent locks. At the Collection level (and for some operations at Database level), it uses shared or exclusive locks. The WiredTiger storage engine handles document-level concurrency independently.

## Lock Modes

MongoDB uses four lock modes:

```text
R  - Shared (read lock)
W  - Exclusive (write lock)
r  - Intent Shared (signals intent to acquire R lower in hierarchy)
w  - Intent Exclusive (signals intent to acquire W lower in hierarchy)
```

A read operation acquires `r` (intent shared) at the global and database levels, and `R` (shared) at the collection level. This allows concurrent readers while blocking incompatible exclusive locks.

## WiredTiger and Document-Level Concurrency

With the WiredTiger storage engine (the default since MongoDB 3.2), individual document writes are handled with optimistic concurrency control - not explicit locks held for the duration of the write. WiredTiger uses MVCC (Multi-Version Concurrency Control):

```text
- Writers do not block readers
- Readers do not block writers
- Concurrent writers on different documents proceed simultaneously
```

Conflict happens only when two operations try to modify the same document simultaneously - WiredTiger retries internally.

## When Global Write Locks Occur

Some administrative operations take a global write lock (`W`), blocking all other operations:

```javascript
// These operations take a global lock
db.adminCommand({ fsync: 1, lock: true });
db.copyDatabase("source", "target");  // (removed in MongoDB 4.2, shown for illustration)
```

Most routine CRUD operations and index builds on MongoDB 4.2+ do not take global locks.

## Checking Lock Statistics

Use `serverStatus` to see current lock usage:

```javascript
db.adminCommand({ serverStatus: 1 }).locks
```

Look at the `acquireCount` and `acquireWaitCount` fields. High `acquireWaitCount` at the database or collection level indicates lock contention.

The `currentOp` command shows running operations and their lock state:

```javascript
db.adminCommand({
  currentOp: true,
  waitingForLock: true
});
```

Any operation with `waitingForLock: true` is blocked waiting for another operation to release a lock.

## Reducing Lock Contention

Keep write operations short - large multi-document updates that hold collection-level locks block concurrent operations:

```javascript
// Avoid: single update that touches 1 million documents
db.logs.updateMany({}, { $set: { processed: true } });

// Better: batch updates with small sleeps
for (let i = 0; i < 1000; i++) {
  db.logs.updateMany(
    { processed: { $exists: false } },
    { $set: { processed: true } },
    // Use limit via findAndModify or explicit _id ranges
  );
}
```

## Index Builds and Locking

Before MongoDB 4.2, foreground index builds held a collection write lock for the entire duration (background builds were less restrictive but slower). Since 4.2, index builds use a hybrid approach - they only hold a brief exclusive lock at the start and end:

```javascript
// Safe to run on production with MongoDB 4.2+
db.orders.createIndex({ customerId: 1, placedAt: -1 });
```

## Summary

MongoDB's locking model uses intent locks at the global and database levels, allowing fine-grained concurrency. WiredTiger's MVCC handles document-level concurrency without explicit document locks for most operations. Monitor lock contention with `serverStatus` and `currentOp`. Keep write operations short and scoped to avoid prolonged collection-level locks that block concurrent readers and writers.
