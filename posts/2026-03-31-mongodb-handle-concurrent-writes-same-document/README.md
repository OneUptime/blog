# How to Handle Concurrent Writes to the Same Document in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Concurrency, Write, WiredTiger, Locking

Description: Understand how MongoDB handles concurrent writes to the same document and learn patterns to manage contention in high-throughput applications.

---

## How MongoDB Serializes Concurrent Writes

MongoDB uses WiredTiger as its default storage engine, which provides document-level concurrency control for write operations and uses MVCC (Multi-Version Concurrency Control) so that readers do not block writers. When two writes target the same document simultaneously, WiredTiger serializes them - the second writer waits for the first to commit or retries automatically.

If both writers are in a transaction, a `WriteConflict` error is raised on the second transaction, which must retry. Outside transactions, WiredTiger transparently retries write conflicts at the storage engine level, making them invisible to your application.

## Retryable Writes

Retryable writes let the driver automatically retry single-statement write operations. Since MongoDB 4.2-compatible drivers, retryable writes are enabled by default:

```javascript
const client = new MongoClient("mongodb://localhost:27017/?retryWrites=true");
```

With retryable writes, operations like `insertOne`, `updateOne`, and `deleteOne` are automatically retried once on network errors or primary failovers without changes to your application code. Note that retryable writes handle failover and network issues, not WiredTiger-level write conflicts on the same document - those are handled transparently by the storage engine.

## Using Atomic Operators to Reduce Contention

Non-atomic read-modify-write cycles amplify contention. Replacing them with server-side atomic operators reduces the window of conflict:

```javascript
// Instead of reading then writing, use atomic $inc
await Counter.updateOne(
  { _id: "session-count" },
  { $inc: { active: 1 } }
);
```

Because the increment is applied server-side, two concurrent `updateOne` calls never overwrite each other - they both succeed sequentially.

## Handling WriteConflict in Transactions

Inside multi-document transactions, MongoDB raises a `WriteConflict` error (code 112) when two transactions try to write the same document simultaneously. You must catch and retry:

```javascript
async function runWithRetry(session, fn) {
  while (true) {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      if (err.hasErrorLabel("TransientTransactionError")) {
        continue; // retry on write conflict
      }
      throw err;
    }
  }
}
```

The `TransientTransactionError` label is set on `WriteConflict` errors and on other retriable failures, making this pattern safe to use broadly.

## Optimistic Locking with a Version Field

For application-level conflict detection, embed a version counter in each document:

```javascript
const schema = new mongoose.Schema({
  data: Object,
  __v: { type: Number, default: 0 }
});

async function updateWithCAS(id, expectedVersion, changes) {
  const updated = await MyModel.findOneAndUpdate(
    { _id: id, __v: expectedVersion },
    { $set: changes, $inc: { __v: 1 } },
    { new: true }
  );
  if (!updated) throw new Error("Conflict: stale version");
  return updated;
}
```

Mongoose uses `__v` for its own versioning of array subdocuments, but you can use a separate `version` field to avoid interference.

## Reducing Hot Document Contention

When many concurrent writes target the same document - a global counter or a leaderboard entry - consider these strategies:

```javascript
// 1. Use sharded counters: write to one of N counter shards, sum on read
const shardId = Math.floor(Math.random() * 10);
await Counter.updateOne(
  { _id: `pageviews-${shardId}` },
  { $inc: { count: 1 } },
  { upsert: true }
);

// 2. Sum all shards when reading
const shards = await Counter.find({ _id: /^pageviews-/ });
const total = shards.reduce((sum, s) => sum + s.count, 0);
```

Sharded counters distribute write load across multiple documents, eliminating the single hot document bottleneck.

## Summary

MongoDB handles concurrent writes to the same document through WiredTiger's document-level locking, which serializes conflicting writes automatically. Enable retryable writes for transparent handling of transient failures. Use atomic operators to minimize contention, the `TransientTransactionError` retry loop inside transactions, and sharded counters for extremely hot documents. These patterns let your application scale write throughput without sacrificing consistency.
