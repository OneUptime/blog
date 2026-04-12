# How to Optimize Sort Operations to Use Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Sort, Performance, Query Optimization

Description: Learn how to design indexes so MongoDB sort operations use IXSCAN instead of in-memory sorting, eliminating slow SORT stages in your query execution plans.

---

When MongoDB cannot use an index to satisfy a sort, it performs an in-memory sort (SORT stage). For large result sets this is slow and can exceed the 100 MB memory limit. The fix is to create an index whose order matches the sort order.

## Detecting an In-Memory Sort

```javascript
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).explain("executionStats")
```

Look for a `SORT` stage in `winningPlan`:

```json
{
  "winningPlan": {
    "stage": "SORT",
    "sortPattern": { "createdAt": -1 },
    "inputStage": {
      "stage": "COLLSCAN"
    }
  }
}
```

The `SORT` stage means in-memory sorting is happening.

## Creating an Index That Supports Sort

Add the sort field to the index after the filter fields:

```javascript
db.orders.createIndex({ status: 1, createdAt: -1 })
```

Now the query reads documents in sorted order directly from the index:

```json
{
  "winningPlan": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN",
      "indexName": "status_1_createdAt_-1"
    }
  }
}
```

No `SORT` stage - the index provides the sort.

## Matching Index Direction to Sort Direction

Index direction matters for sort. The index `{ createdAt: 1 }` can serve both ascending and descending sorts on a single field:

```javascript
db.orders.find().sort({ createdAt: 1 })   // uses index forward
db.orders.find().sort({ createdAt: -1 })  // uses index backward
```

For compound sorts, the direction of each field must either match the index or be the exact inverse:

```javascript
// Index: { a: 1, b: -1 }
db.col.find().sort({ a: 1, b: -1 })   // uses index forward
db.col.find().sort({ a: -1, b: 1 })   // uses index backward (exact inverse)
db.col.find().sort({ a: 1, b: 1 })    // cannot use index - in-memory sort
```

## Equality, Sort, Range (ESR) Rule

When a query has both a range filter and a sort, place the sort field before the range field in the index. This follows the ESR rule: Equality fields first, then Sort fields, then Range fields:

```javascript
// Query: filter by status, range on createdAt, sort by amount
db.orders.find({
  status: "shipped",
  createdAt: { $gte: ISODate("2026-01-01") }
}).sort({ amount: -1 })

// Index following the ESR rule
db.orders.createIndex({ status: 1, amount: -1, createdAt: 1 })
```

A range filter field interrupts index-provided sort for subsequent fields. If the range field (`createdAt`) were placed before the sort field (`amount`) in the index, MongoDB would need an in-memory sort. By placing the sort field first, the index provides the sort order directly. Test with `explain` to verify.

## Aggregation Sort Optimization

The same principles apply inside `$sort` stages in aggregation pipelines. Place `$match` before `$sort` so MongoDB can use an index:

```javascript
db.orders.aggregate([
  { $match: { status: "pending" } },        // filter first
  { $sort:  { createdAt: -1 } },            // then sort (uses index if available)
  { $limit: 50 }
])
```

## Summary

Optimize MongoDB sort operations by creating compound indexes where the sort fields follow the filter fields in the correct direction. Verify the fix with `explain` and confirm that the `SORT` stage is gone from the winning plan. Match index field directions exactly - or use the exact inverse - for compound sorts.
