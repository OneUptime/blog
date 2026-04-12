# How to Troubleshoot MongoDB Index Performance Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Performance, Query, Optimization

Description: Identify and resolve MongoDB index performance problems using explain plans, index statistics, and query profiling techniques.

---

## Why Indexes Underperform

Adding an index does not guarantee fast queries. Indexes can be unused, partially used, or even counterproductive when they cause excessive memory usage or write amplification. This guide shows you how to find and fix these problems.

## Step 1 - Run explain() on Slow Queries

The first tool is `explain("executionStats")`:

```javascript
db.orders.find({ userId: "u123", status: "shipped" }).explain("executionStats");
```

Key fields to examine in the output:

```json
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN"
    }
  },
  "executionStats": {
    "nReturned": 5,
    "totalDocsExamined": 50000,
    "totalKeysExamined": 0,
    "executionTimeMillis": 320
  }
}
```

A `COLLSCAN` stage means no index is being used. A ratio of `totalDocsExamined / nReturned` much greater than 1 means the index is not selective enough.

## Step 2 - Check Index Usage Statistics

View which indexes are actually being hit:

```javascript
db.orders.aggregate([{ $indexStats: {} }]);
```

Look for indexes with `accesses.ops: 0` - those are unused and waste write overhead:

```javascript
// Drop indexes that have never been used
db.orders.dropIndex("old_status_index");
```

## Step 3 - Identify the Correct Index Strategy

For a query filtering on `userId` with a sort on `createdAt`:

```javascript
db.orders.find({ userId: "u123" }).sort({ createdAt: -1 });
```

The index must match the filter field first, then the sort field - and the sort direction must match:

```javascript
db.orders.createIndex({ userId: 1, createdAt: -1 });
```

Without the sort direction match, MongoDB falls back to an in-memory sort (`SORT` stage in explain), which fails for result sets larger than 100 MB.

## Step 4 - Fix Covered Query Gaps

A covered query reads only from the index without touching documents. Check if your projection excludes `_id` and includes only indexed fields:

```javascript
// This query can be covered if the index includes userId, status, and amount
db.orders.find({ userId: "u123", status: "shipped" }, { _id: 0, amount: 1 }).explain("executionStats");
```

If `totalDocsExamined` is 0, the query is covered. If not, add the projected fields to the index:

```javascript
db.orders.createIndex({ userId: 1, status: 1, amount: 1 });
```

## Step 5 - Enable and Query the Profiler

Turn on slow query profiling to capture operations taking longer than 100ms:

```javascript
db.setProfilingLevel(1, { slowms: 100 });
```

Then query the profiler collection:

```javascript
db.system.profile
  .find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
  .pretty();
```

The `planSummary` field shows which index (if any) was chosen.

## Step 6 - Force an Index for Testing

To test whether a specific index improves performance without waiting for the query planner:

```javascript
db.orders.find({ userId: "u123", status: "shipped" }).hint({ userId: 1, status: 1 }).explain("executionStats");
```

Compare `executionTimeMillis` between the natural plan and your forced index.

## Common Mistakes

- Index fields in wrong order: filter fields must come before sort fields in compound indexes.
- Too many indexes: each write must update all indexes. Keep only what queries actually use.
- Low-cardinality index fields: indexing a boolean field like `isDeleted` on a mostly-false collection provides little benefit.
- Missing multikey index knowledge: MongoDB automatically creates multikey indexes for array fields, but compound multikey indexes have restrictions.

## Summary

MongoDB index performance problems are diagnosable through `explain("executionStats")`, `$indexStats`, and the slow query profiler. Look for collection scans, high document-to-result ratios, and zero-usage indexes. Fix them by creating compound indexes with the correct field order and sort directions, projecting only indexed fields for covered queries, and dropping unused indexes to reduce write overhead.
