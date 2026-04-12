# How to Use the Oplog for Point-in-Time Recovery in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Point-in-Time Recovery, Backup, Disaster Recovery

Description: Use MongoDB's oplog alongside base backups to perform point-in-time recovery, restoring your database to any moment within the oplog window.

---

MongoDB's oplog enables point-in-time recovery (PITR) - the ability to restore a database to any moment in time between a base backup and the present. This is critical for recovering from accidental data deletion or corruption.

## How PITR Works

1. Take a consistent base backup (mongodump or filesystem snapshot)
2. Record the oplog timestamp at the time of the backup
3. If recovery is needed, restore the base backup
4. Replay oplog entries from the backup timestamp up to the desired recovery point

The oplog is a capped collection that keeps a rolling record of every write operation within the oplog window, so you can stop replay at any precise timestamp.

## Step 1 - Take a Base Backup with Oplog Timestamp

Use `mongodump` with `--oplog` to capture a consistent snapshot that includes the oplog timestamp:

```bash
mongodump \
  --uri "mongodb://backup-user:password@primary:27017/?replicaSet=rs0" \
  --oplog \
  --out /backup/2026-03-31-full
```

The `--oplog` flag includes a file `oplog.bson` containing oplog entries captured during the dump, which makes the snapshot consistent.

## Step 2 - Record the Oplog End Timestamp

After the dump completes, record the latest oplog timestamp:

```javascript
const last = db.getSiblingDB("local").oplog.rs
  .find()
  .sort({ $natural: -1 })
  .limit(1)
  .next();

print("Oplog end timestamp:", JSON.stringify(last.ts));
// {"$timestamp":{"t":1743379200,"i":1}}
```

## Step 3 - Export Oplog Entries for the Recovery Window

When you need PITR, export oplog entries between the backup timestamp and your target recovery time:

```bash
# Convert target time to Unix timestamp
# e.g., 2026-03-31 10:30:00 UTC = 1743379800

mongodump \
  --uri "mongodb://primary:27017" \
  --db local \
  --collection oplog.rs \
  --query '{"ts": {"$gte": {"$timestamp": {"t": 1743379200, "i": 1}}, "$lte": {"$timestamp": {"t": 1743379800, "i": 0}}}}' \
  --out /backup/oplog-replay
```

## Step 4 - Restore the Base Backup

```bash
mongorestore \
  --uri "mongodb://localhost:27017" \
  --oplogReplay \
  /backup/2026-03-31-full
```

The `--oplogReplay` flag applies the captured oplog entries from `oplog.bson` to make the restoration consistent.

## Step 5 - Apply the Oplog Replay to Target Time

```bash
mongorestore \
  --uri "mongodb://localhost:27017" \
  --oplogReplay \
  --oplogLimit "1743379800:0" \
  /backup/oplog-replay
```

`--oplogLimit` takes the format `<unix_timestamp>:<ordinal>`. Entries at or after this timestamp are not applied.

## Verifying Recovery

After restoration, verify data integrity:

```javascript
// Check document counts
db.orders.countDocuments()
db.users.countDocuments()

// Verify the most recent document timestamps are within your target window
db.orders.find().sort({ createdAt: -1 }).limit(1)
```

## Using MongoDB Ops Manager or Atlas for PITR

MongoDB Atlas includes built-in PITR with a simple UI:

```text
Backup -> Restore -> Point in Time -> Select timestamp
```

Atlas handles the base backup and oplog replay automatically. The minimum recovery granularity is 1 second.

## Summary

Point-in-time recovery with MongoDB combines a consistent base backup (captured with `mongodump --oplog`) with oplog replay up to a target timestamp. The oplog window determines how far back you can recover - size your oplog to cover at least your backup frequency plus a safety margin. For production systems, automate base backups daily and verify that the oplog window is large enough to bridge between backup intervals.
