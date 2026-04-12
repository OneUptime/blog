# What Is a Chunk in MongoDB Sharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Chunk, Performance, Database

Description: A MongoDB chunk is a contiguous range of shard key values stored on a single shard, enabling the balancer to distribute data evenly across a cluster.

---

## What Is a Chunk

In MongoDB's sharded cluster architecture, a **chunk** is a contiguous range of shard key values that resides on a single shard. The cluster divides your collection's shard key space into these ranges and assigns each range to a shard. The balancer then moves chunks between shards to keep data evenly distributed.

By default, a chunk grows to a maximum size of 128 MB. Once it exceeds this threshold, MongoDB splits it into two smaller chunks. This split-and-balance cycle is the core mechanism that allows horizontal scaling.

## How Chunks Are Created

When you first shard a collection, MongoDB creates a single chunk covering the entire shard key range: from `MinKey` to `MaxKey`. As data is inserted and chunks grow past the limit, mongos automatically splits them.

```javascript
// Shard a collection on the "userId" field
sh.shardCollection("mydb.events", { userId: 1 })

// After sharding, inspect the initial chunk distribution
use config
const collUUID = db.collections.findOne({ _id: "mydb.events" }).uuid
db.chunks.find({ uuid: collUUID }).pretty()
```

Example output showing chunk ranges:

```json
{
  "uuid": UUID("ab12cd34-ef56-7890-ab12-cd34ef567890"),
  "shard": "shard01",
  "min": { "userId": { "$minKey": 1 } },
  "max": { "userId": 100000 }
}
```

## Chunk Splits

MongoDB splits chunks automatically when they exceed the configured `chunkSize` (default 128 MB). You can also split manually for pre-splitting purposes before bulk loads.

```javascript
// Manually split a chunk at a specific shard key value
sh.splitAt("mydb.events", { userId: 50000 })

// Or split at the midpoint
sh.splitFind("mydb.events", { userId: 25000 })
```

Pre-splitting is useful when you know the data distribution in advance and want to avoid hotspots during initial ingestion.

## Chunk Migration

The balancer moves chunks from overloaded shards to underloaded ones. A migration involves:

1. The balancer picks a chunk from the shard with the most chunks.
2. The destination shard receives the chunk data via `moveChunk`.
3. The config server updates chunk ownership metadata.
4. The source shard deletes its now-migrated data.

```javascript
// Manually move a chunk to a specific shard
sh.moveChunk(
  "mydb.events",
  { userId: 50000 },
  "shard02"
)
```

Avoid moving chunks during peak traffic - migrations consume I/O and network bandwidth.

## Jumbo Chunks

A jumbo chunk is a chunk that has grown beyond the configured maximum size but cannot be split because all documents share the same shard key value. This is a common problem with low-cardinality shard keys.

```javascript
// Identify jumbo chunks
use config
const collUUID = db.collections.findOne({ _id: "mydb.events" }).uuid
db.chunks.find({ uuid: collUUID, jumbo: true })
```

To resolve jumbo chunks, you need to either:
- Refine the shard key to increase cardinality
- Manually remove the jumbo flag after clearing data (risky)
- Use `sh.splitAt()` if the range contains multiple distinct shard key values

## Monitoring Chunk Distribution

Use the following to monitor how chunks are distributed across shards:

```javascript
// Show shard distribution summary
sh.status()

// Count chunks per shard for a namespace
use config
const collUUID = db.collections.findOne({ _id: "mydb.events" }).uuid
db.chunks.aggregate([
  { $match: { uuid: collUUID } },
  { $group: { _id: "$shard", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

A healthy cluster shows roughly equal chunk counts per shard. Large imbalances indicate a poor shard key choice or balancer lag.

## Configuring Chunk Size

The default 128 MB chunk size works for most workloads. Smaller chunks mean more frequent migrations; larger chunks mean fewer but heavier migrations.

```javascript
// Change chunk size (in megabytes) - takes effect on next split
use config
db.settings.updateOne(
  { _id: "chunksize" },
  { $set: { value: 64 } },
  { upsert: true }
)
```

## Summary

MongoDB chunks are the fundamental unit of data distribution in a sharded cluster. Each chunk represents a shard key range on a single shard. Understanding how chunks split, migrate, and become jumbo is critical to designing a healthy sharded deployment. Choose a high-cardinality shard key to avoid jumbo chunks, monitor distribution regularly with `sh.status()`, and pre-split before bulk imports to prevent hotspots.
