# How to Fix MongoError: Sort Exceeded Memory Limit in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sort Memory Limit, Query Optimization, Index, Troubleshooting

Description: Learn how to fix the MongoError sort operation used too much memory by adding indexes, increasing the memory limit, or using allowDiskUse in aggregation pipelines.

---

## Overview

MongoDB limits in-memory sort operations to 100 MB by default. When a query returns too many documents to sort in memory, you get the error:

```text
MongoError: Sort exceeded memory limit of 104857600 bytes, but did not opt in to external sorting.
```

This guide covers all the ways to fix it.

## Root Cause

The error occurs when:

1. A sort operation has no supporting index and MongoDB must sort all matching documents in memory.
2. The result set is large enough that the in-memory sort exceeds 100 MB.

## Fix 1 - Add an Index for the Sort

The cleanest fix is creating an index that satisfies the sort. MongoDB can then return documents in index order without an in-memory sort:

```javascript
// Query causing the error
db.orders.find({ status: "pending" }).sort({ createdAt: -1 });

// Fix: create a compound index matching the filter and sort
db.orders.createIndex({ status: 1, createdAt: -1 });
```

Verify the fix with `explain()`:

```javascript
db.orders.find({ status: "pending" })
  .sort({ createdAt: -1 })
  .explain("executionStats");
// Look for IXSCAN and no SORT stage in the winning plan
```

## Fix 2 - Use allowDiskUse in Aggregation

If you cannot add an index, or the sort is part of a complex aggregation pipeline, enable disk-based sorting:

```javascript
// Aggregation pipeline with disk sort
db.orders.aggregate(
  [
    { $match: { status: "pending" } },
    { $sort: { createdAt: -1 } },
    { $limit: 100 }
  ],
  { allowDiskUse: true }
);
```

In Node.js:

```javascript
const results = await db.collection("orders").aggregate(
  [
    { $match: { status: "pending" } },
    { $sort: { createdAt: -1 } },
    { $limit: 100 }
  ],
  { allowDiskUse: true }
).toArray();
```

Note: Prior to MongoDB 4.4, `allowDiskUse` is only available for aggregation pipelines, not regular `find()` queries. See Fix 3 for `find()` support in MongoDB 4.4+.

## Fix 3 - Use cursor.allowDiskUse() in MongoDB 4.4+

Starting in MongoDB 4.4, you can enable disk use for `find()` cursors:

```javascript
// MongoDB 4.4+
db.orders.find({ status: "pending" })
  .sort({ amount: -1 })
  .allowDiskUse(true);
```

In Node.js driver:

```javascript
const cursor = db.collection("orders")
  .find({ status: "pending" })
  .sort({ amount: -1 })
  .allowDiskUse(true);

const results = await cursor.toArray();
```

## Fix 4 - Increase the Sort Memory Limit

Increase the per-operation memory limit using `setParameter`:

```javascript
// Increase to 500 MB (in the mongo shell as admin)
db.adminCommand({
  setParameter: 1,
  internalQueryMaxBlockingSortMemoryUsageBytes: 524288000  // 500 MB
});
```

Set it permanently in `mongod.conf`:

```yaml
setParameter:
  internalQueryMaxBlockingSortMemoryUsageBytes: 524288000
```

This affects all queries server-wide - use it carefully.

## Fix 5 - Reduce the Result Set Before Sorting

If you have a large result set and only need the top N, add a `$match` to filter first and a `$limit` after the sort:

```javascript
db.orders.aggregate([
  { $match: { status: "pending", createdAt: { $gte: new Date("2026-01-01") } } },
  { $sort: { amount: -1 } },
  { $limit: 50 }
]);
```

Pushing more of the filtering before the `$sort` stage reduces the number of documents that need to be sorted.

## Diagnosing the Problem

Use `explain("executionStats")` to confirm the sort is in-memory:

```javascript
db.orders.find({ status: "pending" })
  .sort({ createdAt: -1 })
  .explain("executionStats");
```

Look for a `SORT` stage in the plan - that indicates an in-memory sort. If the stage is missing, the sort is satisfied by an index.

## Summary

The MongoDB sort memory limit error is best fixed by adding an index that covers both the filter fields and sort fields - this eliminates the in-memory sort entirely and also speeds up the query. When an index is impractical (such as in exploratory aggregation pipelines), use `allowDiskUse: true`. For permanent large-sort workloads, increase `internalQueryMaxBlockingSortMemoryUsageBytes` in the server configuration.
