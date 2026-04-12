# How to Handle Scatter-Gather Queries in Sharded MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Query Optimization, Performance, Scatter-Gather

Description: Learn what scatter-gather queries are in sharded MongoDB, when they are unavoidable, and how to minimize their performance impact in production clusters.

---

A scatter-gather (broadcast) query in MongoDB is one that does not include the shard key. `mongos` must send the query to every shard, collect results, merge them, and return the final set to the client. This increases latency and CPU usage proportional to the number of shards.

## Identify Scatter-Gather Queries

Use `explain()` to detect broadcast queries:

```javascript
const plan = db.orders.find({ status: "pending" }).explain("executionStats")
printjson(plan.queryPlanner.winningPlan)
// Look for "stage": "SHARD_MERGE" - this is a scatter-gather
```

You can also monitor `mongos` statistics:

```javascript
db.serverStatus().shardingStatistics
// Check numHostsTargeted to see how operations are distributed across shards
```

## When Scatter-Gather is Unavoidable

Some queries genuinely need data from all shards:

- Aggregations computing global totals (e.g., `$sum` across all customers)
- Reports without the shard key in the filter
- Full collection scans for migrations or exports

In these cases, accept the broadcast pattern but optimize how you run it.

## Reducing Scatter-Gather Impact

**Add secondary indexes on non-shard-key fields**

Each shard executes the query against its local index, reducing per-shard scan time:

```javascript
db.orders.createIndex({ status: 1, createdAt: -1 })
```

**Use `allowPartialResults` for fault tolerance**

If a shard is temporarily unavailable, this option returns partial results instead of failing:

```javascript
db.orders.find({ status: "pending" })
  .allowPartialResults()
  .toArray()
```

**Limit and sort strategically**

For paginated scatter-gather queries, push sorting and limiting as early as possible:

```javascript
db.orders.find({ status: "pending" })
  .sort({ createdAt: -1 })
  .limit(100)
```

`mongos` asks each shard for 100 results, then merges and re-sorts to produce the final 100. Indexes on `{ status: 1, createdAt: -1 }` make each shard's sort efficient.

## Aggregation Pipeline and Scatter-Gather

`$match` stages that include the shard key limit the pipeline to specific shards. Move `$match` as early as possible:

```javascript
// Targeted aggregation (shard key in $match)
db.orders.aggregate([
  { $match: { customerId: "C123" } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Scatter-gather aggregation (no shard key)
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } }
])
```

## Caching Results for Repeated Broadcasts

For dashboard queries that run frequently and return aggregated results, cache the output in a separate collection and refresh it on a schedule:

```javascript
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } },
  { $out: "order_summary_cache" }
])
```

Applications read from `order_summary_cache` instead of running the scatter-gather repeatedly.

## Choosing Better Shard Keys

The best long-term fix for excessive scatter-gather is a shard key that aligns with your query patterns. If most queries filter on `status`, consider a compound shard key like `{ status: 1, customerId: 1 }` - though be careful about cardinality and hotspots.

## Summary

Scatter-gather queries are broadcast to all shards in MongoDB when the query filter does not include the shard key. They are unavoidable for some workloads but can be made more efficient with proper indexes on each shard, strategic aggregation pipeline ordering, result caching, and careful shard key design. Use `explain()` and `serverStatus()` to monitor and minimize their frequency.
