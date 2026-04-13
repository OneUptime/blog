# How to Use MongoDB with AWS DocumentDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS, DocumentDB, Cloud, Compatibility

Description: Learn the key differences between MongoDB and AWS DocumentDB, how to connect, and what to consider when migrating or integrating with DocumentDB.

---

## What Is AWS DocumentDB?

AWS DocumentDB is a managed document database service from Amazon that implements a subset of the MongoDB API. It is not MongoDB - it uses a different storage engine but exposes a MongoDB-compatible wire protocol, allowing most MongoDB drivers and tools to connect to it.

Key differences:
- DocumentDB supports MongoDB 3.6, 4.0, and 5.0 API compatibility (not 6.x or 7.x features)
- Replication and storage work differently under the hood
- Some MongoDB operators and features are not supported
- No MongoDB Atlas features (no Atlas Search, no Atlas Stream Processing)
- Managed by AWS: automatic backups, scaling, patching

## Connecting to DocumentDB

DocumentDB requires TLS by default. Download the AWS certificate bundle:

```bash
# Download the AWS DocumentDB TLS certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Connect with `mongosh`:

```bash
mongosh "mongodb://username:password@your-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred"
```

## Connecting with Node.js Driver

```javascript
const { MongoClient } = require("mongodb")

const client = new MongoClient(
  "mongodb://username:password@your-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com:27017",
  {
    tls: true,
    tlsCAFile: "global-bundle.pem",
    replicaSet: "rs0",
    readPreference: "secondaryPreferred",
    retryWrites: false  // DocumentDB does not support retryable writes
  }
)

await client.connect()
const db = client.db("myDatabase")
const users = await db.collection("users").find({}).toArray()
```

Note: `retryWrites: false` is required for DocumentDB - retryable writes are not supported.

## Connecting with Python PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://username:password@your-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com:27017",
    tls=True,
    tlsCAFile="global-bundle.pem",
    replicaSet="rs0",
    readPreference="secondaryPreferred",
    retryWrites=False
)

db = client["myDatabase"]
docs = list(db["users"].find({}))
```

## Supported and Unsupported Features

```text
SUPPORTED in DocumentDB:
- Basic CRUD operations
- Aggregation: $match, $group, $project, $sort, $limit, $skip, $unwind, $lookup
- Indexes: single field, compound, text, partial, sparse
- Transactions (within a single replica set)
- Change streams (collection, database, and cluster level)

NOT SUPPORTED:
- $setWindowFields (window functions - MongoDB 5.0+)
- Time series collections
- Clustered collections
- Retryable writes
- $unionWith
- Atlas Search / Atlas Vector Search
- MongoDB 6.x, 7.x features
```

## Running Basic Operations

Once connected, operations look identical to MongoDB:

```javascript
// Insert
await db.collection("orders").insertOne({
  orderId: "ORD-001",
  customerId: "CUST-123",
  amount: 150.00,
  status: "pending",
  createdAt: new Date()
})

// Find
const order = await db.collection("orders").findOne({ orderId: "ORD-001" })

// Update
await db.collection("orders").updateOne(
  { orderId: "ORD-001" },
  { $set: { status: "shipped" } }
)

// Aggregation
const summary = await db.collection("orders").aggregate([
  { $match: { status: "shipped" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
]).toArray()
```

## Migrating Data from MongoDB to DocumentDB

Use AWS Database Migration Service (DMS) for online migration, or mongodump/mongorestore for offline:

```bash
# Export from MongoDB Atlas
mongodump \
  --uri "mongodb+srv://user:pass@atlas-cluster.mongodb.net/mydb" \
  --out ./dump

# Import to DocumentDB
mongorestore \
  --host "docdb-cluster.us-east-1.docdb.amazonaws.com:27017" \
  --username user --password pass \
  --dir ./dump \
  --tls --tlsCAFile global-bundle.pem
```

## DocumentDB Elastic Clusters

DocumentDB Elastic Clusters support sharding and can scale to petabytes:

```bash
# Connect to an Elastic Cluster endpoint
mongosh "mongodb://user:pass@your-cluster.docdb-elastic.us-east-1.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem"
```

Elastic Clusters have a different feature set from standard DocumentDB clusters.

## When to Choose DocumentDB vs MongoDB Atlas

```text
Choose DocumentDB when:
- You are heavily invested in AWS and prefer fully managed AWS services
- You need AWS-native security (VPC, IAM, KMS integration)
- Your workload uses only MongoDB 5.0 or earlier API features
- Cost optimization through AWS reserved pricing matters

Choose MongoDB Atlas when:
- You need MongoDB 5.x+ features (time series, window functions, etc.)
- You want Atlas Search, Atlas Stream Processing, or Atlas Data Federation
- Multi-cloud or non-AWS deployments are required
- You need full MongoDB wire protocol compatibility
```

## Summary

AWS DocumentDB implements up to the MongoDB 5.0 API with TLS required by default and no support for retryable writes. Connect using standard MongoDB drivers with `retryWrites: false` and a TLS certificate. While DocumentDB works well for applications using core MongoDB CRUD and aggregation features, applications requiring MongoDB 6.x+ features or Atlas-specific services should use MongoDB Atlas instead.
