# How to Use $merge for Incremental Materialized Views in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $merge, Materialized View, Performance

Description: Build incrementally maintained materialized views in MongoDB using $merge to keep pre-aggregated summary collections up-to-date without full recomputation.

---

## What are Materialized Views

A materialized view is a pre-computed, stored result of a query or aggregation. Unlike a live query, the results are stored as documents and can be indexed. MongoDB does not have native materialized views, but the `$merge` stage enables incremental maintenance patterns that achieve the same goal.

## The Challenge with $out

The `$out` stage replaces the entire target collection on every run:

```javascript
// $out: runs full aggregation every time, expensive for large datasets
db.orders.aggregate([
  { $group: { _id: "$region", total: { $sum: "$amount" } } },
  { $out: "region_totals" }  // Full replace - reads ALL orders every time
])
```

For large collections, this is wasteful. `$merge` enables processing only new or changed data.

## Pattern 1: Append-Only Incremental Updates

For time-series data where new records are only added (never updated), process only the latest time window:

```javascript
// Run every hour to process the last hour's data
const oneHourAgo = new Date(Date.now() - 3600 * 1000);

db.events.aggregate([
  {
    $match: {
      timestamp: { $gte: oneHourAgo }
    }
  },
  {
    $group: {
      _id: {
        hour: { $dateToString: { format: "%Y-%m-%dT%H:00", date: "$timestamp" } },
        category: "$category"
      },
      count: { $sum: 1 },
      totalValue: { $sum: "$value" }
    }
  },
  {
    $merge: {
      into: "hourly_category_stats",
      on: "_id",
      whenMatched: [
        {
          $set: {
            count: { $add: ["$count", "$$new.count"] },
            totalValue: { $add: ["$totalValue", "$$new.totalValue"] },
            lastRefreshed: "$$NOW"
          }
        }
      ],
      whenNotMatched: "insert"
    }
  }
])
```

## Pattern 2: Snapshot Replace for Small Dimensions

For small dimension tables (products, categories, regions) that change rarely, a full replace per run is acceptable:

```javascript
db.products.aggregate([
  {
    $lookup: {
      from: "categories",
      localField: "categoryId",
      foreignField: "_id",
      as: "cat"
    }
  },
  {
    $set: {
      categoryName: { $arrayElemAt: ["$cat.name", 0] },
      refreshedAt: "$$NOW"
    }
  },
  { $unset: "cat" },
  {
    $merge: {
      into: "product_flat",
      on: "_id",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
```

## Pattern 3: Scheduled Rolling Window Views

Maintain a rolling 30-day summary that recalculates only the changed window:

```javascript
async function refreshRollingView() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Remove data older than 30 days from the view
  await db.collection("rolling_summary").deleteMany({
    "_id.date": { $lt: thirtyDaysAgo.toISOString().slice(0, 10) }
  });

  // Merge today's aggregation
  await db.collection("orders").aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          product: "$productId"
        },
        revenue: { $sum: "$amount" },
        orders: { $count: {} }
      }
    },
    {
      $merge: {
        into: "rolling_summary",
        on: "_id",
        whenMatched: "replace",
        whenNotMatched: "insert"
      }
    }
  ]).toArray();
}
```

## Indexing the Materialized View

```javascript
db.hourly_category_stats.createIndex({ "_id.hour": 1, "_id.category": 1 })
db.hourly_category_stats.createIndex({ lastRefreshed: 1 })
```

## Summary

Incremental materialized views with MongoDB `$merge` avoid the cost of full recomputation by processing only recently changed data and merging results into an existing summary collection using arithmetic update pipelines. For append-only workloads, match only the latest time window and use `$add` operations in the `whenMatched` pipeline to accumulate counts and sums without overwriting historical data. Index the materialized view collection on query patterns to achieve fast reads without touching the raw data.
