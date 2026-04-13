# How to Use $skip and $limit for Pagination in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pagination, $skip, $limit, NoSQL

Description: Learn how to implement pagination in MongoDB aggregation pipelines using $skip and $limit, and understand the performance implications at scale.

---

## What Are $skip and $limit?

The `$skip` stage skips a specified number of documents before passing the remainder downstream. The `$limit` stage restricts the number of documents passed to the next stage. Together, they enable offset-based pagination.

```javascript
{ $skip: numberOfDocumentsToSkip }
{ $limit: maximumNumberOfDocuments }
```

## Basic Pagination Pattern

Page 1 (first 10 items):

```javascript
db.products.aggregate([
  { $sort: { createdAt: -1 } },
  { $skip: 0 },
  { $limit: 10 }
])
```

Page 2:

```javascript
db.products.aggregate([
  { $sort: { createdAt: -1 } },
  { $skip: 10 },
  { $limit: 10 }
])
```

Page N:

```javascript
function getPage(page, pageSize) {
  return db.products.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize }
  ]);
}
```

## Pagination with Total Count

Use `$facet` to get both the page data and total count in one query:

```javascript
db.products.aggregate([
  { $match: { active: true } },
  {
    $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $sort: { name: 1 } },
        { $skip: 20 },
        { $limit: 10 }
      ]
    }
  },
  {
    $addFields: {
      total: { $arrayElemAt: ["$metadata.total", 0] }
    }
  },
  { $unset: "metadata" }
])
```

## $skip Performance Considerations

`$skip` must scan and discard all documents before the skip point. As the page number increases, performance degrades:

```text
Page 1  (skip 0):    fast
Page 10 (skip 90):   moderate
Page 100 (skip 990): slow
Page 1000 (skip 9990): very slow
```

For large offsets, use cursor-based (keyset) pagination instead.

## Cursor-Based Pagination (Better Performance)

Instead of `$skip`, use a range query on an indexed field:

```javascript
// Initial page
let lastSeenId = null;

// First page
db.products.aggregate([
  { $match: { active: true } },
  { $sort: { _id: 1 } },
  { $limit: 10 }
])

// Subsequent pages - pass the _id of the last document from the previous page
db.products.aggregate([
  {
    $match: {
      active: true,
      _id: { $gt: lastSeenId }  // cursor condition
    }
  },
  { $sort: { _id: 1 } },
  { $limit: 10 }
])
```

This approach scales to millions of pages with constant performance.

## $limit in Non-Pagination Contexts

`$limit` is also useful for "top N" queries:

```javascript
// Top 5 selling products
db.products.aggregate([
  { $sort: { unitsSold: -1 } },
  { $limit: 5 }
])

// Sample 1 random document
db.products.aggregate([
  { $sample: { size: 1 } }
])
```

## $skip and $limit After $group

Paginate grouped results:

```javascript
db.orders.aggregate([
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $sort: { totalSpent: -1 } },
  { $skip: 0 },
  { $limit: 20 }
])
```

## Combining with $match for Pre-Filtering

Always filter before skip/limit to reduce work:

```javascript
// GOOD: filter first, then paginate the smaller result set
db.orders.aggregate([
  { $match: { status: "completed", year: 2024 } },
  { $sort: { orderDate: -1 } },
  { $skip: offset },
  { $limit: pageSize }
])

// BAD: paginate the full collection then filter
db.orders.aggregate([
  { $skip: offset },
  { $limit: pageSize },
  { $match: { status: "completed", year: 2024 } }  // wrong order
])
```

## Index Support

Ensure your sort field is indexed for optimal `$sort` + `$skip` + `$limit` performance:

```javascript
db.products.createIndex({ active: 1, createdAt: -1 })
```

## Summary

`$skip` and `$limit` provide straightforward offset-based pagination in MongoDB aggregation pipelines. While simple to implement, `$skip` performance degrades with large offsets - use cursor-based pagination for deep pagination at scale. Always filter with `$match` before paginating and ensure appropriate indexes support your sort criteria.
