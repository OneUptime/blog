# How to Create a Compound Index with Mixed Sort Orders in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Indexing, Compound Index, Query Optimization, Performance

Description: Learn how to create compound indexes with mixed ascending and descending sort orders in MongoDB to optimize multi-field sort queries.

---

## What Is a Compound Index with Mixed Sort Orders?

In MongoDB, a compound index covers multiple fields. By default, fields are indexed in ascending order (`1`), but you can combine ascending and descending orders across fields. This matters when your queries sort by multiple fields in different directions.

For example, a query sorting by `lastName` ascending and `createdAt` descending requires an index that matches that exact sort pattern to avoid an in-memory sort.

## Creating a Compound Index with Mixed Sort Orders

Use `createIndex()` with `1` for ascending and `-1` for descending on each field:

```javascript
db.users.createIndex({ lastName: 1, createdAt: -1 })
```

This index supports queries like:

```javascript
db.users.find({}).sort({ lastName: 1, createdAt: -1 })
```

But it does NOT efficiently support:

```javascript
db.users.find({}).sort({ lastName: 1, createdAt: 1 })
```

## Understanding Index Prefix Reversal

MongoDB can use a compound index in reverse order if all sort directions are flipped. So an index on `{ lastName: 1, createdAt: -1 }` also supports:

```javascript
db.users.find({}).sort({ lastName: -1, createdAt: 1 })
```

However, it cannot support arbitrary combinations like `{ lastName: 1, createdAt: 1 }` when the index is `{ lastName: 1, createdAt: -1 }`.

## Practical Example: E-commerce Order Listing

Suppose you have an `orders` collection and want to list orders by `customerId` ascending and `orderDate` descending:

```javascript
db.orders.createIndex({ customerId: 1, orderDate: -1 })
```

Query that uses this index efficiently:

```javascript
db.orders.find({ customerId: "cust_001" }).sort({ orderDate: -1 })
```

Verify with `explain()`:

```javascript
db.orders.find({ customerId: "cust_001" })
  .sort({ orderDate: -1 })
  .explain("executionStats")
```

Look for `IXSCAN` in the winning plan and confirm `totalDocsExamined` matches `totalDocsReturned`.

## Three-Field Compound Index with Mixed Orders

You can mix sort orders across three or more fields:

```javascript
db.products.createIndex({ category: 1, price: -1, rating: -1 })
```

This supports:

```javascript
db.products.find({ category: "electronics" })
  .sort({ price: -1, rating: -1 })
```

## Equality, Sort, Range (ESR) Rule

When designing compound indexes with mixed sorts, apply the ESR rule:
1. Place equality fields first
2. Sort fields in the middle
3. Range fields last

```javascript
// Query: find active users in a region, sort by score desc, filter by age range
db.users.createIndex({ region: 1, score: -1, age: 1 })

db.users.find({ region: "US", age: { $gte: 18, $lte: 65 } })
  .sort({ score: -1 })
```

## Checking If Your Index Is Used

```javascript
db.orders.find({ customerId: "cust_001" })
  .sort({ orderDate: -1 })
  .explain("executionStats").queryPlanner.winningPlan
```

If you see `SORT` stage with `memUsage`, the index is not being used for sorting and you may need to revise field order or sort directions.

## Summary

Compound indexes with mixed sort orders are essential for queries that sort by multiple fields in different directions. Follow the ESR rule, match your index sort directions precisely to query sort directions, and use `explain()` to confirm MongoDB uses an `IXSCAN` rather than an in-memory sort. Creating the right mixed-order index eliminates expensive sort operations and dramatically improves query performance.
