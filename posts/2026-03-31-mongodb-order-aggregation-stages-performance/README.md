# How to Order Aggregation Stages for Maximum Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, Optimization, Pipeline

Description: Learn how to order MongoDB aggregation pipeline stages to minimize document count early, use indexes, and avoid unnecessary memory usage.

---

## Why Stage Order Matters

MongoDB executes aggregation pipeline stages sequentially. Each stage receives all documents output by the previous stage. If a stage that reduces the document count comes late in the pipeline, earlier stages process far more documents than necessary. The goal is to reduce document count as early as possible and use indexes where available.

## The Golden Rule: Filter First

Always place `$match` stages as early as possible:

**Slow** - `$group` processes all 10 million documents:

```javascript
db.orders.aggregate([
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $match: { total: { "$gt": 1000 } } }
])
```

**Fast** - `$match` reduces documents to a small subset before grouping:

```javascript
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { "$gte": ISODate("2026-01-01") } } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $match: { total: { "$gt": 1000 } } }
])
```

The early `$match` on `status` and `createdAt` can use a compound index and pass only matching documents to `$group`.

## $sort + $limit Optimization

When `$sort` is immediately followed by `$limit`, MongoDB can apply a top-K optimization - it maintains only K documents in memory rather than sorting the entire set:

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $sort: { salesCount: -1 } },
  { $limit: 10 }
])
```

Separate them with an intervening stage and the optimization is lost:

```javascript
// BAD: $project between $sort and $limit defeats top-K optimization
{ $sort: { salesCount: -1 } },
{ $project: { name: 1, salesCount: 1 } },
{ $limit: 10 }
```

## $project and $addFields: Use Late

Projections and computed fields are cheap per document but unnecessary if applied before stages that reduce document count:

**Correct order:**

```javascript
db.events.aggregate([
  { $match: { type: "purchase" } },          // filter first
  { $group: { _id: "$userId", count: { $sum: 1 } } },  // aggregate
  { $sort: { count: -1 } },
  { $limit: 100 },
  { $project: { userId: "$_id", count: 1, _id: 0 } }  // shape output last
])
```

## $lookup: Filter Before and After

`$lookup` is expensive - run it on as few documents as possible:

```javascript
db.orders.aggregate([
  { $match: { status: "shipped" } },   // reduce before lookup
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  { $project: { orderId: 1, "customer.name": 1, "customer.email": 1 } }
])
```

Add a filter after `$lookup` if you need to filter on the joined data:

```javascript
{ $match: { "customer.tier": "premium" } }
```

## $unwind: Push Down Before $group

`$unwind` multiplies document count. If you `$unwind` then `$match`, you process more documents than necessary:

**Slow:**

```javascript
{ $unwind: "$tags" },
{ $match: { status: "active" } }
```

**Fast:**

```javascript
{ $match: { status: "active" } },   // filter before expanding arrays
{ $unwind: "$tags" }
```

## Index Usage in Aggregation

A `$match` at the start of a pipeline can use an index if the fields match. Verify with `explain`:

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending", createdAt: { "$gte": ISODate("2026-01-01") } } },
  { $group: { _id: "$customerId", count: { $sum: 1 } } }
])
```

Look for `IXSCAN` in the winning plan. If you see `COLLSCAN`, add an index on the match fields.

## $facet: Parallel Pipelines

Use `$facet` to run multiple sub-pipelines on the same filtered set without re-scanning the collection:

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  {
    $facet: {
      priceStats: [{ $group: { _id: null, avg: { $avg: "$price" }, max: { $max: "$price" } } }],
      topSellers: [{ $sort: { sold: -1 } }, { $limit: 5 }, { $project: { name: 1, sold: 1 } }]
    }
  }
])
```

## Recommended Stage Order Template

```text
1. $match       - filter with indexed fields
2. $sort        - before $limit for top-K optimization
3. $limit       - reduce document count
4. $lookup      - join on reduced set
5. $unwind      - expand arrays
6. $group       - aggregate
7. $sort        - sort aggregated results
8. $project     - shape final output
```

## Summary

Ordering aggregation stages correctly can turn a pipeline that takes minutes into one that takes milliseconds. Always filter with `$match` first, keep `$sort` immediately before `$limit` for top-K optimization, run `$lookup` on a reduced dataset, and defer `$project` to the end. Use `explain()` to verify index usage on the first `$match` stage.
