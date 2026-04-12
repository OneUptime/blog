# New Features in MongoDB 8.0: Improved Queryable Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Query Shape, Feature, Version

Description: Explore MongoDB 8.0's key new features including improved Queryable Encryption with range queries and the Query Shape for plan cache management.

---

## Introduction

MongoDB 8.0 builds on 7.0 with significant performance improvements, expanded Queryable Encryption capabilities (range queries on encrypted fields exiting preview), query shape improvements for the plan cache, and enhanced bulk write operations. This post covers the most impactful changes for developers and operations teams.

## Improved Queryable Encryption with Range Queries

In MongoDB 7.0, Queryable Encryption range queries were available as a preview feature. MongoDB 8.0 makes encrypted range queries generally available with improved performance and reduced ciphertext expansion.

### Configuring Range Encryption with Tighter Bounds

```javascript
const encryptedFieldsMap = {
  "mydb.transactions": {
    fields: [
      {
        path: "amount",
        bsonType: "double",
        queries: {
          queryType: "range",
          min: 0,
          max: 1000000,
          precision: 2,
          sparsity: 1,
          trimFactor: 6
        }
      },
      {
        path: "transactionDate",
        bsonType: "date",
        queries: {
          queryType: "range",
          min: new Date("2020-01-01"),
          max: new Date("2030-12-31"),
          sparsity: 1
        }
      }
    ]
  }
};
```

The `trimFactor` parameter (new in 8.0) reduces ciphertext size and improves range query performance by trimming the internal tree structure.

### Running Encrypted Range Queries

```javascript
const transactions = encryptedClient.db("mydb").collection("transactions");

const results = await transactions.find({
  amount: { $gte: 500, $lte: 10000 }
}).toArray();
```

The query is processed against encrypted ciphertext on the server; decryption happens client-side.

## Query Shape and Plan Cache Management

MongoDB 8.0 introduces improvements to how the plan cache tracks and reuses query plans. The concept of a "query shape" - the structural fingerprint of a query independent of its parameter values - is now more precisely defined and exposed.

### Viewing Query Shapes in the Plan Cache

```javascript
db.orders.getPlanCache().list()
```

Each entry shows the query shape (the structure with parameter placeholders), the chosen plan, and performance stats.

### Clearing Plans for a Specific Shape

If a cached plan becomes suboptimal after data distribution changes, clear it:

```javascript
db.orders.getPlanCache().clear()
```

To clear plans selectively by query shape (visible in `explain` output):

```javascript
db.orders.getPlanCache().clearPlansByQuery(
  { status: "pending", createdAt: { $gte: ISODate() } },
  { createdAt: -1 },
  {}
)
```

### Setting Query Settings for a Query Shape

MongoDB 8.0 introduces `setQuerySettings` as the recommended way to control index usage for a query shape, replacing the deprecated `planCacheSetFilter` index filters:

```javascript
db.adminCommand({
  setQuerySettings: {
    find: "orders",
    filter: { status: { $eq: "pending" } },
    sort: { createdAt: -1 },
    $db: "mydb"
  },
  settings: {
    indexHints: {
      ns: { db: "mydb", coll: "orders" },
      allowedIndexes: [{ status: 1, createdAt: -1 }]
    }
  }
})
```

## Bulk Write Performance Improvements

MongoDB 8.0 introduces a new server-level `bulkWrite` command that can perform insert, update, and delete operations across multiple collections in a single request, reducing round trips and improving throughput:

```javascript
const result = await db.collection("events").bulkWrite([
  { insertOne: { document: { type: "click", userId: "u1", ts: new Date() } } },
  { updateOne: { filter: { userId: "u2" }, update: { $inc: { clicks: 1 } } } },
  { deleteOne: { filter: { userId: "u3", ts: { $lt: new Date(Date.now() - 86400000) } } } }
], { ordered: false });
```

Using `{ ordered: false }` allows MongoDB to execute operations in any order, enabling parallelization on sharded clusters for higher throughput.

## Summary

MongoDB 8.0 makes encrypted range queries on sensitive fields generally available with improved performance via the `trimFactor` parameter. Plan cache improvements give developers better visibility into query shapes and the new `setQuerySettings` command provides a persistent way to control index usage for specific query shapes. Enhanced bulk write performance benefits high-throughput workloads. Upgrading to MongoDB 8.0 is recommended for applications that rely on Queryable Encryption or require precise plan cache control.
