# How to Avoid Sort Exceeding Memory Limit Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sort, Performance, Memory, Query Optimization

Description: Learn why MongoDB throws sort exceeded memory limit errors and how to fix them using indexes, allowDiskUse, or restructuring your aggregation pipeline.

---

MongoDB limits in-memory sort operations to 100 MB. When a sort stage needs more than that, you get an error like:

```text
Sort exceeded memory limit of 104857600 bytes, but did not opt in to external sorting.
```

This post covers the root causes and the three main ways to fix it.

## Why This Happens

The error occurs when:
1. A query or aggregation has a `$sort` stage.
2. No index can provide the sorted order.
3. The documents being sorted collectively exceed 100 MB in memory.

## Fix 1 - Create an Index That Satisfies the Sort

The best fix is to add an index that provides the sort order, eliminating the in-memory sort entirely.

```javascript
// Failing aggregation
db.events.aggregate([
  { $match: { type: "purchase" } },
  { $sort:  { timestamp: -1 } }
])

// Create an index matching filter + sort fields
db.events.createIndex({ type: 1, timestamp: -1 })
```

Verify the fix with `explain`:

```javascript
db.events.aggregate([
  { $match: { type: "purchase" } },
  { $sort:  { timestamp: -1 } }
], { explain: true })
// Should show IXSCAN, not SORT
```

## Fix 2 - Use allowDiskUse

When an index is not feasible, allow the sort to spill to disk:

```javascript
db.orders.aggregate(
  [
    { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
    { $sort:  { total: -1 } }
  ],
  { allowDiskUse: true }
)
```

For `find` with sort on MongoDB 4.4+:

```javascript
db.orders.find({}).sort({ amount: -1 }).allowDiskUse(true)
```

`allowDiskUse` is slower than an index-backed sort but avoids the memory limit error.

## Fix 3 - Reduce the Sort Input with $match and $limit

Filter the dataset before sorting so fewer documents are in memory:

```javascript
db.events.aggregate([
  // Filter early to reduce documents reaching $sort
  { $match: {
    type: "purchase",
    timestamp: { $gte: ISODate("2026-01-01") }
  }},
  { $sort: { timestamp: -1 } },
  { $limit: 1000 }              // only keep top 1000
])
```

A `$limit` immediately after `$sort` enables the "top-K" optimization, which only keeps K documents in memory rather than the full sorted set.

## Increasing the Memory Limit (Advanced)

On MongoDB 4.4+, you can increase the per-operation memory limit via the `internalQueryMaxBlockingSortMemoryUsageBytes` parameter:

```javascript
db.adminCommand({
  setParameter: 1,
  internalQueryMaxBlockingSortMemoryUsageBytes: 268435456  // 256 MB
})
```

Use this as a short-term workaround, not a permanent fix.

## Diagnosing the Root Cause

```javascript
db.orders.find({}).sort({ createdAt: -1 }).explain("executionStats")
```

If you see `memUsage` in the `SORT` stage close to 100 MB, you are at risk of hitting the limit with a larger dataset.

## Summary

Fix MongoDB sort memory limit errors by creating an index that provides the sort order (best approach), enabling `allowDiskUse` to spill to disk (safe fallback), or adding `$match` and `$limit` to reduce the sort input. Index-backed sorts are free of the 100 MB limit because MongoDB reads documents already in order.
