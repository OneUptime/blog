# How to Perform Point-in-Time Recovery in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Recovery, Database Administration

Description: Learn how to perform point-in-time recovery in MongoDB using oplog replay to restore a database to any specific moment after a full backup was taken.

---

## Overview

Point-in-time recovery (PITR) allows you to restore a MongoDB database to any specific moment in time, not just the exact point when a backup was taken. This is essential for recovering from accidental data deletion or corruption that occurred at a known time. In MongoDB, PITR is achieved by taking a full backup (via mongodump or filesystem snapshot) and then replaying the oplog to the desired point in time.

## How the Oplog Enables PITR

The oplog (operations log) is a capped collection in the `local` database that records every write operation. When replaying the oplog up to a specific timestamp, you can reconstruct the database state at any point covered by the oplog window.

```javascript
// Check oplog size and coverage
use local
db.oplog.rs.stats().maxSize   // Max size in bytes
db.oplog.rs.find().sort({$natural: 1}).limit(1)  // Oldest entry
db.oplog.rs.find().sort({$natural: -1}).limit(1) // Newest entry

// Check oplog window (how far back it goes)
let oldest = db.oplog.rs.find().sort({$natural: 1}).limit(1).next();
let newest = db.oplog.rs.find().sort({$natural: -1}).limit(1).next();
print("Oplog covers:", new Date(oldest.ts.t * 1000), "to", new Date(newest.ts.t * 1000));
```

## Step 1 - Back Up the Oplog with Your Database

When using mongodump, include the oplog to enable PITR:

```bash
# Dump with oplog - captures changes made during the dump
mongodump --uri "mongodb://admin:secret@localhost:27017"   --oplog   --out /backup/mongodb-$(date +%Y%m%d)
```

The `--oplog` flag includes oplog entries that occurred during the dump, ensuring consistency.

## Step 2 - Identify the Recovery Point

Determine the exact timestamp you want to recover to:

```javascript
// In mongosh, find the timestamp of a specific event
// For example, find when a collection was dropped
use admin
db.adminCommand({
  aggregate: 1,
  pipeline: [
    { $changeStream: { startAtOperationTime: new Timestamp(1774951200, 1) } }
  ],
  cursor: {}
})

// Or query the oplog directly for a time range
use local
db.oplog.rs.find({
  ts: {
    $gte: Timestamp(1774951200, 1),    // 2026-03-31 10:00:00 UTC
    $lte: Timestamp(1774954800, 1)     // 2026-03-31 11:00:00 UTC
  },
  op: "d"   // d = delete operations
}).limit(20)
```

Convert a human-readable date to a MongoDB Timestamp:

```javascript
// Convert date to Unix timestamp
let targetDate = new Date("2026-03-31T10:30:00Z");
let unixTimestamp = Math.floor(targetDate.getTime() / 1000);
print("Unix timestamp:", unixTimestamp);
print("MongoDB Timestamp:", new Timestamp(unixTimestamp, 1));
```

## Step 3 - Restore the Base Backup

```bash
# Create a new mongod instance for recovery (or use a test environment)
# First restore the base backup
mongorestore --uri "mongodb://localhost:27018"   --oplogReplay   /backup/mongodb-20260331/
```

The `--oplogReplay` flag replays the oplog that was captured during the dump.

## Step 4 - Replay Additional Oplog to Recovery Point

If you need to recover to a time after the backup, replay additional oplog entries:

```bash
# Dump oplog entries from the source for the recovery time range
mongodump --uri "mongodb://source-primary:27017"   --db local   --collection oplog.rs   --query '{"ts": {"$gt": {"$timestamp": {"t": 1774951200, "i": 1}}, "$lte": {"$timestamp": {"t": 1774954800, "i": 1}}}}'   --out /tmp/oplog-dump/

# Prepare oplog for replay (mongorestore expects oplog.bson at the dump root)
mkdir -p /backup/oplog-replay
mv /tmp/oplog-dump/local/oplog.rs.bson /backup/oplog-replay/oplog.bson

# Replay oplog up to the recovery point
mongorestore --uri "mongodb://localhost:27018"   --oplogReplay   --oplogLimit "1774954800:1"   /backup/oplog-replay/
```

## Using mongorestore with oplogLimit

The `--oplogLimit` flag stops replay at a specific timestamp:

```bash
# Restore and replay oplog up to a specific point in time
# Format: --oplogLimit "UNIX_TIMESTAMP:ORDINAL"
mongorestore --uri "mongodb://localhost:27018"   --oplogReplay   --oplogLimit "1774954800:1"   /backup/mongodb-20260331/
```

## Verifying Recovery

After restoration, verify the data is in the expected state:

```javascript
// Connect to restored instance and check data
use mydb

// Count documents
db.orders.countDocuments()

// Check timestamp of latest document
db.orders.find().sort({ updatedAt: -1 }).limit(1)

// Verify the deleted data is restored (if recovering from accidental deletion)
db.orders.countDocuments({ status: "deleted" })
```

## Best Practices for PITR

```bash
# 1. Take daily base backups
mongodump --uri "${MONGO_URI}" --oplog --out "/backup/daily/$(date +%Y%m%d)"

# 2. Monitor oplog size to ensure PITR window is sufficient
mongosh --eval '
  use local;
  let stats = db.oplog.rs.stats();
  let sizeMB = stats.size / 1024 / 1024;
  print("Oplog used:", sizeMB.toFixed(1), "MB of", (stats.maxSize/1024/1024).toFixed(1), "MB");
'

# 3. Increase oplog size if needed (via config)
# replication:
#   oplogSizeMB: 10240
```

## Summary

Point-in-time recovery in MongoDB combines a base backup (taken with `mongodump --oplog`) with oplog replay to restore the database to any moment within the oplog window. The key steps are: identify the target recovery time, restore the base backup with `--oplogReplay`, then use `--oplogLimit` to stop replay at the exact desired timestamp. Always maintain sufficient oplog size to cover your recovery time objectives, and test the PITR process regularly so you are confident in the procedure before a real incident occurs.
