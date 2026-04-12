# How to Perform MongoDB Point-in-Time Recovery with Oplogs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Recovery, Oplog, Backup, Operation

Description: Learn how to use MongoDB oplogs with mongorestore to perform point-in-time recovery, restoring your database to any specific moment before a data loss event.

---

## Introduction

Point-in-time recovery (PITR) lets you restore a MongoDB database to any specific moment in the past - useful after accidental deletions, bad migrations, or application bugs that corrupted data. PITR works by combining a full backup (mongodump) with oplog replay up to the desired timestamp.

## How Oplog-Based PITR Works

```mermaid
flowchart LR
    T0["T0: Take full mongodump\n+ capture oplog start timestamp"]
    T1["T1: Normal operations\n(inserts, updates, deletes)"]
    T2["T2: Incident occurs\n(accidental drop, bad update)"]
    T3["T3: Recovery target\n(just before incident)"]

    T0 -->|Time| T1
    T1 -->|Time| T2
    T2 -.->|Never restore| T2

    Restore["Restore flow:\n1. Restore T0 dump\n2. Apply oplog T0 -> T3\n3. Database is at T3 state"]
```

## Prerequisites

- A mongodump taken with `--oplog` flag (captures oplog at dump time)
- Oplog entries from the dump time until the recovery target
- Sufficient oplog window - oplog must not have been recycled

## Step 1: Take a Backup with Oplog

Always take backups with `--oplog` to enable PITR:

```bash
# Full backup including oplog state
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplog \
  --out /backup/mongo-$(date +%Y%m%d-%H%M%S)
```

This creates a dump directory containing:
- One directory per database
- `oplog.bson` - oplog entries that occurred during the dump itself

## Step 2: Check the Oplog Window

Ensure the oplog still contains entries from the backup time to your recovery target:

```javascript
// Connect to mongod
use local

// First oplog entry timestamp
db.oplog.rs.find().sort({ $natural: 1 }).limit(1).forEach(d => {
  print("Earliest oplog entry:", new Date(d.ts.t * 1000))
})

// Last oplog entry
db.oplog.rs.find().sort({ $natural: -1 }).limit(1).forEach(d => {
  print("Latest oplog entry:", new Date(d.ts.t * 1000))
})
```

## Step 3: Dump the Oplog from the Replica Set

Export the oplog entries from the source instance (or a secondary):

```bash
# Dump the oplog (local.oplog.rs)
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db local \
  --collection oplog.rs \
  --out /backup/oplog-dump
```

The oplog entries are stored in `/backup/oplog-dump/local/oplog.rs.bson`.

## Step 4: Determine the Recovery Timestamp

Find the exact BSON Timestamp of the last "good" operation:

```javascript
// Find the timestamp of the operation just before the incident
// Example: find the last insert into the orders collection before a bad update
use local
db.oplog.rs.find({
  ns: "ecommerce.orders",
  op: { $in: ["i", "u"] }
}).sort({ $natural: -1 }).limit(20).forEach(entry => {
  print(
    "ts:", new Date(entry.ts.t * 1000),
    "op:", entry.op,
    "o:", JSON.stringify(entry.o).substring(0, 80)
  )
})
```

Note the Timestamp value (seconds and increment):

```javascript
// Example: Timestamp(1743388800, 5)
// 1743388800 = Unix timestamp of the moment
// 5 = operation counter within that second
```

## Step 5: Restore the Base Backup

```bash
# Restore the full dump (this creates the initial state at T0)
mongorestore \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --drop \
  /backup/mongo-20260331-020000
```

The `--oplogReplay` flag automatically replays the `oplog.bson` file included in the dump.

## Step 6: Copy and Filter Oplog Entries

Move the oplog dump file to the right location for replay:

```bash
# mongorestore expects the oplog file at the root of the dump directory
mkdir -p /backup/oplog-for-replay
cp /backup/oplog-dump/local/oplog.rs.bson /backup/oplog-for-replay/oplog.bson
```

## Step 7: Replay Oplog Up to the Recovery Point

```bash
# Replay oplog entries up to (but not including) the timestamp of the incident
mongorestore \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --oplogLimit "1743388800:5" \
  /backup/oplog-for-replay
```

The `--oplogLimit` format is `<unix_timestamp>:<ordinal>`. Operations at or after this timestamp are not applied.

## Step 8: Verify the Recovery

```javascript
// Verify the database is in the expected state
use ecommerce
db.orders.countDocuments()
db.orders.find().sort({ createdAt: -1 }).limit(5).pretty()

// Check that the incident (e.g., a dropped collection) did not occur
db.getCollectionNames()
```

## Automating PITR with a Scheduled Script

```bash
#!/bin/bash
# backup-with-oplog.sh - Run hourly via cron

BACKUP_DIR="/backup/mongodb/$(date +%Y%m%d-%H%M%S)"
MONGO_URI="mongodb://admin:${MONGO_PASSWORD}@localhost:27017/?authSource=admin"

mkdir -p "$BACKUP_DIR"

mongodump \
  --uri "$MONGO_URI" \
  --oplog \
  --gzip \
  --out "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR"

# Remove backups older than 7 days
find /backup/mongodb -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
```

## Estimating Oplog Window

```javascript
// How many hours of oplog history is retained
var first = db.oplog.rs.find().sort({ $natural: 1 }).limit(1).next()
var last = db.oplog.rs.find().sort({ $natural: -1 }).limit(1).next()
var windowHours = (last.ts.t - first.ts.t) / 3600
print("Oplog window: ~" + windowHours.toFixed(1) + " hours")
```

Increase the oplog size if needed:

```javascript
// Resize oplog (replica set members)
db.adminCommand({
  replSetResizeOplog: 1,
  size: 10240   // MB (10 GB)
})
```

## Summary

MongoDB point-in-time recovery uses full backups taken with `mongodump --oplog` as the base, plus oplog replay to advance the state to any moment before the incident. Find the target timestamp by inspecting oplog entries, restore the base dump with `--oplogReplay`, then replay additional oplog entries with `--oplogLimit` to stop at the desired moment. Maintain an adequate oplog window (at least 24-48 hours) and automate hourly backups with `--oplog` to minimize potential data loss window.
