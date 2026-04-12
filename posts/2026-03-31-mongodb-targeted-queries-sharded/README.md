# How to Perform Targeted Queries on a Sharded Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Query Optimization, Shard Key, Performance

Description: Learn how to write targeted queries that include the shard key in MongoDB to avoid broadcast scatter-gather operations and improve sharded cluster performance.

---

In a sharded MongoDB cluster, query efficiency depends on whether the query includes the shard key. Targeted queries route to one or a small number of shards; broadcast queries fan out to all shards and merge results at `mongos`, increasing latency and load.

## What Makes a Query Targeted

A query is targeted when its filter includes the shard key (or the leading fields of a compound shard key). `mongos` uses the shard key to look up the chunk range and route directly to the shard holding that data.

Suppose `orders` is sharded on `{ customerId: 1 }`:

```javascript
// Targeted - includes shard key
db.orders.find({ customerId: "C123" })

// Broadcast - no shard key
db.orders.find({ status: "shipped" })
```

## Verify Targeting with explain()

Use `explain()` to confirm whether a query is targeted:

```javascript
const result = db.orders.find({ customerId: "C123" }).explain("executionStats")
printjson(result.queryPlanner.winningPlan)
```

Look for `"stage": "SINGLE_SHARD"` (targeted) versus `"stage": "SHARD_MERGE"` (broadcast).

## Compound Shard Keys and Partial Targeting

With a compound shard key like `{ region: 1, customerId: 1 }`, a query on just `region` is partially targeted - it hits all chunks for that region but not all shards:

```javascript
// Partially targeted (hits only shards with region "us-east")
db.orders.find({ region: "us-east" })

// Fully targeted (hits exactly one chunk range)
db.orders.find({ region: "us-east", customerId: "C123" })
```

## Range Queries on the Shard Key

Range queries on the shard key are targeted to the shards that hold chunks within the range:

```javascript
// Targeted range query
db.orders.find({
  customerId: { $gte: "C100", $lte: "C200" }
})
```

This may still hit multiple shards if the range spans chunk boundaries on different shards.

## Update and Delete Targeting

Write operations also benefit from shard key targeting:

```javascript
// Targeted update
db.orders.updateOne(
  { customerId: "C123", orderId: "O456" },
  { $set: { status: "delivered" } }
)

// Broadcast update (no shard key) - touches all shards
db.orders.updateMany(
  { status: "pending" },
  { $set: { flagged: true } }
)
```

Broadcast updates can be expensive. Add `customerId` to the filter where possible.

## Checking Query Routing in Production

Monitor how many queries are targeted vs broadcast using `mongos` server status:

```javascript
db.serverStatus().shardingStatistics.numHostsTargeted
```

The `numHostsTargeted` field breaks down operations by type (`find`, `insert`, `update`, `delete`, `aggregate`). Each type reports `oneShard` (targeted), `manyShards` (partially targeted), `allShards` (broadcast), and `unsharded` counters. Compare `allShards` versus `oneShard` for your `find` and `aggregate` operations to measure the ratio over time.

## Design Your Schema for Targeting

Choose a shard key that matches your most common query patterns. If most queries filter on `userId`, use `{ userId: 1 }` or a compound key starting with `userId` as the shard key. Avoid shard keys that cause hot spots (like monotonically increasing IDs) without hashing.

## Summary

Targeted queries in a sharded MongoDB cluster route directly to the shard(s) holding the relevant data by including the shard key in the query filter. Using `explain()` helps verify targeting, and choosing a shard key aligned with your query patterns is the most impactful way to ensure efficient routing in production.
