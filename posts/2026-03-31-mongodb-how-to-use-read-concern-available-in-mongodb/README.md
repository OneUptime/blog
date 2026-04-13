# How to Use Read Concern 'available' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Sharding, Performance, Consistency, Query

Description: Learn how to use read concern available in MongoDB for the lowest-latency reads in sharded clusters, accepting potential orphan document exposure.

---

## Introduction

Read concern `available` is the lowest-latency read concern in MongoDB. It returns data from the queried shard without waiting for any replication or ownership verification. It is similar to `local` for replica sets but has specific implications in sharded clusters where chunk migrations can expose orphaned documents.

## How "available" Differs from "local"

In a replica set, `available` and `local` behave identically - both return the most recent data from the queried node regardless of replication state.

In a sharded cluster, the difference matters:
- `local` performs ownership checks to avoid returning orphaned documents from ongoing chunk migrations
- `available` skips these checks entirely for maximum throughput, potentially returning orphaned documents

## Setting Read Concern in mongosh

```javascript
db.events.find({ type: "click" }).readConcern("available");
```

## Setting Read Concern in Node.js

```javascript
const { MongoClient, ReadConcern } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();

const collection = client.db("analytics").collection("events");
const events = await collection
  .find({ type: "click", timestamp: { $gte: new Date(Date.now() - 3600000) } })
  .withReadConcern(new ReadConcern("available"))
  .toArray();
```

## When to Use "available"

Use `available` when:
- You need maximum read throughput in a sharded cluster
- Occasional duplicate or orphaned documents are acceptable (e.g., analytics, logging)
- You are running approximate aggregations where perfect accuracy is not required

```javascript
// High-throughput event count - occasional duplicates are acceptable
const count = await db.collection("pageviews").countDocuments(
  { date: "2026-03-31" },
  { readConcern: { level: "available" } }
);
```

## When Not to Use "available"

Avoid `available` when:
- Data accuracy is critical (use `majority` instead)
- You are in a sharded cluster and need clean ownership semantics
- You are reading financial or transactional data

## Behavior During Chunk Migrations

During a chunk migration in a sharded cluster:
- `local` uses cached chunk metadata on each shard member to filter out orphaned documents, adding some latency
- `available` skips these metadata checks entirely and may return orphaned documents from the source shard

This makes `available` suitable for append-only event streams and metrics but not for inventory or account management.

## Summary

Read concern `available` provides maximum read performance by bypassing ownership verification in sharded clusters. It is the right choice for analytics workloads and high-throughput event streams where approximate results are acceptable. For any use case requiring data accuracy, prefer `local` or `majority` instead.
