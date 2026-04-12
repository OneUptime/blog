# How to Paginate Aggregation Results in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pagination, Pipeline, Performance

Description: Learn how to paginate MongoDB aggregation pipeline results using $skip and $limit, and how to implement efficient cursor-based pagination for large datasets.

---

## Overview

Pagination lets you retrieve large result sets in manageable chunks. In MongoDB aggregation pipelines, you can use `$skip` and `$limit` stages for offset-based pagination, or use range queries for cursor-based pagination that scales better at depth.

## Offset-Based Pagination with $skip and $limit

The simplest approach uses `$skip` to jump past earlier pages and `$limit` to cap the page size:

```javascript
const page = 3;
const pageSize = 20;

db.products.aggregate([
  { $match: { category: "electronics" } },
  { $sort: { price: -1 } },
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize }
])
```

Always add `$sort` before `$skip` and `$limit` to ensure a consistent ordering.

## Getting Total Count Alongside Results

Use `$facet` to run both the paginated results and a count in a single query:

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $facet: {
      metadata: [
        { $count: "total" }
      ],
      data: [
        { $sort: { price: -1 } },
        { $skip: 40 },
        { $limit: 20 }
      ]
  }}
])
```

The result includes both `metadata[0].total` and the `data` array.

## Cursor-Based Pagination for Large Datasets

Offset-based pagination degrades at high page numbers because MongoDB must scan and discard all skipped documents. Cursor-based pagination uses the last seen value as a bookmark:

```javascript
// First page - no cursor
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $sort: { _id: 1 } },
  { $limit: 20 }
])

// Subsequent pages - pass last _id as cursor
const lastId = ObjectId("64a1b2c3d4e5f60718293a4b");
db.products.aggregate([
  { $match: {
      category: "electronics",
      _id: { $gt: lastId }
  }},
  { $sort: { _id: 1 } },
  { $limit: 20 }
])
```

This approach avoids scanning skipped documents and performs consistently regardless of page depth.

## Pagination with a Compound Sort Key

When sorting by a non-unique field like price, use a compound sort with `_id` to break ties:

```javascript
const lastPrice = 299.99;
const lastId = ObjectId("64a1b2c3d4e5f60718293a4b");

db.products.aggregate([
  { $match: {
      category: "electronics",
      $or: [
        { price: { $lt: lastPrice } },
        { price: lastPrice, _id: { $gt: lastId } }
      ]
  }},
  { $sort: { price: -1, _id: 1 } },
  { $limit: 20 }
])
```

## Performance Tips

- Always sort on indexed fields. Without an index, `$sort` performs an in-memory sort, which is limited to 100 MB of RAM unless `allowDiskUse` is enabled.
- Prefer cursor-based pagination for datasets exceeding 10,000 documents.
- Use `$match` as early in the pipeline as possible to reduce the number of documents processed by `$skip` and `$limit`.

## Summary

MongoDB aggregation pagination can be done with `$skip` and `$limit` for simple use cases, or with cursor-based range queries for better performance at scale. Use `$facet` when you need both paginated data and a total count in a single round trip. Always sort on indexed fields to avoid expensive in-memory sorts.
