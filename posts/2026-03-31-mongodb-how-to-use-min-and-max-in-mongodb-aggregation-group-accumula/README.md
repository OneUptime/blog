# How to Use $min and $max in MongoDB Aggregation Group Accumulators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $min, $max, Group Accumulators, Analytics

Description: Learn how to use $min and $max accumulators in MongoDB $group stages to find minimum and maximum values within grouped documents.

---

## Overview

`$min` and `$max` are group accumulator operators in MongoDB's aggregation framework. They return the minimum and maximum values of a specified expression across all documents in a group. Both operators handle numeric, string, and date values, and can operate on arrays in projection stages.

## Basic $min and $max in $group

```javascript
db.temperatures.aggregate([
  {
    $group: {
      _id: { city: "$city", month: { $month: "$recordedAt" } },
      minTemp: { $min: "$temperature" },
      maxTemp: { $max: "$temperature" },
      tempRange: {
        $subtract: [{ $max: "$temperature" }, { $min: "$temperature" }]
      }
    }
  }
])
```

Wait - `$subtract` with `$max` and `$min` won't work directly in `$group`. Here is the correct pattern:

```javascript
db.temperatures.aggregate([
  {
    $group: {
      _id: { city: "$city", month: { $month: "$recordedAt" } },
      minTemp: { $min: "$temperature" },
      maxTemp: { $max: "$temperature" }
    }
  },
  {
    $addFields: {
      tempRange: { $subtract: ["$maxTemp", "$minTemp"] }
    }
  }
])
```

## Finding Earliest and Latest Dates

`$min` and `$max` work with dates, returning the earliest and latest timestamps:

```javascript
db.userSessions.aggregate([
  { $sort: { userId: 1 } },
  {
    $group: {
      _id: "$userId",
      firstLogin: { $min: "$loginAt" },
      lastLogin: { $max: "$loginAt" },
      totalSessions: { $sum: 1 }
    }
  }
])
```

## Practical Example - Product Price Range by Category

```javascript
db.products.insertMany([
  { category: "electronics", name: "Laptop", price: 999.99 },
  { category: "electronics", name: "Phone", price: 699.99 },
  { category: "electronics", name: "Tablet", price: 449.99 },
  { category: "clothing", name: "Shirt", price: 29.99 },
  { category: "clothing", name: "Jacket", price: 149.99 }
])

db.products.aggregate([
  {
    $group: {
      _id: "$category",
      minPrice: { $min: "$price" },
      maxPrice: { $max: "$price" },
      productCount: { $sum: 1 }
    }
  },
  {
    $project: {
      category: "$_id",
      minPrice: 1,
      maxPrice: 1,
      priceSpread: { $subtract: ["$maxPrice", "$minPrice"] },
      productCount: 1
    }
  }
])
```

## $min and $max on Arrays in $project

When used in `$project`, `$min` and `$max` return the minimum or maximum element of an array:

```javascript
db.students.insertMany([
  { name: "Alice", testScores: [85, 92, 78, 95, 88] },
  { name: "Bob", testScores: [70, 65, 88, 72, 81] }
])

db.students.aggregate([
  {
    $project: {
      name: 1,
      lowestScore: { $min: "$testScores" },
      highestScore: { $max: "$testScores" },
      scoreRange: {
        $subtract: [{ $max: "$testScores" }, { $min: "$testScores" }]
      }
    }
  }
])
```

## Finding Extreme Values with Full Document Context

Use `$sort` + `$group` with `$first`/`$last` when you need the entire document at the min/max:

```javascript
// Get the cheapest product per category with full details
db.products.aggregate([
  { $sort: { category: 1, price: 1 } },
  {
    $group: {
      _id: "$category",
      cheapestProduct: { $first: "$$ROOT" },
      mostExpensiveProduct: { $last: "$$ROOT" },
      minPrice: { $min: "$price" },
      maxPrice: { $max: "$price" }
    }
  }
])
```

## Multi-dimensional Min/Max

Find the record with multiple extreme conditions:

```javascript
db.salesReps.aggregate([
  {
    $group: {
      _id: "$region",
      topQuota: { $max: "$salesQuota" },
      bottomQuota: { $min: "$salesQuota" },
      topRevenue: { $max: "$actualRevenue" },
      bottomRevenue: { $min: "$actualRevenue" }
    }
  },
  {
    $addFields: {
      quotaSpread: { $subtract: ["$topQuota", "$bottomQuota"] },
      revenueSpread: { $subtract: ["$topRevenue", "$bottomRevenue"] }
    }
  }
])
```

## $min and $max with String Values

Both operators use MongoDB's BSON comparison order for non-numeric types:

```javascript
db.employees.aggregate([
  {
    $group: {
      _id: "$department",
      firstAlphabetically: { $min: "$lastName" },
      lastAlphabetically: { $max: "$lastName" }
    }
  }
])
```

## Summary

`$min` and `$max` return the smallest and largest values in a group respectively, supporting numeric, date, and string types. In `$project` stages they operate on arrays within a document. Always follow `$group` with an `$addFields` or `$project` stage to compute derived metrics like range or spread. Pairing `$min`/`$max` with `$sort` and `$first`/`$last` lets you retrieve the complete document at the extreme value rather than just the scalar.
