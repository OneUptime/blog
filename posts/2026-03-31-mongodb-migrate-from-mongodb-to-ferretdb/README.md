# How to Migrate from MongoDB to FerretDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, FerretDB, Migration, PostgreSQL, Database

Description: Migrate your MongoDB data and application to FerretDB using mongodump, mongorestore, and compatibility validation steps.

---

## Why Migrate to FerretDB?

Organizations move to FerretDB to escape MongoDB's Server Side Public License (SSPL), reduce licensing costs, or consolidate on PostgreSQL infrastructure they already operate. FerretDB speaks the MongoDB wire protocol, so most application code requires no changes.

## Migration Overview

The migration has three phases:
1. Compatibility check - validate that your queries work in FerretDB
2. Data migration - export from MongoDB and import into FerretDB
3. Cutover - update connection strings and monitor

## Phase 1 - Compatibility Check

Before migrating data, test your most common queries against FerretDB using a sample dataset:

```bash
# Start FerretDB locally for testing
docker run -d --name ferretdb \
  -p 27017:27017 \
  -e FERRETDB_POSTGRESQL_URL=postgres://user:pass@postgres:5432/ferretdb \
  ghcr.io/ferretdb/ferretdb:latest
```

Run your application's test suite pointed at FerretDB. Pay attention to:

```text
- Aggregation pipeline operators ($lookup, $facet, $bucket)
- Update operators ($bit, $currentDate)
- Index types (hashed, 2dsphere, text)
- Transactions across multiple collections
```

Document any failures and decide whether to work around them or keep specific collections in MongoDB.

## Phase 2 - Data Export from MongoDB

Use `mongodump` to export your data in BSON format:

```bash
mongodump \
  --uri "mongodb://user:pass@mongo-host:27017/mydb" \
  --out /tmp/mongo-backup \
  --gzip
```

For large collections, dump collection by collection:

```bash
mongodump \
  --uri "mongodb://user:pass@mongo-host:27017/mydb" \
  --collection orders \
  --out /tmp/mongo-backup \
  --gzip
```

## Phase 3 - Import into FerretDB

FerretDB accepts `mongorestore` because it uses the same wire protocol:

```bash
mongorestore \
  --uri "mongodb://localhost:27017/mydb" \
  --dir /tmp/mongo-backup/mydb \
  --gzip \
  --drop
```

Verify document counts match:

```javascript
// On MongoDB
use mydb;
db.orders.countDocuments();

// On FerretDB (connect with mongosh)
use mydb;
db.orders.countDocuments();
```

## Recreate Indexes

`mongorestore` restores indexes automatically, but verify them:

```javascript
db.orders.getIndexes();
```

If any index types are unsupported (e.g., text indexes have limited support), recreate them using supported alternatives:

```javascript
// Recreate a basic compound index
db.orders.createIndex({ userId: 1, createdAt: -1 });
```

## Application Cutover

Update your application's connection string environment variable only - no driver code changes needed:

```bash
# Before
MONGODB_URI=mongodb://user:pass@mongo-host:27017/mydb

# After
MONGODB_URI=mongodb://localhost:27017/mydb
```

## Validate After Cutover

Run a document-level comparison to confirm data integrity:

```python
import pymongo

source = pymongo.MongoClient("mongodb://mongo-host:27017")
target = pymongo.MongoClient("mongodb://ferretdb-host:27017")

src_docs = list(source["mydb"]["orders"].find({}, {"_id": 1}).sort("_id", 1))
tgt_docs = list(target["mydb"]["orders"].find({}, {"_id": 1}).sort("_id", 1))

assert src_docs == tgt_docs, f"Mismatch: {len(src_docs)} vs {len(tgt_docs)}"
print("Document counts and IDs match.")
```

## Summary

Migrating from MongoDB to FerretDB involves three phases: checking query compatibility in a test environment, exporting data with `mongodump` and importing with `mongorestore`, and updating connection strings for cutover. Most applications require no code changes since FerretDB implements the MongoDB wire protocol. Validate data integrity and index recreations after cutover to ensure a smooth transition.
