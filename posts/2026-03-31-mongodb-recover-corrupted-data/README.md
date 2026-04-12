# How to Recover MongoDB from Corrupted Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Recovery, Corruption, WiredTiger, Operation

Description: Learn how to detect, diagnose, and recover MongoDB from data file corruption using WiredTiger repair, validation, mongodump, and replica set resync.

---

## Introduction

MongoDB data corruption can result from hardware failure (bad disk sectors, RAID failure), power loss without journaling, operating system crashes, or filesystem errors. WiredTiger's journaling protects against most corruption scenarios, but hardware-level issues can still cause problems. This guide covers detection and recovery strategies.

## Common Causes of Corruption

- Hardware failure (disk bad sectors, failing RAID controller)
- Incorrect shutdown (kill -9 on mongod)
- Filesystem errors (ext4/xfs corruption)
- Out-of-memory kill during a write
- Storage volume running out of inodes

## Step 1: Detect Corruption

Check mongod logs for corruption indicators:

```bash
grep -E "checksum|corruption|invalid|ENOENT|error opening" /var/log/mongodb/mongod.log | tail -30
```

Run validation from the shell:

```javascript
// Validate a specific collection
db.orders.validate({ full: true })
// Look for: valid: false, errors array with corruption messages

// Validate all collections in a database
db.getCollectionNames().forEach(name => {
  var result = db[name].validate({ full: true })
  if (!result.valid) {
    print("CORRUPTED:", name)
    printjson(result.errors)
  }
})
```

Check the server status for storage engine errors:

```bash
# Connect and check server status for storage engine issues
mongosh --eval "printjson(db.serverStatus().wiredTiger)"
```

## Step 2: Attempt WiredTiger Repair

Stop mongod and run repair mode. This rebuilds corrupted WiredTiger files:

```bash
# Stop mongod
sudo systemctl stop mongod

# Run repair (may take a long time on large databases)
sudo mongod --repair --dbpath /var/lib/mongodb

# Restart normally after repair completes
sudo systemctl start mongod
```

**Important notes about repair:**
- `--repair` removes corrupted documents that cannot be recovered
- Always take a filesystem snapshot or backup before running repair
- On a replica set, it is better to resync than to repair (see Step 5)

## Step 3: Check for Corrupted WiredTiger Files Specifically

```bash
# WiredTiger has its own verify command
cd /var/lib/mongodb

# List WiredTiger files
ls *.wt | head -20

# Run WiredTiger verify on a specific table (advanced)
# This requires the wt command-line tool
wt -h /var/lib/mongodb verify table:collection-0-12345678
```

List WiredTiger metadata and diagnostic files:

```bash
# WiredTiger.wt is a binary metadata table, not a text file
# Use the wt tool to read metadata:
wt -h /var/lib/mongodb list -v

# List all WiredTiger-related files
ls /var/lib/mongodb/WiredTiger*
```

## Step 4: Recover Data with mongodump Before Repair

If mongod can still start (partially corrupted), dump what you can before attempting repair:

```bash
# Start mongod with --repair disabled, attempt a dump
sudo systemctl start mongod

# Dump all readable data
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --out /backup/pre-repair-dump \
  2>&1 | tee /tmp/dump-errors.log

# Review which collections had errors
grep "error" /tmp/dump-errors.log
```

## Step 5: Resync a Replica Set Member (Preferred Over Repair)

On a replica set, resyncing from a healthy member is safer and more reliable than `--repair`:

```bash
# 1. Stop mongod on the corrupted member
sudo systemctl stop mongod

# 2. Clear the corrupted data directory
sudo rm -rf /var/lib/mongodb/*

# 3. Restart mongod with the same replica set config
sudo systemctl start mongod
```

MongoDB automatically performs an initial sync from a healthy member:

```javascript
// Monitor initial sync progress from the primary
rs.status().members.find(m => m.name === "corrupted-node.example.com:27017")
// stateStr: "STARTUP2" -> "SECONDARY" when complete
```

Check initial sync status:

```javascript
// On the resyncing member
db.adminCommand({ replSetGetStatus: 1 }).initialSyncStatus
```

## Step 6: Restore from Backup (Last Resort)

If repair fails and resync is not possible:

```bash
# 1. Stop mongod
sudo systemctl stop mongod

# 2. Remove all data files
sudo rm -rf /var/lib/mongodb/*

# 3. Restore from the most recent backup (created with mongodump --oplog)
mongorestore \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --drop \
  /backup/latest-backup

# 4. For point-in-time recovery, use --oplogLimit to stop replay at a timestamp
mongorestore \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --oplogLimit "1609459200:1" \
  /backup/latest-backup
```

## Step 7: Verify Recovery

After any recovery method:

```javascript
// Validate all collections
var dbs = db.adminCommand({ listDatabases: 1 }).databases
dbs.forEach(database => {
  var d = db.getSiblingDB(database.name)
  d.getCollectionNames().forEach(col => {
    var r = d[col].validate()
    if (!r.valid) print("INVALID:", database.name + "." + col, r.errors)
  })
})

// Check document counts match expectations
db.orders.estimatedDocumentCount()
db.users.estimatedDocumentCount()
```

## Preventing Corruption

```yaml
# Use journaling (default in WiredTiger)
storage:
  journal:
    enabled: true

# Use XFS filesystem (better MongoDB performance and reliability than ext4)
# Format data volume: mkfs.xfs /dev/sdb1

# Mount with noatime for performance
# /dev/sdb1 /var/lib/mongodb xfs defaults,noatime 0 0

# NEVER use kill -9 on mongod
# Instead:
# sudo systemctl stop mongod
# # Or: mongosh --eval "db.adminCommand({ shutdown: 1 })"
```

## Summary

MongoDB data corruption recovery starts with detection using `db.validate()` and log analysis. For WiredTiger corruption, attempt `mongod --repair` after backing up data files. On a replica set, the preferred approach is to clear the corrupted member's data directory and let it resync from a healthy member automatically. For standalone instances, restore from a mongodump backup and replay the oplog for point-in-time recovery. Prevent corruption by using XFS filesystem, enabling journaling, and always shutting down mongod gracefully with `systemctl stop` rather than kill signals.
