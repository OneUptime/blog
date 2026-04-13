# How to Use FerretDB as a MongoDB-Compatible Alternative

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, FerretDB, Open Source, PostgreSQL, Compatibility

Description: Learn how to set up and use FerretDB as a MongoDB-compatible open source database backed by PostgreSQL, and understand its current compatibility level.

---

## What Is FerretDB?

FerretDB is an open source MongoDB-compatible database proxy that translates the MongoDB wire protocol to SQL queries running on PostgreSQL (or SQLite). It lets you use MongoDB drivers, tools, and queries without a MongoDB license.

Key features:
- Apache 2.0 licensed - fully open source
- Uses PostgreSQL or SQLite as the storage backend
- Compatible with MongoDB 5.0 wire protocol
- Works with existing MongoDB drivers (Node.js, Python, Go, etc.)
- Supports most basic CRUD and aggregation operations

## Setting Up FerretDB with Docker

The easiest way to run FerretDB locally:

```bash
# Start FerretDB with PostgreSQL backend
docker compose up -d

# docker-compose.yml
```

```yaml
# docker-compose.yml
version: '3'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ferretdb
      POSTGRES_PASSWORD: ferretdb_password
      POSTGRES_DB: ferretdb
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ferretdb:
    image: ghcr.io/ferretdb/ferretdb:latest
    ports:
      - "27017:27017"
    environment:
      FERRETDB_POSTGRESQL_URL: "postgres://ferretdb:ferretdb_password@postgres/ferretdb"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Connecting to FerretDB

FerretDB uses the standard MongoDB connection string:

```bash
# Connect with mongosh
mongosh "mongodb://localhost:27017/mydb"

# No authentication needed by default for local development
# Production: configure TLS and authentication
```

## Connecting with MongoDB Drivers

FerretDB works transparently with existing MongoDB drivers:

```javascript
// Node.js - same code as MongoDB
const { MongoClient } = require("mongodb")

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()
const db = client.db("mydb")

// Insert
await db.collection("users").insertOne({
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date()
})

// Query
const users = await db.collection("users").find({ name: "Alice" }).toArray()
console.log(users)
```

```python
# Python - same code as MongoDB
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]

db.products.insert_one({"name": "Widget", "price": 9.99})
products = list(db.products.find({"price": {"$lt": 10}}))
```

## Basic Operations

Standard CRUD operations work exactly like MongoDB:

```javascript
// Insert
db.orders.insertMany([
  { customerId: "C001", amount: 150.00, status: "pending" },
  { customerId: "C002", amount: 89.99, status: "completed" }
])

// Query with filter
db.orders.find({ status: "pending" })

// Update
db.orders.updateOne(
  { customerId: "C001" },
  { $set: { status: "shipped" }, $inc: { shipCount: 1 } }
)

// Delete
db.orders.deleteMany({ status: "cancelled" })

// Aggregation
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])
```

## FerretDB Compatibility Status

FerretDB does not support all MongoDB features. Check current compatibility:

```text
SUPPORTED:
- insertOne, insertMany, find, updateOne, updateMany, deleteOne, deleteMany
- Most query operators: $eq, $gt, $lt, $in, $and, $or, $not, $exists, $type
- Most update operators: $set, $unset, $inc, $push, $pull, $addToSet
- Basic aggregation: $match, $group, $project, $sort, $limit, $skip, $unwind
- Indexes: single field, compound, text (limited)
- findOneAndUpdate, findOneAndDelete

NOT SUPPORTED (as of early 2026):
- Transactions (multi-document)
- Change streams
- $lookup (joins) - partial/in-progress
- Capped collections
- Time series collections
- Atlas Search
- $setWindowFields
- Retryable writes
```

Always check the FerretDB compatibility docs at ferretdb.io for the current state.

## Checking Data in PostgreSQL

One advantage of FerretDB: you can inspect data directly in PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U ferretdb -d ferretdb

# FerretDB stores documents as JSONB in PostgreSQL
# The MongoDB database name maps to a PostgreSQL schema
# Table names include a hash suffix (e.g., orders_a1b2c3d4)
# Look up actual table names from the metadata table:
SELECT _jsonb FROM mydb._ferretdb_database_metadata;

# Then query using the actual table name
SELECT * FROM mydb.orders_<hash_suffix> LIMIT 5;
```

Note: The internal PostgreSQL storage format is an implementation detail that may change between FerretDB versions. Refer to the FerretDB docs for the current storage layout.

## When to Choose FerretDB

```text
Use FerretDB when:
- You want open source / avoid MongoDB licensing
- Running MongoDB Community or Atlas is not feasible
- Your workload uses basic CRUD and simple aggregations
- You want the option to query data directly with SQL
- PostgreSQL is already part of your infrastructure

Choose MongoDB when:
- You need transactions, change streams, or advanced features
- High-performance workloads requiring WiredTiger optimizations
- Atlas-specific features (Search, Stream Processing, etc.)
- Full MongoDB compatibility is required
```

## Running Tests Against FerretDB

Use FerretDB's Docker image in CI to test your application:

```yaml
# GitHub Actions example
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: testdb

  ferretdb:
    image: ghcr.io/ferretdb/ferretdb:latest
    ports:
      - "27017:27017"
    env:
      FERRETDB_POSTGRESQL_URL: "postgres://user:pass@postgres/testdb"
```

## Summary

FerretDB provides a MongoDB-compatible wire protocol layer backed by PostgreSQL, enabling use of standard MongoDB drivers and tools without a MongoDB license. It supports core CRUD and aggregation operations and is well-suited for applications with straightforward data access patterns. Advanced features like transactions, change streams, and `$lookup` have limited or no support, so evaluate FerretDB's compatibility page against your specific feature requirements before adopting it in production.
