# How to Design Schemas for Read-Heavy Workloads in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Design, Performance, Index, Read Optimization

Description: Design MongoDB schemas optimized for read-heavy workloads by embracing denormalization, covered queries, and strategic index placement.

---

## Read-Heavy Workload Characteristics

Read-heavy applications - content sites, dashboards, product catalogs - issue many more reads than writes. Schema design should optimize for fast document retrieval, often at the expense of write efficiency.

## Denormalize Data for Single-Document Reads

When a page needs product name, category name, and seller name, embedding them in the product document eliminates three round trips.

```javascript
{
  _id: ObjectId(),
  sku: "LAPTOP-001",
  name: "ProBook 15 Laptop",
  price: 999.99,
  stock: 42,
  category: { _id: ObjectId("cat1"), name: "Electronics", slug: "electronics" },
  seller: { _id: ObjectId("seller1"), name: "TechStore", rating: 4.8 }
}
```

The product listing page reads one document and has everything it needs.

## Use Covered Queries

A covered query is served entirely by an index without reading the document. Define indexes that include the projection fields.

```javascript
// Create index covering the query AND the projection
db.products.createIndex(
  { "category._id": 1, price: 1, name: 1, sku: 1 }
);

// This query is covered - never touches document storage
db.products.find(
  { "category._id": categoryId },
  { _id: 0, name: 1, sku: 1, price: 1 }
).sort({ price: 1 });
```

Verify with `explain("executionStats")` and check for `IXSCAN` with `totalDocsExamined: 0`.

## Pre-Computed Aggregations

For expensive aggregations run repeatedly (e.g., daily stats), precompute and store results.

```javascript
// Run nightly to precompute stats
const stats = await db.orders.aggregate([
  { $match: { date: { $gte: startOfDay, $lt: endOfDay } } },
  {
    $group: {
      _id: "$productId",
      totalSales: { $sum: "$amount" },
      orderCount: { $count: {} }
    }
  }
]).toArray();

await db.dailyStats.insertMany(stats.map(s => ({
  ...s,
  date: startOfDay,
  computedAt: new Date()
})));
```

Dashboard queries hit `dailyStats` instead of scanning `orders`.

## Compound Indexes for Sorted Pagination

Read-heavy list views need efficient sorted pagination. Design indexes to support the exact sort and filter combination.

```javascript
// Index for "active posts sorted by publishedAt descending"
db.posts.createIndex({ status: 1, publishedAt: -1 });

// Efficient keyset pagination
db.posts.find(
  { status: "published", publishedAt: { $lt: lastSeenDate } }
).sort({ publishedAt: -1 }).limit(20);
```

Avoid skip-based pagination for large offsets - it scans all skipped documents.

## Read Replicas for Scaling Reads

Direct long-running analytics queries to secondary replica set members to keep primaries responsive.

```javascript
// Node.js - route heavy read to secondary
const result = await db.collection("events")
  .find({ type: "pageview", date: { $gte: weekAgo } })
  .readPreference("secondary")
  .toArray();
```

## Summary

Read-heavy MongoDB schemas succeed by embedding related data for single-document access, building covered query indexes, and precomputing expensive aggregations. For large-scale read traffic, route heavy queries to replica set secondaries to keep primary write performance unaffected.
