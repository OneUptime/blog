# How to Query Archived Data Alongside Active Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Archive, Query, Aggregation, Atlas

Description: Learn how to query archived and active MongoDB data together using $unionWith, federated queries, and Atlas Data Federation for seamless data access.

---

## The Challenge of Querying Across Data Tiers

When you split data across active and archive collections (or Atlas Online Archive), you need a strategy to query both sources transparently. MongoDB provides several tools depending on your deployment type.

## Option 1: Using $unionWith for Same-Cluster Archives

For data archived to a separate collection on the same cluster, `$unionWith` combines results:

```javascript
// Query active orders and archived orders together
db.orders.aggregate([
  { $match: { customerId: "cust_123" } },
  {
    $unionWith: {
      coll: "orders_archive",
      pipeline: [
        { $match: { customerId: "cust_123" } }
      ]
    }
  },
  { $sort: { createdAt: -1 } },
  { $limit: 100 }
]);
```

Always push the `$match` inside the `$unionWith` pipeline to avoid scanning the entire archive collection.

## Option 2: Creating a View Over Multiple Collections

Create a MongoDB view that transparently unifies active and archive data:

```javascript
db.createView("orders_all", "orders", [
  {
    $unionWith: {
      coll: "orders_archive",
      pipeline: []
    }
  }
]);

// Now query the view as if it were a single collection
db.orders_all.find({ customerId: "cust_123" }).sort({ createdAt: -1 });
```

Views are computed on read - they don't store data and always reflect current state.

## Option 3: Atlas Data Federation for Online Archive Queries

When using Atlas Online Archive, data is moved to cloud object storage (S3 on AWS, Azure Blob Storage on Azure, or Google Cloud Storage on GCP). Query it through Atlas Data Federation:

```javascript
// Connect to your federated database endpoint
// The connection string is different from your cluster connection

// Query that transparently spans cluster + Online Archive
db.events.find({
  userId: "u123",
  timestamp: { $gte: ISODate("2023-01-01") }
}).sort({ timestamp: -1 });
```

Atlas routes the query to the cluster for recent data and to S3 for archived data automatically.

## Option 4: Application-Level Federation

For self-managed deployments with cold data on S3, combine results at the application layer:

```javascript
async function queryAllOrders(customerId, startDate, endDate) {
  // Query active collection
  const activeOrders = await db.collection("orders")
    .find({ customerId, createdAt: { $gte: startDate, $lte: endDate } })
    .toArray();

  // Query archive collection
  const archiveOrders = await db.collection("orders_archive")
    .find({ customerId, createdAt: { $gte: startDate, $lte: endDate } })
    .toArray();

  // Merge and sort
  return [...activeOrders, ...archiveOrders]
    .sort((a, b) => b.createdAt - a.createdAt);
}
```

## Indexing Strategy for Hybrid Queries

Ensure both collections have compatible indexes for the fields used in cross-collection queries:

```javascript
// Same index structure on both collections
const indexSpec = { customerId: 1, createdAt: -1 };
db.orders.createIndex(indexSpec);
db.orders_archive.createIndex(indexSpec);
```

Check index usage with explain:

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { customerId: "cust_123" } },
  { $unionWith: {
    coll: "orders_archive",
    pipeline: [{ $match: { customerId: "cust_123" } }]
  }}
]);
```

## Performance Tips

Keep cross-tier queries fast:

```javascript
// Limit date range to avoid full archive scan
db.orders.aggregate([
  {
    $match: {
      customerId: "cust_123",
      createdAt: { $gte: ISODate("2023-06-01"), $lt: ISODate("2024-01-01") }
    }
  },
  {
    $unionWith: {
      coll: "orders_archive",
      pipeline: [{
        $match: {
          customerId: "cust_123",
          createdAt: { $gte: ISODate("2022-01-01"), $lt: ISODate("2023-06-01") }
        }
      }]
    }
  },
  { $sort: { createdAt: -1 } },
  { $limit: 50 }
]);
```

Route queries to only the archive when the date range is clearly historical to avoid unnecessary active collection reads.

## Summary

Querying archived data alongside active data in MongoDB uses `$unionWith` for same-cluster collections, database views for transparent access, Atlas Data Federation for Online Archive queries, or application-level merging for external cold storage. Always push match predicates into `$unionWith` sub-pipelines and maintain consistent indexes across all tiers for acceptable query performance.
