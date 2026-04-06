# How to Build a Top-N Report in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Ranking, Report

Description: Learn how to build a Top-N report in MongoDB to find the top products, customers, or categories by any metric using the aggregation pipeline.

---

## Introduction

A Top-N report answers questions like "what are the top 10 products by revenue this week?" or "which customers placed the most orders this quarter?" MongoDB's aggregation pipeline handles this cleanly by combining `$group`, `$sort`, and `$limit`.

## Basic Top-N by Revenue

Find the top 10 products by total revenue:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$productId",
      totalRevenue: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "products",
      localField: "_id",
      foreignField: "_id",
      as: "product"
    }
  },
  { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },
  {
    $project: {
      productName: "$product.name",
      totalRevenue: 1,
      orderCount: 1
    }
  }
])
```

Placing `$sort` and `$limit` directly after `$group` allows MongoDB to apply a top-K sort optimization, avoiding a full sort of all grouped results.

## Top-N Within Each Category

To get the top 3 products per category, use `$group` to collect all products into arrays, then `$slice`:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { category: "$category", product: "$productId" },
      revenue: { $sum: "$amount" }
    }
  },
  { $sort: { "_id.category": 1, revenue: -1 } },
  {
    $group: {
      _id: "$_id.category",
      topProducts: {
        $push: { product: "$_id.product", revenue: "$revenue" }
      }
    }
  },
  {
    $project: {
      category: "$_id",
      topProducts: { $slice: ["$topProducts", 3] }
    }
  }
])
```

MongoDB 5.2+ provides `$topN` and `$bottomN` accumulators that simplify this pattern:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$category",
      topProducts: {
        $topN: {
          n: 3,
          sortBy: { amount: -1 },
          output: { product: "$productId", revenue: "$amount" }
        }
      }
    }
  }
])
```

## Top-N with Rank

Add a rank number to each result using `$setWindowFields` (MongoDB 5.0+):

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpend: { $sum: "$amount" }
    }
  },
  {
    $setWindowFields: {
      sortBy: { totalSpend: -1 },
      output: {
        rank: { $rank: {} }
      }
    }
  },
  { $match: { rank: { $lte: 10 } } }
])
```

`$rank` assigns a rank position based on the sort order, enabling you to filter to exactly the top N ranked customers.

## Index Recommendation

```javascript
db.orders.createIndex({ category: 1, amount: -1 })
db.orders.createIndex({ productId: 1 })
```

## Summary

Top-N reports in MongoDB use `$group` to aggregate metrics, `$sort` to order results, and `$limit` to take the top N. For Top-N within groups, use `$slice` or the `$topN` accumulator introduced in MongoDB 5.2. To include explicit rank numbers, use `$setWindowFields` with `$rank`. Placing `$sort` and `$limit` immediately after `$group` allows MongoDB's query planner to apply a top-K optimization for better performance.
