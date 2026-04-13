# How to Use New Features in MongoDB 8.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoDB 8.0, Queryable Encryption, Query Shape, Performance

Description: Explore MongoDB 8.0's key improvements including enhanced Queryable Encryption, query shape analysis, and performance enhancements with practical examples.

---

## MongoDB 8.0 Overview

MongoDB 8.0, released in 2024, delivers significant performance improvements and feature enhancements:

- **Improved Queryable Encryption** - range queries on encrypted fields (GA)
- **Query Shape** - better query analysis and plan caching
- **Bulk write performance** - up to 54% faster bulk inserts
- **Improved time series** - enhanced compression and query planning
- **Atlas Search improvements** - integrated with core engine
- **Reduced replication lag** - improved oplog application

## Enhanced Queryable Encryption with Range Queries

MongoDB 8.0 makes range queries on encrypted fields generally available. In MongoDB 6.0, only equality queries were supported on encrypted fields.

```javascript
const { MongoClient } = require("mongodb")
const crypto = require("crypto")

const localMasterKey = crypto.randomBytes(96)

const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: { local: { key: localMasterKey } },
    encryptedFieldsMap: {
      "finance.transactions": {
        fields: [
          {
            path: "amount",
            bsonType: "double",
            queries: [
              {
                queryType: "range",
                // Range query settings (MongoDB 8.0)
                min: 0,
                max: 1000000,
                precision: 2,
                sparsity: 1,
                trimFactor: 6
              }
            ]
          },
          {
            path: "accountId",
            bsonType: "string",
            queries: [{ queryType: "equality" }]
          }
        ]
      }
    }
  }
})
```

### Range Queries on Encrypted Fields

```javascript
await encryptedClient.connect()
const db = encryptedClient.db("finance")

// Insert transactions with encrypted amounts
await db.collection("transactions").insertMany([
  { accountId: "ACC-001", amount: 1500.00, date: new Date() },
  { accountId: "ACC-001", amount: 250.50, date: new Date() },
  { accountId: "ACC-002", amount: 8000.00, date: new Date() }
])

// Range query on encrypted amount field - works in MongoDB 8.0!
const highValueTxns = await db.collection("transactions").find({
  amount: { $gte: 1000, $lte: 10000 }  // range on encrypted field
}).toArray()
console.log(`Found ${highValueTxns.length} transactions`)
// Server only sees ciphertext, never the actual amounts
```

## Query Shape and Plan Cache Improvements

MongoDB 8.0 improves query plan caching through better query shape analysis:

```javascript
// Query shape groups similar queries together for plan reuse
// These queries share the same shape: { status: <string>, userId: <string> }
db.orders.find({ status: "pending", userId: "user1" })
db.orders.find({ status: "shipped", userId: "user2" })

// Inspect plan cache
db.orders.getPlanCache().list()
// Now includes shapeHash for better cache hit analysis

// Clear plan cache for a specific query shape
db.orders.getPlanCache().clearPlansByQuery({ status: "pending" })
```

## Bulk Write Performance Improvements

MongoDB 8.0 significantly improves bulk insert throughput:

```javascript
// MongoDB 8.0 bulk writes are up to 54% faster for large batches
const documents = Array.from({ length: 100000 }, (_, i) => ({
  _id: i,
  value: Math.random(),
  category: `cat-${i % 10}`,
  timestamp: new Date()
}))

console.time("bulk-insert")
await db.collection("data").insertMany(documents, { ordered: false })
console.timeEnd("bulk-insert")
// Significantly faster than previous versions
```

## Improved Time Series Queries

MongoDB 8.0 adds better query planning for time series collections:

```javascript
// Create time series collection (works the same, performs better)
db.createCollection("metrics", {
  timeseries: {
    timeField: "timestamp",
    metaField: "host",
    granularity: "seconds"
  }
})

// Range scans on time series benefit from improved query planner
db.metrics.find({
  "host.region": "us-east",
  timestamp: {
    $gte: ISODate("2024-06-01"),
    $lt: ISODate("2024-06-08")
  }
}).explain("executionStats")
// Look for improved IXSCAN plans on time series
```

## $percentile Aggregation Operator

The `$percentile` operator (introduced in MongoDB 7.0) enables statistical aggregations:

```javascript
// Calculate P50, P95, P99 latencies
db.apiLogs.aggregate([
  { $match: { date: { $gte: ISODate("2024-06-01") } } },
  {
    $group: {
      _id: "$endpoint",
      p50: { $percentile: { input: "$latencyMs", p: [0.5], method: "approximate" } },
      p95: { $percentile: { input: "$latencyMs", p: [0.95], method: "approximate" } },
      p99: { $percentile: { input: "$latencyMs", p: [0.99], method: "approximate" } },
      avgLatency: { $avg: "$latencyMs" }
    }
  },
  { $sort: { p99: -1 } }
])
```

## $median Operator

A shorthand for the 50th percentile:

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: "$region",
      medianRevenue: {
        $median: {
          input: "$revenue",
          method: "approximate"
        }
      }
    }
  }
])
```

## Checking MongoDB 8.0 Version and FCV

```javascript
// Verify version
db.adminCommand({ buildInfo: 1 }).version
// "8.0.x"

// Set feature compatibility to 8.0 after upgrade
db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true })

// Verify FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// { "featureCompatibilityVersion": { "version": "8.0" } }
```

## Upgrade Considerations

```text
Before upgrading to MongoDB 8.0:
1. Ensure you are on MongoDB 7.0 with FCV 7.0 set
2. Review deprecated operator list in MongoDB 8.0 release notes
3. Test your aggregation pipelines for compatibility with 8.0 query planner changes
4. Drivers: update to MongoDB Driver 6.x or later for full 8.0 support
5. Queryable Encryption range queries require driver and libmongocrypt updates
```

## Summary

MongoDB 8.0 delivers range queries on encrypted fields, making Queryable Encryption practical for financial and compliance workloads. Performance improvements include up to 54% faster bulk writes, better query plan caching with shape analysis, and improved time series query planning. The `$percentile` and `$median` operators (introduced in MongoDB 7.0) simplify latency and distribution analysis in aggregation pipelines.
