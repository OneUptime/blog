# How to Calculate Customer Lifetime Value in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Revenue, Customer

Description: Learn how to calculate Customer Lifetime Value (CLV) in MongoDB by aggregating order history per customer using the aggregation pipeline.

---

## Introduction

Customer Lifetime Value (CLV) measures the total revenue a business can expect from a single customer over the entire relationship. In MongoDB, you can compute CLV by aggregating orders per customer, summing their total spend, and optionally projecting future value based on purchase frequency.

## Sample Data Structure

Assume an `orders` collection where each document represents a completed order:

```json
{
  "_id": ObjectId("..."),
  "customerId": "cust_789",
  "total": 149.99,
  "items": 3,
  "createdAt": ISODate("2024-09-20T11:00:00Z")
}
```

## Simple Historical CLV

Sum all revenue per customer and compute average order value and purchase frequency:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalRevenue: { $sum: "$total" },
      orderCount: { $sum: 1 },
      firstOrder: { $min: "$createdAt" },
      lastOrder: { $max: "$createdAt" }
    }
  },
  {
    $project: {
      customerId: "$_id",
      totalRevenue: 1,
      orderCount: 1,
      avgOrderValue: { $divide: ["$totalRevenue", "$orderCount"] },
      customerAgeMonths: {
        $divide: [
          { $subtract: ["$lastOrder", "$firstOrder"] },
          1000 * 60 * 60 * 24 * 30
        ]
      }
    }
  },
  { $sort: { totalRevenue: -1 } },
  { $limit: 100 }
])
```

`$subtract` on two dates returns the difference in milliseconds, which we divide to get months.

## Segmenting Customers by CLV

Use `$bucket` to assign customers to CLV tiers:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalRevenue: { $sum: "$total" }
    }
  },
  {
    $bucket: {
      groupBy: "$totalRevenue",
      boundaries: [0, 100, 500, 1000, 5000, 100000],
      default: "100000+",
      output: {
        count: { $sum: 1 },
        avgRevenue: { $avg: "$totalRevenue" }
      }
    }
  }
])
```

This produces CLV segments (e.g., $0-100, $100-500) with customer counts and average revenue per segment.

## Projected CLV Using Purchase Rate

A simple CLV projection formula multiplies average order value by purchase frequency by expected customer lifespan:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalRevenue: { $sum: "$total" },
      orderCount: { $sum: 1 },
      firstOrder: { $min: "$createdAt" }
    }
  },
  {
    $project: {
      avgOrderValue: { $divide: ["$totalRevenue", "$orderCount"] },
      monthsSinceFirst: {
        $divide: [
          { $subtract: [new Date(), "$firstOrder"] },
          1000 * 60 * 60 * 24 * 30
        ]
      },
      orderCount: 1
    }
  },
  {
    $project: {
      projectedCLV: {
        $multiply: [
          "$avgOrderValue",
          { $divide: ["$orderCount", { $max: ["$monthsSinceFirst", 1] }] },
          24
        ]
      }
    }
  },
  { $sort: { projectedCLV: -1 } }
])
```

This projects CLV over a 24-month horizon using each customer's observed purchase rate.

## Index Recommendation

```javascript
db.orders.createIndex({ customerId: 1, createdAt: 1 })
```

## Summary

Calculating CLV in MongoDB uses `$group` to aggregate per-customer totals and order counts, combined with `$project` to derive average order value, purchase frequency, and customer age. The `$bucket` operator segments customers into value tiers. For projected CLV, multiply average order value by the observed purchase rate and a time horizon. Index on `customerId` and `createdAt` to keep these aggregations efficient.
