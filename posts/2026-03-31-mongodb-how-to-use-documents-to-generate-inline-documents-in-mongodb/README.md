# How to Use $documents to Generate Inline Documents in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $documents, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $documents stage to generate inline documents from a literal array within an aggregation pipeline, enabling lookups against in-memory data.

---

## What Is the $documents Stage?

The `$documents` stage (introduced in MongoDB 6.0) generates a sequence of documents from a literal array within an aggregation pipeline. It allows you to create documents "inline" without needing a collection - useful for testing, reference data lookups, and cross-joining with static data.

`$documents` can only be used in `db.aggregate()` (not `collection.aggregate()`), as it creates documents from scratch rather than reading from a collection.

```javascript
db.aggregate([
  {
    $documents: [
      { key: "a", value: 1 },
      { key: "b", value: 2 },
      { key: "c", value: 3 }
    ]
  }
])
```

## Basic Example

Generate documents from a static array:

```javascript
db.aggregate([
  {
    $documents: [
      { month: 1, name: "January" },
      { month: 2, name: "February" },
      { month: 3, name: "March" }
    ]
  }
])
```

Output (auto-generated `_id` fields omitted for brevity):

```javascript
{ _id: ObjectId("..."), month: 1, name: "January" }
{ _id: ObjectId("..."), month: 2, name: "February" }
{ _id: ObjectId("..."), month: 3, name: "March" }
```

## Joining Inline Data with a Collection

Use `$documents` with `$lookup` to join inline reference data with a collection:

```javascript
db.aggregate([
  // Define the statuses we want to report on
  {
    $documents: [
      { status: "pending" },
      { status: "processing" },
      { status: "completed" },
      { status: "cancelled" }
    ]
  },
  // Join with orders collection for each status
  {
    $lookup: {
      from: "orders",
      localField: "status",
      foreignField: "status",
      as: "orders"
    }
  },
  // Compute count per status
  {
    $project: {
      status: 1,
      orderCount: { $size: "$orders" }
    }
  }
])
```

This ensures all statuses appear in the output even if no orders exist for that status.

## Generating Test Data

Quickly create test documents without inserting into a collection:

```javascript
db.aggregate([
  {
    $documents: [
      { userId: "u1", score: 85 },
      { userId: "u2", score: 92 },
      { userId: "u3", score: 74 }
    ]
  },
  { $match: { score: { $gte: 80 } } }
])
```

## Creating Date Series for Analysis

Generate a date series to ensure all periods appear in reports:

```javascript
db.aggregate([
  {
    $documents: [
      { date: new Date("2024-01-01"), period: "Q1" },
      { date: new Date("2024-04-01"), period: "Q2" },
      { date: new Date("2024-07-01"), period: "Q3" },
      { date: new Date("2024-10-01"), period: "Q4" }
    ]
  },
  {
    $lookup: {
      from: "revenue",
      let: { qPeriod: "$period" },
      pipeline: [
        { $match: { $expr: { $eq: ["$quarter", "$$qPeriod"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ],
      as: "revenueData"
    }
  },
  {
    $project: {
      period: 1,
      revenue: {
        $ifNull: [{ $arrayElemAt: ["$revenueData.total", 0] }, 0]
      }
    }
  }
])
```

## Practical Use Case - Lookup Table Join

Join with a hardcoded mapping of country codes to names:

```javascript
db.aggregate([
  {
    $documents: [
      { code: "US", name: "United States" },
      { code: "GB", name: "United Kingdom" },
      { code: "DE", name: "Germany" },
      { code: "JP", name: "Japan" },
      { code: "AU", name: "Australia" }
    ]
  },
  {
    $lookup: {
      from: "orders",
      localField: "code",
      foreignField: "countryCode",
      as: "orders"
    }
  },
  {
    $project: {
      _id: 0,
      country: "$name",
      orderCount: { $size: "$orders" },
      totalRevenue: { $sum: "$orders.amount" }
    }
  }
])
```

## Practical Use Case - Testing Pipeline Logic

Test aggregation logic without needing a populated collection:

```javascript
db.aggregate([
  {
    $documents: [
      { item: "apple", qty: 5, price: 1.20 },
      { item: "banana", qty: 10, price: 0.50 },
      { item: "cherry", qty: 3, price: 2.00 }
    ]
  },
  {
    $addFields: {
      subtotal: { $multiply: ["$qty", "$price"] },
      taxAmount: { $multiply: ["$qty", "$price", 0.08] }
    }
  },
  {
    $group: {
      _id: null,
      orderTotal: { $sum: "$subtotal" },
      totalTax: { $sum: "$taxAmount" }
    }
  }
])
```

## Generating a Range of Numbers

Use `$documents` with a literal array to create numeric ranges, or combine `$range` with other stages:

```javascript
db.aggregate([
  { $documents: [{}] },
  {
    $project: {
      numbers: { $range: [0, 10] }
    }
  },
  { $unwind: "$numbers" },
  {
    $project: {
      value: "$numbers",
      squared: { $multiply: ["$numbers", "$numbers"] }
    }
  }
])
```

## Summary

The `$documents` stage enables inline document generation within aggregation pipelines, making it valuable for joining with static reference data, ensuring complete output for all categories (even with no matching records), testing pipeline logic, and generating number or date sequences. It is a clean alternative to maintaining small reference collections and simplifies lookup patterns that need guaranteed coverage of all categories.
