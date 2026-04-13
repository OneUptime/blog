# How to Implement Distributed Counters in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Counter, Concurrency, Sharding, Performance

Description: Learn how to implement high-throughput distributed counters in MongoDB using $inc, sharded counter shards, and aggregation to avoid write contention hotspots.

---

## The Problem with Naive Counters

A single-document counter using `$inc` is atomic but creates a write hotspot. All writers contend for the same document, and on a sharded cluster the shard holding that document becomes a bottleneck. At high write rates (thousands of increments per second), this causes severe write contention.

```javascript
// Simple but creates a hotspot at scale
await db.collection("counters").updateOne(
  { _id: "page_views" },
  { $inc: { value: 1 } },
  { upsert: true }
);
```

This works well up to a few hundred writes per second per document. For higher throughput, use a sharded counter pattern.

## Sharded Counter Pattern

Split the counter across N "shards" (separate documents), and increment a randomly chosen shard on each write. Read the total by summing all shards.

```javascript
const NUM_SHARDS = 16;

async function increment(collection, counterId) {
  const shardIndex = Math.floor(Math.random() * NUM_SHARDS);
  await collection.updateOne(
    { _id: `${counterId}_${shardIndex}` },
    { $inc: { value: 1 } },
    { upsert: true }
  );
}

async function getCount(collection, counterId) {
  const result = await collection.aggregate([
    { $match: { _id: { $regex: `^${counterId}_` } } },
    { $group: { _id: null, total: { $sum: "$value" } } }
  ]).toArray();
  return result[0]?.total ?? 0;
}
```

With 16 shards, write contention is reduced 16-fold. Choose `NUM_SHARDS` based on your expected write rate and acceptable read overhead.

## Pre-creating Counter Shards

Initialize all shard documents upfront to avoid upsert overhead on first write:

```javascript
async function initCounter(collection, counterId, numShards = 16) {
  const ops = [];
  for (let i = 0; i < numShards; i++) {
    ops.push({
      updateOne: {
        filter: { _id: `${counterId}_${i}` },
        update: { $setOnInsert: { value: 0 } },
        upsert: true
      }
    });
  }
  await collection.bulkWrite(ops, { ordered: false });
}
```

## Approximate Counters with Sampling

For analytics use cases where exact counts are not required on every read, maintain a periodic rollup:

```javascript
// Background job: roll up shard values into a summary document every minute
async function rollupCounter(collection, counterId) {
  const total = await getCount(collection, counterId);
  await db.collection("counter_rollups").updateOne(
    { _id: counterId },
    { $set: { value: total, updatedAt: new Date() } },
    { upsert: true }
  );
}

// Fast read: use the rollup
async function getApproximateCount(counterId) {
  const doc = await db.collection("counter_rollups").findOne({ _id: counterId });
  return doc?.value ?? 0;
}
```

Serve most reads from the rollup, and refresh it every 30-60 seconds in a background task.

## Atomic Sequence IDs

For auto-incrementing sequence numbers (unique IDs), use `findOneAndUpdate` with `$inc` and `returnDocument: "after"`:

```javascript
async function nextSequence(collection, sequenceName) {
  const result = await collection.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.seq;
}

// Usage
const orderId = await nextSequence(db.collection("sequences"), "orders");
```

This returns the newly incremented value atomically.

## Indexing Considerations

Ensure counter shard documents are on an indexed field for efficient regex-based aggregation:

```javascript
db.counters.createIndex({ _id: 1 });  // _id is indexed by default

// If using a named field instead of _id:
db.counters.createIndex({ counterId: 1 });
```

## Summary

Distributed counters in MongoDB require distributing write load to avoid single-document hotspots. The sharded counter pattern splits writes across N shard documents and uses aggregation to sum them for reads. For very high read rates, a background rollup job feeds a summary document for fast approximate reads. Atomic sequence IDs are straightforward with `findOneAndUpdate` and `$inc`. Choose the approach based on your required throughput and read/write ratio.
