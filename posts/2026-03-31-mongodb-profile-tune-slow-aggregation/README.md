# How to Profile and Tune Slow Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, Profiling, Query Optimization

Description: Learn how to identify slow MongoDB aggregation pipelines using explain and the database profiler, then apply systematic optimizations to each expensive stage.

---

Slow aggregation pipelines are one of the most common MongoDB performance issues. Unlike simple `find` queries, pipelines have multiple stages and each can independently introduce bottlenecks.

## Step 1 - Get the Execution Plan

Use `explain("executionStats")` on any `aggregate` call to get the full execution plan including memory and disk usage details:

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
])
```

Look for:
- `COLLSCAN` in any stage - missing index
- `SORT` stage with high `memUsage` - in-memory sort
- `$group` with large `usedDisk: true` - spilling to disk

## Step 2 - Use the Database Profiler

Enable slow-query logging (threshold 200ms):

```javascript
db.setProfilingLevel(1, { slowms: 200 })
```

Query recent slow aggregations:

```javascript
db.system.profile.find({
  "command.aggregate": { $exists: true },
  millis: { $gt: 200 }
}).sort({ ts: -1 }).limit(5).pretty()
```

## Step 3 - Apply the $match-Early Rule

Move filter stages as early as possible to reduce the pipeline's working set:

```javascript
// Slow: $group runs on 5 million documents
db.events.aggregate([
  { $group: { _id: "$userId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 10 } } }
])

// Fast: $match first reduces input
db.events.aggregate([
  { $match: { timestamp: { $gte: ISODate("2026-01-01") } } },
  { $group: { _id: "$userId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 10 } } }
])
```

## Step 4 - Project Early to Reduce Document Size

Add `$project` or `$addFields` early to drop fields that are not needed in later stages:

```javascript
db.orders.aggregate([
  { $match: { status: "shipped" } },
  {
    $project: {
      customerId: 1, amount: 1, region: 1   // drop large nested objects
    }
  },
  { $group: { _id: "$region", revenue: { $sum: "$amount" } } }
])
```

## Step 5 - Index the First $match Stage

If `$match` is the first stage, create an index that covers its filter fields:

```javascript
// Pipeline starts with:
// { $match: { status: "shipped", region: "US" } }
db.orders.createIndex({ status: 1, region: 1 })
```

## Step 6 - Limit $lookup Input

Expensive pipelines involving `$lookup` should use the pipeline form with internal filters:

```javascript
{
  $lookup: {
    from: "products",
    let: { pid: "$productId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$pid"] }, active: true } },
      { $project: { name: 1, price: 1 } }
    ],
    as: "product"
  }
}
```

## Step 7 - Cache with $out for Repeated Pipelines

If the same expensive pipeline runs repeatedly, cache the result:

```javascript
db.orders.aggregate([
  // ... expensive pipeline ...
  { $out: "order_stats_cache" }
])
```

Schedule a refresh and query `order_stats_cache` instead.

## Summary

Profile slow MongoDB aggregation pipelines with `explain` and the database profiler. Fix them by moving `$match` early, projecting fields before expensive stages, indexing the first match filter, limiting `$lookup` input, and caching with `$out` for repeated heavy computations.
