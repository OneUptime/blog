# How to Migrate MongoDB Data Between Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Cluster, Mongodump, Atlas

Description: Learn how to migrate MongoDB data between clusters using mongodump/mongorestore, live migration, change streams, and Atlas Live Migration service.

---

## Migration Strategies Overview

```mermaid
flowchart TD
    Source["Source Cluster"] --> A[mongodump + mongorestore\n(offline / short downtime)]
    Source --> B[Change streams\n(near-zero downtime)]
    Source --> C[Atlas Live Migration\n(Atlas to Atlas, zero downtime)]
    Source --> D[mongoexport + mongoimport\n(JSON, small datasets)]
    A & B & C & D --> Dest["Destination Cluster"]
```

Choose the strategy based on acceptable downtime, dataset size, and source/destination types.

## Strategy 1: mongodump and mongorestore

Best for: moderate downtime is acceptable, full database migration.

```bash
# Step 1: dump the source cluster
mongodump \
  --uri "mongodb://source-host:27017" \
  --out /backup/dump \
  --oplog  # captures ongoing writes during the dump

# Step 2: restore to the destination cluster
mongorestore \
  --uri "mongodb://dest-host:27017" \
  --dir /backup/dump \
  --oplogReplay  # replays oplog entries captured during dump

# Atlas to Atlas migration
mongodump \
  --uri "mongodb+srv://user:pass@source.atlas.mongodb.net" \
  --out /backup/dump \
  --ssl

mongorestore \
  --uri "mongodb+srv://user:pass@dest.atlas.mongodb.net" \
  --dir /backup/dump \
  --ssl \
  --numInsertionWorkersPerCollection 4
```

## Strategy 2: mongodump a Specific Database or Collection

```bash
# Dump only one database
mongodump \
  --uri "mongodb://localhost:27017" \
  --db mydb \
  --out /backup/mydb_dump

# Dump only one collection
mongodump \
  --uri "mongodb://localhost:27017" \
  --db mydb \
  --collection orders \
  --out /backup/orders_dump

# Dump with a query filter (e.g., recent data only)
mongodump \
  --uri "mongodb://localhost:27017" \
  --db mydb \
  --collection events \
  --query '{"createdAt":{"$gte":{"$date":"2026-01-01T00:00:00Z"}}}' \
  --out /backup/recent_events

# Restore a single collection
mongorestore \
  --uri "mongodb://dest-host:27017" \
  --nsInclude "mydb.orders" \
  /backup/orders_dump
```

## Strategy 3: Live Migration with Change Streams (Near-Zero Downtime)

This approach syncs data with low latency by tailing the source change stream while also copying existing documents.

```javascript
const { MongoClient } = require("mongodb");

const sourceClient = new MongoClient(process.env.SOURCE_URI);
const destClient   = new MongoClient(process.env.DEST_URI);

await sourceClient.connect();
await destClient.connect();

const sourceDb = sourceClient.db("mydb");
const destDb   = destClient.db("mydb");

async function migrateCollectionLive(collectionName) {
  const sourceCol = sourceDb.collection(collectionName);
  const destCol   = destDb.collection(collectionName);

  // Step 1: record the current resume token before copying existing data
  const changeStream = sourceCol.watch([], { fullDocument: "updateLookup" });

  // Initialize the cursor to obtain the initial resume token
  await changeStream.tryNext();
  const resumeToken = changeStream.resumeToken;
  await changeStream.close();

  // Step 2: bulk copy all existing documents
  console.log(`Copying existing documents from ${collectionName}...`);
  let count = 0;
  const cursor = sourceCol.find({});

  const BATCH = 1000;
  let batch = [];

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH) {
      await destCol.insertMany(batch, { ordered: false }).catch(() => {});
      count += batch.length;
      batch = [];
      process.stdout.write(`\rCopied: ${count}`);
    }
  }
  if (batch.length > 0) {
    await destCol.insertMany(batch, { ordered: false }).catch(() => {});
    count += batch.length;
  }
  console.log(`\nInitial copy done: ${count} documents`);

  // Step 3: replay changes that occurred during the copy
  console.log("Replaying changes...");
  const replayStream = sourceCol.watch([], {
    resumeAfter:  resumeToken,
    fullDocument: "updateLookup"
  });

  for await (const change of replayStream) {
    await applyChange(destCol, change);
  }
}

async function applyChange(destCol, change) {
  const { operationType, documentKey, fullDocument, updateDescription } = change;

  if (operationType === "insert") {
    await destCol.insertOne(fullDocument).catch(() => {});
  } else if (operationType === "update" || operationType === "replace") {
    await destCol.replaceOne({ _id: documentKey._id }, fullDocument, { upsert: true });
  } else if (operationType === "delete") {
    await destCol.deleteOne({ _id: documentKey._id });
  }
}
```

## Strategy 4: Atlas Live Migration Service

For Atlas-to-Atlas migrations MongoDB provides a managed Live Migration tool with zero-downtime support.

```text
Steps:
1. In Atlas UI go to the destination project.
2. Create a new cluster.
3. Click Cluster > Migrate Data to this Cluster.
4. Choose "Migrate from MongoDB Atlas".
5. Provide the source cluster connection string and credentials.
6. Atlas handles the initial sync and continuous replication.
7. When ready: click "Start Cutover" to switch traffic to the new cluster.
8. The process pauses incoming writes briefly for the final sync.
```

## Strategy 5: mongoexport and mongoimport (Small Datasets)

```bash
# Export all collections from a database as JSON
for collection in orders users products events; do
  mongoexport \
    --uri "mongodb://source-host:27017/mydb" \
    --collection "$collection" \
    --out "${collection}.ndjson"
done

# Import to destination
for collection in orders users products events; do
  mongoimport \
    --uri "mongodb://dest-host:27017/mydb" \
    --collection "$collection" \
    --file "${collection}.ndjson"
done
```

## Step-by-Step Migration Checklist

```text
Before migration:
[ ] Document all existing indexes (db.collection.getIndexes())
[ ] Note collection options (capped, validation, timeseries)
[ ] Record document counts per collection
[ ] Export users and roles (mongodump --db admin)

During migration:
[ ] Put the source cluster in read-only mode (if offline migration)
[ ] Run mongodump with --oplog
[ ] Run mongorestore with --oplogReplay
[ ] Re-create indexes that were not dumped (--noIndexRestore if needed)

After migration:
[ ] Verify document counts match
[ ] Spot-check documents in key collections
[ ] Re-create any views, capped collections, or schema validation rules
[ ] Test application against destination cluster
[ ] Switch application connection string
[ ] Monitor for errors in destination cluster logs
```

## Verify Migration Completeness

```javascript
// Compare document counts on source and destination
async function verifyMigration(sourceDb, destDb, collections) {
  const results = [];

  for (const coll of collections) {
    const [srcCount, dstCount] = await Promise.all([
      sourceDb.collection(coll).countDocuments(),
      destDb.collection(coll).countDocuments()
    ]);

    results.push({
      collection: coll,
      source:     srcCount,
      dest:       dstCount,
      match:      srcCount === dstCount
    });
  }

  results.forEach((r) => {
    const icon = r.match ? "OK" : "MISMATCH";
    console.log(`${icon} ${r.collection}: src=${r.source}, dst=${r.dest}`);
  });

  return results.every((r) => r.match);
}
```

## Summary

Migrating MongoDB data between clusters depends on the acceptable downtime. Use `mongodump --oplog` and `mongorestore --oplogReplay` for a straightforward migration with brief downtime. Use change streams to build a near-zero-downtime continuous replication layer that replays changes during the initial bulk copy. For Atlas-to-Atlas migrations use the built-in Atlas Live Migration wizard. Always verify document counts, re-create views and validation rules, and test the application against the destination cluster before switching the connection string.
