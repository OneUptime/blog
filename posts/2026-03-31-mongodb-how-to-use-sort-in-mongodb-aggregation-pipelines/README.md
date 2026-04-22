# How to Use $sort in MongoDB Aggregation Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $sort, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $sort aggregation stage to order documents in a pipeline by one or more fields, in ascending or descending order.

---

## What Is the $sort Stage?

The `$sort` stage reorders documents in the aggregation pipeline according to specified sort criteria. It accepts a document specifying fields to sort on and their direction: `1` for ascending and `-1` for descending.

```javascript
{ $sort: { field1: 1, field2: -1 } }
```

## Basic Example

Sort products by price ascending:

```javascript
db.products.aggregate([
  { $sort: { price: 1 } }
])
```

Sort by price descending (most expensive first):

```javascript
db.products.aggregate([
  { $sort: { price: -1 } }
])
```

## Sorting by Multiple Fields

When sorting by multiple fields, MongoDB sorts by the first field, then breaks ties using subsequent fields:

```javascript
db.orders.aggregate([
  {
    $sort: {
      status: 1,       // alphabetical first
      createdAt: -1    // then newest first within each status
    }
  }
])
```

## Sorting After $group

Sort aggregated results:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$country",
      totalOrders: { $sum: 1 },
      totalRevenue: { $sum: "$amount" }
    }
  },
  {
    $sort: { totalRevenue: -1 }
  },
  { $limit: 10 }
])
```

Top 10 countries by revenue.

## Sorting by Computed Fields

Sort by fields added in previous stages:

```javascript
db.products.aggregate([
  {
    $addFields: {
      profitMargin: {
        $divide: [
          { $subtract: ["$price", "$cost"] },
          "$price"
        ]
      }
    }
  },
  {
    $sort: { profitMargin: -1 }
  }
])
```

## Index-Backed Sorting

When `$sort` appears early in the pipeline (before stages that change document count like `$unwind` or `$group`), MongoDB can use an index to avoid an in-memory sort:

```javascript
// This can use an index on { status: 1, createdAt: -1 }
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $sort: { createdAt: -1 } },
  { $limit: 50 }
])
```

Create a supporting index:

```javascript
db.orders.createIndex({ status: 1, createdAt: -1 })
```

## Memory Limit for $sort

By default, `$sort` is limited to 100MB of RAM for in-memory sorting. For larger datasets, use `allowDiskUse`:

```javascript
db.logs.aggregate(
  [
    { $sort: { timestamp: -1 } }
  ],
  { allowDiskUse: true }
)
```

## Sorting Text Search Results by Score

When using `$search` (Atlas) or `$text`, sort by text score:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "mongodb aggregation" } } },
  {
    $addFields: {
      textScore: { $meta: "textScore" }
    }
  },
  { $sort: { textScore: -1 } }
])
```

## Sort Consistency

MongoDB's `$sort` does not guarantee a stable sort - documents with equal sort key values may be returned in any order. To ensure a deterministic order, include a unique field such as `_id` in your sort:

```javascript
// Sort by date, then by title, with _id as a tiebreaker for deterministic order
db.articles.aggregate([
  { $sort: { publishDate: -1, title: 1, _id: 1 } }
])
```

## $sort with $limit Optimization

MongoDB optimizes `$sort` followed immediately by `$limit` - it maintains a top-N heap rather than sorting all documents:

```javascript
// Optimized: only keeps the top 5 throughout the sort
db.products.aggregate([
  { $sort: { sales: -1 } },
  { $limit: 5 }
])
```

## Sorting Nested Fields

Use dot notation for nested field sorting:

```javascript
db.users.aggregate([
  { $sort: { "address.city": 1, "address.street": 1 } }
])
```

## Summary

The `$sort` stage is fundamental to ordered output in MongoDB aggregation. Placing it early in the pipeline enables index utilization, while placing it after `$group` sorts summary results. For large datasets without index support, use `allowDiskUse: true`. The `$sort` + `$limit` combination is automatically optimized to avoid full sort operations.
