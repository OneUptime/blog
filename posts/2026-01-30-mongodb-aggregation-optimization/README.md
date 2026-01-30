# How to Build MongoDB Aggregation Pipeline Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, Database, NoSQL

Description: Optimize MongoDB aggregation pipelines with index utilization, stage ordering, memory management, and explain plans for production workloads.

---

Aggregation pipelines are one of MongoDB's most powerful features, but they can also become performance bottlenecks when not optimized properly. A poorly structured pipeline can scan millions of documents, consume excessive memory, and bring your application to a crawl. This guide walks through practical optimization techniques that make a real difference in production.

## How Aggregation Pipelines Execute

Before diving into optimization, it helps to understand how MongoDB processes pipelines. Each stage transforms documents and passes them to the next stage. The query optimizer can reorder certain stages and push operations closer to the data source when possible.

```mermaid
graph LR
    A[Collection] --> B[$match]
    B --> C[$project]
    C --> D[$group]
    D --> E[$sort]
    E --> F[$limit]
    F --> G[Results]

    style B fill:#90EE90
    style F fill:#90EE90
```

The stages highlighted in green are where optimization has the biggest impact. Getting documents filtered early and limiting output late saves the most work.

## Stage Ordering Matters

The order of stages dramatically affects performance. MongoDB can optimize some reordering automatically, but explicit ordering gives you more control.

### Put $match First

Always filter documents as early as possible. Every document that passes through the pipeline consumes CPU and memory.

```javascript
// Inefficient - processes all documents before filtering
db.orders.aggregate([
  { $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    as: "customer"
  }},
  { $unwind: "$customer" },
  { $match: { status: "completed", "customer.region": "US" } }
]);

// Optimized - filter orders first, then join
db.orders.aggregate([
  { $match: { status: "completed" } },  // Filter before expensive operations
  { $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    as: "customer"
  }},
  { $unwind: "$customer" },
  { $match: { "customer.region": "US" } }  // Filter joined data
]);
```

### Use $project Early to Reduce Document Size

Smaller documents move through the pipeline faster. Remove unnecessary fields before expensive operations.

```javascript
// Keep only fields needed for downstream stages
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $project: {
    customerId: 1,
    total: 1,
    items: 1,
    // Exclude large fields like 'metadata', 'auditLog', etc.
  }},
  { $group: {
    _id: "$customerId",
    totalSpent: { $sum: "$total" },
    orderCount: { $sum: 1 }
  }}
]);
```

### Place $limit and $skip Strategically

When combined with $sort, place $limit immediately after to allow MongoDB to optimize the sort operation.

```javascript
// MongoDB optimizes this into a top-k sort
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $sort: { sales: -1 } },
  { $limit: 10 }  // Only keeps top 10 during sort
]);
```

## Index Utilization in Pipelines

Aggregation pipelines can use indexes, but only under specific conditions. Understanding these rules helps you design pipelines that stay fast at scale.

### Stages That Can Use Indexes

Only these stages at the beginning of a pipeline can use indexes:

- `$match` (when first or after $sort)
- `$sort` (when first or after $match)
- `$geoNear` (must be first)

```javascript
// This pipeline uses the index on { status: 1, createdAt: -1 }
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $sort: { createdAt: -1 } },
  { $limit: 100 }
]);

// Verify index usage with explain
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $sort: { createdAt: -1 } },
  { $limit: 100 }
]);
```

### Creating Indexes for Aggregation

Design indexes specifically for your aggregation patterns.

```javascript
// For a pipeline that filters by status and groups by customerId
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: startDate } } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
]);

// Create a compound index covering the $match stage
db.orders.createIndex({ status: 1, createdAt: -1 });
```

### Covered Aggregations

Like queries, aggregations can be "covered" when all required fields exist in the index.

```javascript
// Create index with all needed fields
db.orders.createIndex({
  status: 1,
  customerId: 1,
  amount: 1
});

// This aggregation can be covered (no document fetch)
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
    _id: "$customerId",
    total: { $sum: "$amount" }
  }}
]);
```

## Memory Management

By default, each pipeline stage can use up to 100MB of RAM. Exceeding this limit causes an error unless you explicitly allow disk usage.

### Allow Disk Use for Large Datasets

```javascript
// Enable disk-based processing for memory-intensive operations
db.orders.aggregate([
  { $match: { year: 2024 } },
  { $group: { _id: "$productId", totalSales: { $sum: "$amount" } } },
  { $sort: { totalSales: -1 } }
], { allowDiskUse: true });
```

Disk-based processing is slower than in-memory, so it is better to reduce data volume through filtering and projection first.

### Reduce Memory with $bucket and $bucketAuto

Instead of grouping by every unique value, use buckets for numerical ranges.

```javascript
// Instead of grouping by exact age
db.users.aggregate([
  { $bucket: {
    groupBy: "$age",
    boundaries: [0, 18, 30, 45, 60, 100],
    default: "unknown",
    output: {
      count: { $sum: 1 },
      avgIncome: { $avg: "$income" }
    }
  }}
]);
```

## Optimizing $lookup Operations

`$lookup` (MongoDB's join) is often the most expensive stage. Several techniques can improve its performance.

### Index the Foreign Collection

Always have an index on the foreign field being joined.

```javascript
// Ensure index exists on the foreign collection
db.customers.createIndex({ _id: 1 });  // Usually exists by default

// For non-_id joins, create explicit index
db.customers.createIndex({ externalId: 1 });

db.orders.aggregate([
  { $lookup: {
    from: "customers",
    localField: "customerExternalId",
    foreignField: "externalId",  // Must be indexed
    as: "customer"
  }}
]);
```

### Use Pipeline Lookups for Filtered Joins

When you only need specific fields or filtered results from the foreign collection, use the pipeline form.

```javascript
// Fetch only active customers with limited fields
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $lookup: {
    from: "customers",
    let: { custId: "$customerId" },
    pipeline: [
      { $match: {
        $expr: { $eq: ["$_id", "$$custId"] },
        status: "active"  // Filter in the subpipeline
      }},
      { $project: { name: 1, email: 1 } }  // Limit returned fields
    ],
    as: "customer"
  }}
]);
```

### Avoid $lookup When Possible

Sometimes denormalization or application-level joins perform better than `$lookup`.

```javascript
// Consider storing frequently accessed data directly
// Instead of joining, embed customer name in order document
{
  _id: ObjectId("..."),
  customerId: ObjectId("..."),
  customerName: "John Doe",  // Denormalized for read performance
  items: [...]
}
```

## Using Explain for Pipeline Analysis

The `explain()` method reveals how MongoDB executes your pipeline.

```javascript
// Get execution statistics
const explanation = db.orders.explain("executionStats").aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]);

// Key metrics to examine
console.log("Execution time:", explanation.stages[0].$cursor.executionStats.executionTimeMillis);
console.log("Documents examined:", explanation.stages[0].$cursor.executionStats.totalDocsExamined);
console.log("Index used:", explanation.stages[0].$cursor.queryPlanner.winningPlan.inputStage?.indexName);
```

### What to Look For

| Metric | Good Sign | Problem Sign |
|--------|-----------|--------------|
| executionTimeMillis | Low relative to data size | Unexpectedly high |
| totalDocsExamined | Close to nReturned | Much higher than nReturned |
| stage | IXSCAN | COLLSCAN |
| usedDisk | false | true (unless expected) |

## Real-World Optimization Example

Here is a before-and-after showing cumulative optimizations on an analytics pipeline.

```javascript
// BEFORE: Slow pipeline (5+ seconds on 1M documents)
db.events.aggregate([
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $match: {
    eventType: "purchase",
    createdAt: { $gte: new Date("2024-01-01") },
    "user.country": "US"
  }},
  { $group: {
    _id: { month: { $month: "$createdAt" }, category: "$category" },
    revenue: { $sum: "$amount" },
    transactions: { $sum: 1 }
  }},
  { $sort: { revenue: -1 } }
], { allowDiskUse: true });

// AFTER: Optimized pipeline (200ms on same data)
// Step 1: Create supporting index
db.events.createIndex({ eventType: 1, createdAt: -1 });
db.users.createIndex({ _id: 1, country: 1 });

// Step 2: Reorder and optimize stages
db.events.aggregate([
  // Filter events first (uses index)
  { $match: {
    eventType: "purchase",
    createdAt: { $gte: new Date("2024-01-01") }
  }},
  // Project only needed fields before lookup
  { $project: { userId: 1, amount: 1, category: 1, createdAt: 1 } },
  // Optimized lookup with pipeline
  { $lookup: {
    from: "users",
    let: { uid: "$userId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$uid"] }, country: "US" } },
      { $project: { _id: 1 } }  // Only need to verify existence
    ],
    as: "user"
  }},
  // Filter out non-US users
  { $match: { "user.0": { $exists: true } } },
  // Group and aggregate
  { $group: {
    _id: { month: { $month: "$createdAt" }, category: "$category" },
    revenue: { $sum: "$amount" },
    transactions: { $sum: 1 }
  }},
  { $sort: { revenue: -1 } }
]);
```

## Optimization Checklist

Before deploying an aggregation pipeline to production, verify these items:

1. **$match is first** and uses an indexed field
2. **$project reduces document size** before expensive operations
3. **$lookup foreign fields are indexed**
4. **$sort combined with $limit** for top-k queries
5. **explain() shows IXSCAN**, not COLLSCAN
6. **allowDiskUse** is set only when necessary
7. **Memory usage is reasonable** for your infrastructure
8. **Pipeline runs in acceptable time** under expected load

## Summary

MongoDB aggregation pipeline optimization comes down to a few principles: filter early, project small, index strategically, and verify with explain. The order of stages matters more than most developers realize, and a few minutes spent reorganizing a pipeline can turn a multi-second query into a sub-second one. Use the explain output to guide your decisions, and always test optimizations against production-sized datasets.
