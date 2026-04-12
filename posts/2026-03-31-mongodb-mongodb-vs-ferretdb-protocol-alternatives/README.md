# MongoDB vs FerretDB: MongoDB Protocol Alternatives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, FerretDB, PostgreSQL, Open Source, Database

Description: Compare MongoDB and FerretDB, an open-source MongoDB-compatible database backed by PostgreSQL, covering compatibility, performance, and licensing trade-offs.

---

## Overview

FerretDB is an open-source database that speaks the MongoDB wire protocol but stores data in PostgreSQL under the hood. It was created in response to MongoDB's Server Side Public License (SSPL), which restricts cloud providers from offering MongoDB as a service. FerretDB aims to be a drop-in replacement for MongoDB workloads that want a fully open-source stack.

## Wire Protocol Compatibility

FerretDB accepts standard MongoDB drivers and connection strings. No application code change is needed if you are using basic CRUD operations.

```javascript
// Same driver code works for both MongoDB and FerretDB
const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017/mydb");

const db = client.db("mydb");
await db.collection("products").insertOne({ name: "Widget", price: 9.99 });
const product = await db.collection("products").findOne({ name: "Widget" });
console.log(product);
```

You can switch from MongoDB to FerretDB by changing only the connection string:

```bash
# MongoDB
MONGO_URI=mongodb://mongo-host:27017/mydb

# FerretDB (PostgreSQL backend)
MONGO_URI=mongodb://ferretdb-host:27017/mydb?authMechanism=SCRAM-SHA-256
```

## Backend Storage

FerretDB translates MongoDB operations into SQL and stores documents as JSONB in PostgreSQL. This gives you PostgreSQL's mature ACID guarantees, replication, and tooling.

```sql
-- FerretDB stores documents as JSONB in PostgreSQL
SELECT _jsonb FROM mydb.products WHERE _jsonb->>'name' = 'Widget';
```

MongoDB stores data natively in BSON using WiredTiger, which is optimized for document access patterns and horizontal sharding.

## Compatibility Limitations

FerretDB does not yet support all MongoDB features. As of early 2026, notable gaps include:

```text
Unsupported or partial in FerretDB:
- Aggregation pipeline stages: $lookup, $facet
- Transactions (partial support)
- Change streams
- GridFS
- $text search indexes
- Atlas-specific features (Atlas Search, Atlas Vector Search)
```

MongoDB supports all these features natively. If your application relies on aggregation pipelines, change streams, or transactions, test carefully before migrating to FerretDB.

## Performance Comparison

MongoDB's native storage engine is faster for document operations because it avoids the BSON-to-SQL translation overhead. FerretDB adds latency at every operation due to JSON serialization and SQL query generation.

```text
Approximate latency comparison (simple find, single document):
- MongoDB: ~0.5-2ms
- FerretDB (PostgreSQL): ~2-5ms
```

For write-heavy or aggregation-heavy workloads, the overhead becomes more pronounced.

## Licensing and Deployment

MongoDB Community Edition uses SSPL, which restricts cloud SaaS providers. FerretDB uses Apache 2.0, making it fully open source without commercial restrictions.

```bash
# Run FerretDB with Docker
docker run -d --name ferretdb \
  -e FERRETDB_POSTGRESQL_URL=postgres://user:pass@pg-host/ferretdb \
  -p 27017:27017 \
  ghcr.io/ferretdb/ferretdb
```

## When to Use Each

Choose FerretDB when: you want a fully open-source (Apache 2.0) MongoDB-compatible database, your workload is basic CRUD, you already operate PostgreSQL infrastructure, or you need to avoid SSPL licensing.

Choose MongoDB when: you need full feature support including aggregations, change streams, transactions, Atlas Search, and maximum performance.

## Summary

FerretDB is a compelling open-source alternative for simple MongoDB workloads, especially if your team already runs PostgreSQL. For production workloads requiring advanced aggregation, change streams, or Atlas features, MongoDB remains the more capable option. Evaluate your feature requirements against FerretDB's compatibility matrix before committing to a migration.
