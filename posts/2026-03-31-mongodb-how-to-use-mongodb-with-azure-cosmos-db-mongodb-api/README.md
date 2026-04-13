# How to Use MongoDB with Azure Cosmos DB (MongoDB API)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Azure, Cosmos DB, Cloud, Compatibility

Description: Learn how to connect and work with Azure Cosmos DB for MongoDB, understand its compatibility level, and migrate data from MongoDB to Cosmos DB.

---

## What Is Azure Cosmos DB for MongoDB?

Azure Cosmos DB for MongoDB is a fully managed database service from Microsoft that implements the MongoDB wire protocol. Applications using MongoDB drivers can connect to Cosmos DB without code changes. It offers global distribution, automatic scaling with Request Units (RUs), and multi-region writes.

Current API compatibility: MongoDB 3.2, 3.6, 4.0, 4.2, 5.0, and 6.0 (select the version when creating your Cosmos DB account).

## Getting a Connection String

In the Azure Portal:

1. Navigate to your Cosmos DB account
2. Select **Connection String** in the left menu
3. Copy the **Primary Connection String**

It looks like:

```text
mongodb://your-account:base64password==@your-account.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@your-account@
```

## Connecting with Node.js

```javascript
const { MongoClient } = require("mongodb")

const connectionString = process.env.COSMOS_DB_CONNECTION_STRING

const client = new MongoClient(connectionString, {
  // Cosmos DB requires these settings
  tls: true,
  retryWrites: false,  // disabled by default in Cosmos DB
  maxIdleTimeMS: 120000
})

await client.connect()
const db = client.db("myDatabase")
console.log("Connected to Cosmos DB")
```

## Connecting with Python

```python
from pymongo import MongoClient
import os

connection_string = os.environ.get("COSMOS_DB_CONNECTION_STRING")

client = MongoClient(
    connection_string,
    retryWrites=False,
    serverSelectionTimeoutMS=10000
)

db = client["myDatabase"]
print("Collections:", db.list_collection_names())
```

## Creating Collections with Sharding

Cosmos DB requires all collections to be sharded (they call it a partition key). For unsharded behavior, use `_id` as the shard key:

```javascript
// Create a sharded collection (required in Cosmos DB)
db.runCommand({
  customAction: "CreateCollection",
  collection: "orders",
  shardKey: "customerId"  // partition key for distribution
})

// For unsharded behavior, use _id as the partition key
db.runCommand({
  customAction: "CreateCollection",
  collection: "products",
  shardKey: "_id"
})
```

For best performance, choose a partition key with high cardinality and even distribution.

## Running Basic Operations

Standard CRUD works the same as MongoDB:

```javascript
// Insert
await db.collection("orders").insertOne({
  customerId: "CUST-123",
  items: [{ sku: "WIDGET-A", qty: 2, price: 29.99 }],
  total: 59.98,
  status: "pending",
  createdAt: new Date()
})

// Query
const orders = await db.collection("orders").find({
  customerId: "CUST-123",
  status: "pending"
}).toArray()

// Update
await db.collection("orders").updateOne(
  { _id: orderId },
  { $set: { status: "shipped" } }
)

// Aggregation
const summary = await db.collection("orders").aggregate([
  { $match: { status: "shipped" } },
  { $group: { _id: "$customerId", orderCount: { $sum: 1 } } }
]).toArray()
```

## Understanding Request Units (RUs)

Cosmos DB charges based on provisioned throughput (Request Units) and consumed storage (per GB):

```javascript
// Every read/write consumes RUs
// You can see RU cost in the response headers

// Using mongosh with diagnostics
db.runCommand({ getLastRequestStatistics: 1 })
// Returns: { "_t": "GetRequestStatisticsResponse", "ok": 1, "CommandName": "find",
//            "RequestCharge": 2.83, "RequestDurationInMilliSeconds": 4 }
```

Monitor and scale RUs in the Azure Portal under **Scale** settings.

## Supported and Unsupported Features

```text
SUPPORTED:
- CRUD operations
- Most aggregation stages: $match, $group, $project, $lookup, $sort, etc.
- Indexes: single field, compound, text, 2dsphere
- Transactions (single shard only in most tiers)
- Change streams (limited support)

NOT SUPPORTED / LIMITED:
- $setWindowFields (window functions)
- Time series collections
- Retryable writes (supported on API 4.0+ with EnableMongoRetryableWrites capability enabled)
- $unionWith in all cases
- Bulk write operations have some limitations
- Full-text search uses Cosmos DB's own search, not Atlas Search
- db.command() - many admin commands not available
```

## Migrating from MongoDB to Cosmos DB

Use Azure Database Migration Service or `mongodump`/`mongorestore`:

```bash
# Step 1: Export from MongoDB
mongodump \
  --uri "mongodb+srv://user:pass@atlas.mongodb.net/mydb" \
  --out ./dump

# Step 2: Import to Cosmos DB
mongorestore \
  --uri "mongodb://account:pass==@account.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false" \
  --ssl \
  ./dump
```

For large migrations, use Azure's native DMS service for online migration with minimal downtime.

## Performance Tips

```javascript
// 1. Always include the partition key in queries for cross-partition cost savings
db.orders.find({ customerId: "CUST-123", status: "pending" })
// customerId is the partition key - this is a single-partition query

// 2. Create indexes before loading data
db.orders.createIndex({ createdAt: 1 })
db.orders.createIndex({ status: 1, createdAt: -1 })

// 3. Use projections to reduce RU cost
db.orders.find({ customerId: "CUST-123" }, { status: 1, total: 1 })
```

## Summary

Azure Cosmos DB for MongoDB uses the MongoDB wire protocol, allowing existing MongoDB drivers to connect with minimal changes (disable `retryWrites`, handle `ssl`). All collections require a partition key for distribution. The service charges in Request Units, so including partition keys in queries and using projections reduces costs. For advanced MongoDB 5.0+ features, use MongoDB Atlas instead.
