# How to Calculate the Average of a Field in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $avg, Aggregation, Average, $group

Description: Learn how to calculate the average value of a numeric field in MongoDB using the $avg accumulator in an aggregation pipeline.

---

## Overview

MongoDB's `$avg` accumulator calculates the arithmetic mean of a numeric field across grouped documents. It can be used in `$group`, `$project`, and `$addFields` stages of an aggregation pipeline.

## Basic Average Across All Documents

```javascript
// Calculate the average order amount across all orders
db.orders.aggregate([
  {
    $group: {
      _id: null,          // null groups all documents together
      averageAmount: { $avg: "$amount" }
    }
  }
]);

// Result: { "_id": null, "averageAmount": 127.45 }
```

## Average Per Group

Calculate the average within each group:

```javascript
// Average order amount by customer
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      avgOrder: { $avg: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { avgOrder: -1 } }
]);
```

## Average with Filter

Use `$match` before `$group` to filter the dataset first:

```javascript
// Average amount for completed orders in 2026
db.orders.aggregate([
  {
    $match: {
      status: "completed",
      createdAt: { $gte: new Date("2026-01-01") }
    }
  },
  {
    $group: {
      _id: null,
      avgAmount: { $avg: "$amount" }
    }
  }
]);
```

## Average of a Nested Field

Use dot notation to average a field inside an embedded document:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      avgPrice: { $avg: "$pricing.salePrice" }
    }
  }
]);
```

## $avg in $project (Document-Level Average)

Use `$avg` in a `$project` stage to calculate the average of multiple fields within a single document (not across documents):

```javascript
// Average of three score fields within each student document
db.students.aggregate([
  {
    $project: {
      name: 1,
      avgScore: {
        $avg: ["$mathScore", "$scienceScore", "$englishScore"]
      }
    }
  }
]);
```

## Average of an Array Field Within a Document

```javascript
// Document: { "name": "Alice", "scores": [85, 90, 78, 92] }
db.students.aggregate([
  {
    $project: {
      name: 1,
      avgScore: { $avg: "$scores" }
    }
  }
]);
// Result: { "name": "Alice", "avgScore": 86.25 }
```

## Rounding the Average

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$category",
      avgAmount: { $avg: "$amount" }
    }
  },
  {
    $project: {
      category: "$_id",
      avgAmountRounded: { $round: ["$avgAmount", 2] },
      _id: 0
    }
  }
]);
```

## Average by Time Period

```javascript
// Average order amount by month
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      avgOrderAmount: { $avg: "$amount" },
      totalRevenue: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Node.js Example

```javascript
async function getAverageOrderByRegion(db) {
  return db.collection("orders").aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: "$region",
        avgAmount: { $avg: "$amount" },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        region: "$_id",
        avgAmount: { $round: ["$avgAmount", 2] },
        count: 1,
        _id: 0
      }
    },
    { $sort: { avgAmount: -1 } }
  ]).toArray();
}
```

## Summary

MongoDB's `$avg` accumulator calculates the mean of a numeric field within a `$group` stage. Use `_id: null` to average across all documents, or set `_id` to a field to average per group. In `$project`, `$avg` accepts an array of field references to average values within a single document. Always add `$match` before `$group` to filter down to the relevant subset before averaging, and use `$round` to format floating-point results.
