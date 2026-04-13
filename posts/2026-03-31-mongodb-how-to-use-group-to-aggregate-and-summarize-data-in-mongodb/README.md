# How to Use $group to Aggregate and Summarize Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $group, Data Summarization, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $group aggregation stage to group documents by a key and compute summary statistics like sum, average, count, and more.

---

## What Is the $group Stage?

The `$group` stage groups documents by a specified expression (the `_id` field) and applies accumulator operators to compute aggregated values for each group. It is the foundation of data summarization in MongoDB.

```javascript
{
  $group: {
    _id: <groupKey>,
    field1: { <accumulator>: <expression> },
    field2: { <accumulator>: <expression> }
  }
}
```

## Common Accumulators

| Accumulator | Description |
|---|---|
| `$sum` | Sums numeric values |
| `$avg` | Computes average |
| `$min` | Finds minimum value |
| `$max` | Finds maximum value |
| `$count` | Counts documents in each group (MongoDB 5.0+; use `{ $sum: 1 }` for older versions) |
| `$push` | Creates array of values |
| `$addToSet` | Creates array of unique values |
| `$first` | Gets first value in group |
| `$last` | Gets last value in group |

## Basic Example - Count by Category

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      productCount: { $sum: 1 },
      avgPrice: { $avg: "$price" },
      totalRevenue: { $sum: { $multiply: ["$price", "$sold"] } }
    }
  }
])
```

## Grouping by Multiple Fields

Use an object as `_id` to group by a composite key:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$orderDate" },
        month: { $month: "$orderDate" },
        status: "$status"
      },
      orderCount: { $sum: 1 },
      totalAmount: { $sum: "$amount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])
```

## Grouping All Documents (Grand Total)

Use `null` as the `_id` to group all documents:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: null,
      totalOrders: { $sum: 1 },
      totalRevenue: { $sum: "$amount" },
      avgOrderValue: { $avg: "$amount" }
    }
  }
])
```

## Collecting Values with $push and $addToSet

```javascript
db.enrollments.aggregate([
  {
    $group: {
      _id: "$courseId",
      studentIds: { $push: "$studentId" },         // all student IDs (with duplicates)
      uniqueStudents: { $addToSet: "$studentId" },  // unique student IDs only
      studentCount: { $sum: 1 }
    }
  }
])
```

## Getting First and Last Values

When combined with `$sort`, `$first` and `$last` let you get boundary values per group:

```javascript
db.events.aggregate([
  { $sort: { timestamp: 1 } },
  {
    $group: {
      _id: "$userId",
      firstEvent: { $first: "$eventType" },
      lastEvent: { $last: "$eventType" },
      firstAt: { $first: "$timestamp" },
      lastAt: { $last: "$timestamp" }
    }
  }
])
```

## Practical Use Case - Sales Dashboard

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: {
        salesRepId: "$salesRepId",
        quarter: { $ceil: { $divide: [{ $month: "$date" }, 3] } }
      },
      deals: { $sum: 1 },
      totalRevenue: { $sum: "$amount" },
      avgDealSize: { $avg: "$amount" },
      maxDeal: { $max: "$amount" }
    }
  },
  {
    $sort: { totalRevenue: -1 }
  }
])
```

## Filtering After Grouping with $match

Use `$match` after `$group` to filter grouped results:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      orderCount: { $sum: 1 },
      totalSpent: { $sum: "$amount" }
    }
  },
  {
    $match: {
      orderCount: { $gte: 5 },
      totalSpent: { $gt: 1000 }
    }
  }
])
```

## Reshaping Group Output

Follow `$group` with `$project` to rename and reshape output:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 },
      avgPrice: { $avg: "$price" }
    }
  },
  {
    $project: {
      _id: 0,
      category: "$_id",
      count: 1,
      avgPrice: { $round: ["$avgPrice", 2] }
    }
  }
])
```

## Summary

The `$group` stage is the core aggregation tool for summarizing data in MongoDB. It groups documents by any expression and supports a rich set of accumulators for computing sums, averages, counts, min/max values, and arrays. Combined with `$sort`, `$match`, and `$project`, it enables powerful data analysis directly in the database layer.
