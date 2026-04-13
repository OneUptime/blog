# What Is the Difference Between $merge and $out in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pipeline, Collection, Index

Description: $merge and $out both write aggregation results to a collection, but $merge supports upserts and merging into existing data while $out replaces the entire collection.

---

## Overview

MongoDB's aggregation pipeline offers two stages for persisting results to a collection: `$out` and `$merge`. Both write output documents to a target collection, but their behavior differs significantly in how they handle existing data.

## The $out Stage

`$out` writes the aggregation result to a new collection. If the target collection already exists, `$out` **replaces it entirely** - it drops the collection and creates a new one atomically.

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
    _id: "$customerId",
    totalSpent: { $sum: "$amount" }
  }},
  { $out: "customer_totals" }
])
```

Key behaviors of `$out`:
- Replaces the entire target collection atomically
- Preserves existing indexes from the target collection
- Cannot write to a sharded collection
- Only available as the last stage in a pipeline

## The $merge Stage

`$merge`, introduced in MongoDB 4.2, provides much more flexibility. It can insert new documents, update or replace existing ones, keep existing documents, or fail on conflicts - all configurable via the `whenMatched` and `whenNotMatched` options.

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
    _id: "$customerId",
    totalSpent: { $sum: "$amount" }
  }},
  { $merge: {
    into: "customer_totals",
    on: "_id",
    whenMatched: "merge",
    whenNotMatched: "insert"
  }}
])
```

### $merge Options

```javascript
// Replace matched documents entirely
{ $merge: {
  into: "customer_totals",
  on: "_id",
  whenMatched: "replace",
  whenNotMatched: "insert"
}}

// Keep existing documents, only insert new ones
{ $merge: {
  into: "customer_totals",
  on: "_id",
  whenMatched: "keepExisting",
  whenNotMatched: "insert"
}}

// Custom update pipeline for matched documents
{ $merge: {
  into: "customer_totals",
  on: "_id",
  whenMatched: [
    { $set: {
      totalSpent: { $add: ["$totalSpent", "$$new.totalSpent"] },
      lastUpdated: "$$NOW"
    }}
  ],
  whenNotMatched: "insert"
}}
```

## Key Differences

| Feature | $out | $merge |
|---|---|---|
| MongoDB version | 2.6+ | 4.2+ |
| Replaces collection | Yes (always) | No |
| Preserves indexes | Yes | Yes |
| Sharded target | No | Yes |
| Upsert support | No | Yes |
| Incremental updates | No | Yes |

## When to Use $out

Use `$out` when you need to:
- Fully regenerate a materialized view or reporting collection on a schedule
- Ensure the output is always a fresh, complete snapshot
- Run on MongoDB versions before 4.2

```javascript
// Nightly rebuild of a summary collection
db.sales.aggregate([
  { $match: { date: { $gte: startOfDay } } },
  { $group: { _id: "$region", total: { $sum: "$revenue" } } },
  { $out: "daily_sales_summary" }
])
```

## When to Use $merge

Use `$merge` when you need to:
- Incrementally update a running summary without full rebuilds
- Write to a sharded collection
- Preserve existing data not touched by the pipeline

```javascript
// Incrementally update totals as new orders arrive
db.new_orders.aggregate([
  { $group: { _id: "$customerId", newTotal: { $sum: "$amount" } } },
  { $merge: {
    into: "customer_totals",
    on: "_id",
    whenMatched: [
      { $set: { totalSpent: { $add: ["$totalSpent", "$$new.newTotal"] } } }
    ],
    whenNotMatched: "insert"
  }}
])
```

## Summary

`$out` is a blunt instrument that replaces an entire collection, making it ideal for scheduled full refreshes of reporting tables. `$merge` is the more powerful option, enabling true incremental materialized views by merging pipeline results into existing collections. For any workload requiring upserts, sharded targets, or incremental updates, `$merge` is the correct choice.
