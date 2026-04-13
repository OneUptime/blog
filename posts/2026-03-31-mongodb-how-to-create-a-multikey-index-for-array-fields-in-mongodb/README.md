# How to Create a Multikey Index for Array Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Multikey Index, Array, Query Optimization

Description: Learn how to create multikey indexes on array fields in MongoDB so queries on array element values can use indexes instead of full collection scans.

---

## Overview

A multikey index in MongoDB is an index on a field that contains an array. MongoDB automatically creates a multikey index when `createIndex()` is called on a field that holds an array value. The index stores a separate index entry for each element in the array, allowing efficient queries on individual array elements.

## Creating a Multikey Index

You create a multikey index the same way as a regular single field index - MongoDB detects the array and makes it multikey automatically:

```javascript
// Create an index on the "tags" array field
db.articles.createIndex({ tags: 1 })

// MongoDB will create a multikey index because "tags" contains arrays
db.articles.insertMany([
  { title: "MongoDB Basics", tags: ["mongodb", "database", "nosql"] },
  { title: "Indexing Guide", tags: ["mongodb", "indexes", "performance"] }
])
```

## Verifying It Is a Multikey Index

```javascript
// Use explain() to check if an index is multikey
db.articles.find({ tags: "mongodb" }).explain("executionStats")
// winningPlan.inputStage.stage will show "IXSCAN"
// winningPlan.inputStage.isMultiKey will be true

// Or use $indexStats to see multikey status
db.articles.aggregate([{ $indexStats: {} }])
// Each entry includes an "isMultiKey" field
```

## Querying with a Multikey Index

```javascript
// Find documents where the array contains a specific value
db.articles.find({ tags: "mongodb" })

// Find documents where the array contains any of several values
db.articles.find({ tags: { $in: ["mongodb", "nosql"] } })

// Find documents where the array contains all of several values
db.articles.find({ tags: { $all: ["mongodb", "indexes"] } })

// Range query on numeric arrays
db.products.find({ ratings: { $gte: 4 } })
```

## Multikey Index on Embedded Document Arrays

```javascript
db.orders.createIndex({ "items.productId": 1 })

db.orders.insertMany([
  {
    orderId: 1,
    items: [
      { productId: "P001", qty: 2, price: 29.99 },
      { productId: "P002", qty: 1, price: 49.99 }
    ]
  }
])

// This query uses the multikey index
db.orders.find({ "items.productId": "P001" })
```

## Compound Indexes with Array Fields

A compound index can include at most one array field (two array fields in the same compound index is not allowed):

```javascript
// This works - one array field in compound index
db.articles.createIndex({ tags: 1, publishedAt: -1 })

// This fails - two array fields in compound index
// db.articles.createIndex({ tags: 1, authors: 1 })  // Error!
```

## Practical Example - E-Commerce Product Tags

```javascript
db.products.insertMany([
  {
    name: "Running Shoes",
    categories: ["footwear", "sports", "running"],
    sizes: [7, 8, 9, 10, 11],
    price: 89.99
  },
  {
    name: "Basketball Sneakers",
    categories: ["footwear", "sports", "basketball"],
    sizes: [8, 9, 10, 11, 12],
    price: 129.99
  }
])

// Index on categories for category browsing
db.products.createIndex({ categories: 1 })

// Index on sizes for size filtering
db.products.createIndex({ sizes: 1 })

// Find all sports footwear in size 10
db.products.find({
  categories: { $all: ["footwear", "sports"] },
  sizes: 10
})
```

## Multikey Index Bounds and Performance

```javascript
// Understand index bounds
db.products.find({ sizes: { $gte: 9, $lte: 11 } }).explain("executionStats")
// indexBounds: { sizes: [ "[9, 11]" ] }
// Note: multikey indexes may examine more keys than needed due to array expansion
```

## Limitations of Multikey Indexes

```text
- Cannot create a compound multikey index with two or more array fields
- Multikey indexes cannot cover queries (cannot be used as covered indexes)
- Sharding: shard key cannot be a multikey index
- Text indexes on arrays are handled differently (use text index type)
- $elemMatch queries on arrays with multikey indexes work correctly
```

## Summary

Multikey indexes are automatically created when you call `createIndex()` on an array field, and they store one index entry per array element. They enable efficient queries on individual array values using `$in`, `$all`, and range operators. Compound multikey indexes are allowed but can include at most one array field. Multikey indexes cannot be used as covered indexes and are not eligible for shard keys.
