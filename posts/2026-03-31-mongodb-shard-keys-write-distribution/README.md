# How to Choose Shard Keys for Write Distribution in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Write, Distribution

Description: Learn how to select MongoDB shard keys that distribute write operations evenly across all shards to prevent hotspots and maximize write throughput.

---

## Overview

Poor shard key selection concentrates writes on a single shard while others sit idle - a write hotspot. For high-write-throughput systems, choosing a shard key that spreads writes evenly across all shards is just as important as query performance. This guide covers strategies to achieve even write distribution.

## The Problem: Monotonically Increasing Keys

The most common write hotspot cause is using a monotonically increasing key as the shard key:

```javascript
// BAD: ObjectId or timestamp as shard key
sh.shardCollection('events.raw', { _id: 1 });
// OR
sh.shardCollection('events.raw', { createdAt: 1 });
```

Because chunks are ordered, all new inserts land in the last chunk on the highest-value shard. Other shards receive no new writes.

## Solution 1: Hashed Shard Key

A hashed shard key computes a hash of the field value and uses that to determine chunk placement. This distributes inserts randomly and evenly:

```javascript
// GOOD: Hashed shard key on _id
sh.shardCollection('events.raw', { _id: 'hashed' });

// GOOD: Hashed on userId for user-generated content
sh.shardCollection('events.raw', { userId: 'hashed' });
```

Hashed sharding guarantees even write distribution but sacrifices range-based query efficiency.

## Solution 2: Compound Key with a High-Cardinality Prefix

Combine a high-cardinality, evenly distributed field with a range field:

```javascript
sh.shardCollection('events.raw', { region: 1, _id: 'hashed' });
```

Writes are distributed by `region` first, then hashed within each region. This gives per-region write distribution while also enabling range queries scoped to a region.

## Solution 3: Adding a Bucket Field

If your natural key is monotonically increasing, add a computed "bucket" field to distribute writes:

```javascript
// In your application, assign a random bucket 0-9
const bucketCount = 10;
const bucket = Math.floor(Math.random() * bucketCount);

await db.collection('raw').insertOne({
  _id: new ObjectId(),
  userId,
  event: 'page_view',
  bucket,  // <- shard key component
  createdAt: new Date(),
});

sh.shardCollection('events.raw', { bucket: 1, _id: 1 });
```

Queries must fan out across buckets, but writes are evenly distributed.

## Verifying Write Distribution

After sharding, check how data is distributed across chunks:

```javascript
// Check chunk distribution
db.adminCommand({ listShards: 1 })

// Check per-shard document counts
db.raw.getShardDistribution()
```

Look at the `data` and `docs` values per shard. A healthy cluster shows roughly equal values. A hotspot shows one shard with significantly more data.

## Monitoring Write Operations Per Shard

Use `mongostat` to observe live write rates per shard:

```bash
mongostat --host mongos:27017 --discover
```

Watch the `insert`, `update`, and `delete` columns per shard. Uneven values indicate hotspots.

## Choosing Between Even Distribution and Query Isolation

These two goals are often in tension:

| Goal                | Best approach                   |
|---------------------|---------------------------------|
| Even write distribution | Hashed shard key              |
| Query isolation (targeted reads) | Natural entity key (tenantId, userId) |
| Both                | Compound key (entity + hashed suffix) |

For pure write-heavy workloads (like time-series event ingestion), optimize for write distribution using hashed sharding. For read-heavy, multi-tenant applications, optimize for query isolation with entity-based keys.

## Summary

Even write distribution in MongoDB sharded clusters requires shard keys with high randomness relative to write patterns. Avoid monotonically increasing keys as the sole shard key component. Use hashed sharding for pure write throughput, compound keys with a hashed component for mixed workloads, or add a computed bucket field when your natural key is monotonically increasing. Monitor `getShardDistribution()` and `mongostat` regularly to detect write hotspots early.
