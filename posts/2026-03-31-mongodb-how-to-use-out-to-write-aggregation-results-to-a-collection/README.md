# How to Use $out to Write Aggregation Results to a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $out, Pipeline Stage, Collection Output, NoSQL

Description: Learn how to use MongoDB's $out stage to atomically write aggregation pipeline results to a target collection, replacing it entirely or creating it if it doesn't exist.

---

## What Is the $out Stage?

The `$out` stage writes the documents produced by the aggregation pipeline to a specified collection. If the target collection exists, `$out` replaces it entirely and atomically. If it doesn't exist, `$out` creates it.

```javascript
// Simple form - write to a collection in the same database
{ $out: "collectionName" }

// Extended form - write to a different database
{ $out: { db: "databaseName", coll: "collectionName" } }
```

## Basic Example

Compute a product category summary and write it to a new collection:

```javascript
db.products.aggregate([
  { $match: { active: true } },
  {
    $group: {
      _id: "$category",
      totalProducts: { $sum: 1 },
      avgPrice: { $avg: "$price" },
      totalInventory: { $sum: "$quantity" }
    }
  },
  { $sort: { totalProducts: -1 } },
  { $out: "categorySummary" }
])
```

After the pipeline completes, `categorySummary` contains exactly the grouped results.

## Atomicity Guarantee

`$out` uses a two-phase approach:
1. Writes results to a temporary collection.
2. Atomically renames the temporary collection to the target name.

This means readers of the target collection always see either the old or the new data - never a partial result.

## Writing to Another Database

```javascript
db.salesData.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$saleDate" } },
      monthlyRevenue: { $sum: "$amount" }
    }
  },
  {
    $out: {
      db: "reporting",
      coll: "monthlyRevenue"
    }
  }
])
```

## Scheduled Report Generation

A common pattern is to run `$out` pipelines on a schedule to pre-compute expensive queries:

```javascript
// Run nightly to pre-compute leaderboard
db.gameScores.aggregate([
  {
    $group: {
      _id: "$playerId",
      totalScore: { $sum: "$score" },
      gamesPlayed: { $sum: 1 }
    }
  },
  { $sort: { totalScore: -1 } },
  { $limit: 1000 },
  {
    $addFields: {
      computedAt: new Date()
    }
  },
  { $out: "leaderboard" }
])
```

Application queries hit the pre-computed `leaderboard` collection directly.

## $out and Indexes

When `$out` replaces a collection, it preserves all existing indexes on the target collection. You do not need to recreate them after the pipeline runs:

```javascript
// Create index on the target collection once
db.customerSummary.createIndex({ totalSpent: -1 })

// Run aggregation - the index is preserved after replacement
db.orders.aggregate([
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $out: "customerSummary" }
])
```

If the aggregation fails or violates a unique index constraint, the original collection and its indexes remain unchanged.

## Verifying Output

After `$out`, verify the result:

```javascript
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $out: "orderStatusSummary" }
])

// Check the result
db.orderStatusSummary.find().toArray()
db.orderStatusSummary.countDocuments()
```

## $out Returns No Documents

Unlike other stages, `$out` produces no output documents - it always returns an empty cursor. All documents are written to the target collection.

```javascript
// This cursor will be empty
const cursor = db.products.aggregate([
  { $group: { _id: "$category" } },
  { $out: "categories" }
])
cursor.toArray()  // returns []
```

## Practical Use Case - ETL Pipeline

Extract, transform, and load data into a reporting collection:

```javascript
db.rawEvents.aggregate([
  // Extract: filter relevant events
  { $match: { eventType: "purchase", date: { $gte: new Date("2024-01-01") } } },
  // Transform: reshape and enrich
  {
    $project: {
      date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
      userId: 1,
      productId: 1,
      amount: 1,
      channel: { $ifNull: ["$channel", "unknown"] }
    }
  },
  // Load: write to reporting collection
  { $out: "purchaseEvents" }
])
```

## $out vs $merge

```text
Feature          | $out                 | $merge
-----------------|----------------------|---------------------------
Target behavior  | Full replacement     | Selective insert/update
Atomicity        | Yes (full replace)   | Per-document
Preserves data   | No                   | Yes (whenMatched options)
Indexes          | Preserved            | Preserved
Use case         | Full refresh reports | Incremental updates
```

## Summary

The `$out` stage provides a simple, atomic way to write aggregation results to a collection, making it ideal for scheduled report generation, ETL pipelines, and pre-computing expensive queries. Be aware that it replaces the entire target collection, and prefer `$merge` when incremental updates are needed.
