# How to Reduce Memory Usage in MongoDB Aggregation Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Memory, Performance, Pipeline

Description: Learn practical techniques to reduce memory consumption in MongoDB aggregation pipelines, including allowDiskUse, early filtering, and stage ordering.

---

## Why Aggregation Pipelines Consume Excessive Memory

MongoDB aggregation pipelines process data stage by stage, accumulating intermediate results in memory. By default, each stage is limited to 100 MB of RAM. When pipelines operate on large collections without proper optimization, they can exhaust this limit, cause query failures, or degrade overall server performance.

Understanding how to reduce memory usage is essential for production workloads.

## Filter Documents Early with $match

The single most impactful optimization is placing `$match` stages as early as possible. When `$match` appears first, MongoDB can use indexes and discard non-matching documents before they enter subsequent stages.

```javascript
// Bad: $match comes after $project, forcing all documents through projection
db.orders.aggregate([
  { $project: { customer: 1, total: 1, items: 1, status: 1 } },
  { $match: { status: "completed", total: { $gt: 100 } } }
]);

// Good: $match first, only matching documents continue
db.orders.aggregate([
  { $match: { status: "completed", total: { $gt: 100 } } },
  { $project: { customer: 1, total: 1, items: 1 } }
]);
```

## Trim Fields with $project Early

Use `$project` to drop unused fields as soon as possible. Carrying unnecessary fields through every stage wastes memory proportional to how many documents pass through.

```javascript
db.events.aggregate([
  { $match: { type: "purchase" } },
  // Drop metadata fields not needed for downstream stages
  { $project: { userId: 1, amount: 1, timestamp: 1 } },
  { $group: { _id: "$userId", totalSpent: { $sum: "$amount" } } }
]);
```

## Enable allowDiskUse for Large Datasets

When intermediate results exceed the 100 MB limit, enable `allowDiskUse` to spill to disk. This trades speed for the ability to process large datasets without running out of memory.

```javascript
db.transactions.aggregate(
  [
    { $match: { year: 2025 } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } }
  ],
  { allowDiskUse: true }
);
```

Use `allowDiskUse` as a safety net, not a default. Always optimize the pipeline first.

## Avoid Accumulating Large Arrays with $group

`$group` stages that use `$push` to accumulate arrays can balloon memory usage when groups are large.

```javascript
// Memory-heavy: pushes all item details into arrays
{ $group: { _id: "$orderId", items: { $push: "$item" } } }

// Better: use $sum or $count when full array is not needed
{ $group: { _id: "$orderId", itemCount: { $sum: 1 }, totalValue: { $sum: "$price" } } }
```

## Limit Results Early with $limit

If you only need the top N results, place `$limit` before expensive stages like `$lookup` or `$unwind` where possible.

```javascript
db.products.aggregate([
  { $match: { inStock: true } },
  { $sort: { popularity: -1 } },
  { $limit: 20 },          // Limit before $lookup
  { $lookup: {
      from: "reviews",
      localField: "_id",
      foreignField: "productId",
      as: "reviews"
  }}
]);
```

## Monitor Pipeline Memory Usage

Use `explain("executionStats")` to see how many documents pass through each stage and identify memory bottlenecks.

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$customerId", count: { $sum: 1 } } }
]);
```

Check the `usedDisk` field in the output to see whether spill-to-disk occurred.

## Summary

Reducing memory usage in MongoDB aggregation pipelines requires discipline at the pipeline design stage. Place `$match` and `$project` as early as possible to minimize the number and size of documents flowing through later stages. Avoid accumulating large arrays with `$push`, use `$limit` early when applicable, and enable `allowDiskUse` only after exhausting optimization options. Regularly profile pipelines with `explain()` to catch regressions before they impact production.
