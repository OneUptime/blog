# How to Detect and Fix Data Corruption in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Integrity, Corruption, Validation, Recovery

Description: Learn how to detect MongoDB data corruption using validate, dbCheck, and mongod integrity checks, and how to recover from corruption using replica set secondaries or backups.

---

## What Causes Data Corruption in MongoDB?

Data corruption in MongoDB is rare but can result from hardware failures (disk errors, bad RAM), abrupt power loss without journaling, storage engine bugs, or incomplete file system operations. MongoDB uses journaling and WiredTiger checksums to protect against most corruption, but detection and recovery procedures are essential.

## Step 1: Run the validate Command

The `validate` command scans a collection's documents and indexes for inconsistencies:

```javascript
// Basic validation
db.orders.validate();

// Full validation (checks all index entries, slower)
db.orders.validate({ full: true });
```

Output to watch for:

```text
{
  "valid": false,
  "errors": ["..."],
  "warnings": ["..."],
  "corruptRecords": [...]
}
```

Run validation on a secondary to avoid impact on the primary:

```bash
mongosh --host secondary:27017 --eval "
  db.getSiblingDB('shop').orders.validate({ full: true })
"
```

## Step 2: Use dbCheck for Replica Set Consistency

`dbCheck` compares document hashes across all replica set members to detect divergence:

```javascript
db.adminCommand({
  dbCheck: "orders",
  minKey: MinKey,
  maxKey: MaxKey,
  maxCount: 10000,
  maxSize: 1048576
});
```

Check the health log for dbCheck results:

```javascript
db.getSiblingDB("local").system.healthlog
  .find({ severity: { $ne: "info" } })
  .sort({ when: -1 })
  .limit(20);
```

## Step 3: Check WiredTiger Integrity

On self-managed MongoDB, use the WiredTiger salvage procedure for corrupted data files. First, stop `mongod` gracefully, then run:

```bash
mongod --dbpath /data/db --repair
```

The `--repair` flag runs WiredTiger's salvage on corrupted collections and rebuilds indexes. Note: this can result in data loss on the corrupted node - use the replica set secondary as the source of truth.

## Step 4: Recover from a Replica Set Secondary

If one node is corrupted but others are healthy, the fastest recovery is to resync from a healthy secondary:

```bash
# On the corrupted node - stop mongod
systemctl stop mongod

# Clear the corrupted data directory
rm -rf /data/db/*

# Restart - MongoDB will automatically sync from another replica set member
systemctl start mongod
```

Monitor the sync:

```javascript
rs.status().members.filter(m => m.name === "corrupted-node:27017")[0];
// stateStr should go: STARTUP2 -> SECONDARY
```

## Step 5: Identify Corrupt Documents

If validation reports specific corrupt record IDs, fetch them to assess impact:

```javascript
const corruptIds = [ObjectId("..."), ObjectId("...")]; // from validate output
db.orders.find({ _id: { $in: corruptIds } });
```

If the documents cannot be read, restore them from a backup. Restore the collection to a temporary namespace, then copy the needed documents back:

```bash
# Restore the backup to a temporary collection
mongorestore \
  --host localhost --port 27017 \
  --db shop_restore_tmp \
  --collection orders \
  /path/to/backup/shop/orders.bson
```

Then copy the specific corrupt documents from the temporary collection:

```javascript
const corruptIds = [ObjectId("..."), ObjectId("...")];
db.getSiblingDB("shop_restore_tmp").orders
  .find({ _id: { $in: corruptIds } })
  .forEach(doc => {
    db.getSiblingDB("shop").orders.replaceOne(
      { _id: doc._id },
      doc,
      { upsert: true }
    );
  });

// Clean up
db.getSiblingDB("shop_restore_tmp").dropDatabase();
```

## Step 6: Enable Runtime Corruption Detection

Add application-level checksums for critical fields (covered separately). At the MongoDB level, ensure journaling is enabled:

```yaml
storage:
  journal:
    enabled: true
```

On Atlas, journaling is always enabled. WiredTiger block-level checksums are on by default.

## Summary

Detecting MongoDB data corruption starts with `db.collection.validate()` for per-collection integrity checks and `dbCheck` for cross-replica consistency verification. For self-managed deployments, `mongod --repair` can salvage WiredTiger files, but the safest recovery for a single corrupted node is clearing its data directory and letting MongoDB resync from healthy replica set members. Always restore specific corrupt documents from backups rather than attempting to repair them in place.
