# How to Migrate from MongoDB to Amazon DocumentDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DocumentDB, MongoDB, Migration, Database

Description: A practical guide to migrating your MongoDB workloads to Amazon DocumentDB, covering compatibility assessment, migration strategies, and common pitfalls to avoid.

---

Migrating from self-managed MongoDB to Amazon DocumentDB can simplify your operations dramatically, but it's not a simple lift-and-shift. DocumentDB is API-compatible with MongoDB, not a drop-in replacement. You need to assess compatibility, choose the right migration approach, and validate thoroughly before cutting over production traffic.

This guide walks through the entire process from assessment to cutover. If you haven't set up DocumentDB yet, start with our [DocumentDB setup guide](https://oneuptime.com/blog/post/2026-02-12-amazon-documentdb-mongodb-compatible/view).

## Step 1: Assess Compatibility

Before migrating anything, you need to understand what works and what doesn't. DocumentDB supports most MongoDB operations but has some notable gaps.

Here's a quick checklist of features that might cause issues:

- **Retryable writes** - not supported, set `retryWrites=false` in your connection string
- **Client-side field-level encryption** - not supported
- **$graphLookup** - limited support
- **Multi-document ACID transactions** - supported on DocumentDB 4.0+
- **Change streams** - supported but behavior differs from MongoDB
- **Collation** - only partially supported

Run the Amazon DocumentDB compatibility tool against your existing MongoDB to get a detailed report.

```bash
# Clone the compatibility assessment tool
git clone https://github.com/awslabs/amazon-documentdb-tools.git
cd amazon-documentdb-tools/compat-tool

# Run the compatibility assessment against your MongoDB instance
python3 compat.py --uri "mongodb://user:pass@your-mongodb-host:27017" \
  --output-file compatibility-report.json
```

The tool analyzes your collections, indexes, and queries to flag anything that won't work on DocumentDB. Fix any critical incompatibilities before proceeding.

## Step 2: Analyze Your Indexes

Indexes are one of the most important things to get right. Export your current index definitions from MongoDB.

```javascript
// Run this in the mongo shell to list all indexes across all collections
const dbs = db.adminCommand({ listDatabases: 1 }).databases;
dbs.forEach(function(database) {
  const currentDb = db.getSiblingDB(database.name);
  const collections = currentDb.getCollectionNames();
  collections.forEach(function(col) {
    const indexes = currentDb[col].getIndexes();
    print(`\n--- ${database.name}.${col} ---`);
    indexes.forEach(function(idx) {
      printjson(idx);
    });
  });
});
```

DocumentDB supports most index types but doesn't support partial indexes or wildcard indexes in all cases. Review the output and note any indexes that need modification.

## Step 3: Choose Your Migration Approach

You have three main options depending on your downtime tolerance and data size.

### Option A: Offline Migration with mongodump/mongorestore

This is the simplest approach. You stop writes to MongoDB, dump the data, and restore it to DocumentDB. The downside is downtime proportional to your data size.

```bash
# Dump everything from your source MongoDB
mongodump \
  --uri="mongodb://user:pass@source-mongodb:27017" \
  --out=/data/mongo-backup

# Restore to DocumentDB
mongorestore \
  --uri="mongodb://dbadmin:password@your-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017" \
  --tls \
  --tlsCAFile=global-bundle.pem \
  --dir=/data/mongo-backup \
  --numInsertionWorkersPerCollection=4
```

The `numInsertionWorkersPerCollection` flag speeds up the restore by running parallel inserts. For large datasets, bump this up to 8 or even 16.

### Option B: Online Migration with AWS DMS

AWS Database Migration Service can replicate data from MongoDB to DocumentDB with minimal downtime. It supports both full load and change data capture (CDC) for ongoing replication.

```bash
# Create a DMS replication instance
aws dms create-replication-instance \
  --replication-instance-identifier mongo-to-docdb \
  --replication-instance-class dms.r5.large \
  --allocated-storage 100

# Create the source endpoint (MongoDB)
aws dms create-endpoint \
  --endpoint-identifier source-mongodb \
  --endpoint-type source \
  --engine-name mongodb \
  --server-name your-mongodb-host \
  --port 27017 \
  --username user \
  --password pass \
  --database-name mydb \
  --mongodb-settings "AuthType=password,AuthMechanism=scram-sha-1,NestingLevel=one"

# Create the target endpoint (DocumentDB)
aws dms create-endpoint \
  --endpoint-identifier target-docdb \
  --endpoint-type target \
  --engine-name docdb \
  --server-name your-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com \
  --port 27017 \
  --username dbadmin \
  --password password \
  --database-name mydb
```

Create a migration task that does a full load followed by ongoing CDC.

```bash
# Create the migration task with full load + CDC
aws dms create-replication-task \
  --replication-task-identifier mongo-to-docdb-task \
  --source-endpoint-arn arn:aws:dms:us-east-1:123456789:endpoint:source-mongodb \
  --target-endpoint-arn arn:aws:dms:us-east-1:123456789:endpoint:target-docdb \
  --replication-instance-arn arn:aws:dms:us-east-1:123456789:rep:mongo-to-docdb \
  --migration-type full-load-and-cdc \
  --table-mappings '{"rules":[{"rule-type":"selection","rule-id":"1","rule-name":"all-tables","object-locator":{"schema-name":"mydb","table-name":"%"},"rule-action":"include"}]}'
```

For more details on DMS, check out our [DMS replication guide](https://oneuptime.com/blog/post/2026-02-12-database-migration-service-dms-replication/view).

### Option C: Application-Level Migration

For complex cases where DMS doesn't handle your data correctly, you can build a dual-write pattern in your application.

```python
# Dual-write wrapper that sends writes to both MongoDB and DocumentDB
import pymongo

class DualWriteClient:
    def __init__(self, mongo_uri, docdb_uri):
        self.mongo = pymongo.MongoClient(mongo_uri)
        self.docdb = pymongo.MongoClient(
            docdb_uri,
            tls=True,
            tlsCAFile='global-bundle.pem'
        )

    def insert_one(self, db_name, collection_name, document):
        # Write to both databases
        mongo_result = self.mongo[db_name][collection_name].insert_one(document.copy())
        try:
            self.docdb[db_name][collection_name].insert_one(document.copy())
        except Exception as e:
            # Log the error but don't fail the primary write
            print(f"DocumentDB write failed: {e}")
        return mongo_result

    def find(self, db_name, collection_name, query, read_from='mongo'):
        # Read from whichever database you specify
        client = self.mongo if read_from == 'mongo' else self.docdb
        return client[db_name][collection_name].find(query)
```

## Step 4: Validate the Migration

After the data is loaded, validate that everything transferred correctly.

```python
# Validation script that compares document counts and samples data
import pymongo

mongo_client = pymongo.MongoClient('mongodb://user:pass@source-mongodb:27017')
docdb_client = pymongo.MongoClient(
    'mongodb://dbadmin:password@your-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017',
    tls=True,
    tlsCAFile='global-bundle.pem'
)

db_name = 'mydb'
mongo_db = mongo_client[db_name]
docdb_db = docdb_client[db_name]

# Compare document counts for each collection
for collection_name in mongo_db.list_collection_names():
    mongo_count = mongo_db[collection_name].count_documents({})
    docdb_count = docdb_db[collection_name].count_documents({})

    status = 'OK' if mongo_count == docdb_count else 'MISMATCH'
    print(f"{collection_name}: MongoDB={mongo_count}, DocumentDB={docdb_count} [{status}]")

# Spot-check individual documents
sample_docs = mongo_db['users'].find().limit(100)
for doc in sample_docs:
    docdb_doc = docdb_db['users'].find_one({'_id': doc['_id']})
    if docdb_doc is None:
        print(f"Missing document: {doc['_id']}")
    elif doc != docdb_doc:
        print(f"Document mismatch: {doc['_id']}")
```

## Step 5: Update Your Application Connection String

The connection string change is the simplest part, but there are subtleties. Make sure you include the TLS settings and disable retryable writes.

```python
# Old MongoDB connection string
# MONGO_URI = "mongodb://user:pass@mongo-host:27017/mydb?replicaSet=rs0"

# New DocumentDB connection string
DOCDB_URI = (
    "mongodb://dbadmin:password@"
    "your-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/mydb"
    "?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false&readPreference=secondaryPreferred"
)
```

Use `readPreference=secondaryPreferred` to spread reads across your replicas.

## Step 6: Cutover Strategy

Here's the cutover flow for an online migration.

```mermaid
graph TD
    A[Start DMS full load + CDC] --> B[Validate data counts match]
    B --> C[Run application tests against DocumentDB]
    C --> D[Switch application reads to DocumentDB]
    D --> E[Monitor for errors]
    E --> F{Errors?}
    F -->|Yes| G[Roll back reads to MongoDB]
    F -->|No| H[Switch writes to DocumentDB]
    H --> I[Stop DMS replication]
    I --> J[Decommission MongoDB]
```

The key is to switch reads first. If reads work correctly, switch writes. Keep MongoDB running for a few days after cutover as a safety net in case you need to roll back.

## Common Migration Pitfalls

A few things that bite people during migration:

**ObjectId ordering** - DocumentDB generates ObjectIds differently. If your application relies on ObjectId ordering for pagination, this could break.

**Connection pooling** - DocumentDB has lower connection limits than self-managed MongoDB. Monitor your `DatabaseConnections` metric and adjust your pool settings.

**Write concern** - DocumentDB always uses `w: majority` regardless of what you specify. This is actually safer but means single-node write performance may be slightly different.

**Index builds** - Large index builds on DocumentDB can take longer than on MongoDB since they always run in the background. Plan for this during migration.

## Wrapping Up

Migrating from MongoDB to DocumentDB is achievable for most workloads, but it requires careful planning. Run the compatibility tool early, test thoroughly, and use a staged cutover approach. The operational benefits of a fully managed service are significant, but only if the migration itself goes smoothly.
