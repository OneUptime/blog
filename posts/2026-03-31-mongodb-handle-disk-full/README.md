# How to Handle MongoDB Disk Full Situations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Disk, Operation, Recovery, Administration

Description: Learn how to respond when MongoDB runs out of disk space, free space safely, prevent data corruption, and set up alerts to avoid future disk full incidents.

---

## Introduction

When the disk hosting MongoDB's data directory fills up, mongod stops accepting writes and may crash. Recovery requires immediate action to free disk space without corrupting data files. This guide covers emergency response, safe cleanup methods, and long-term prevention.

## Symptoms of a Disk Full Situation

```bash
# Mongod log shows:
# "No space left on device"
# "WiredTiger error: ENOSPC"
# "Ran out of space trying to write"

# Check disk usage
df -h /var/lib/mongodb
# Output: /dev/sda1    100G   100G     0 100% /
```

```javascript
// Application receives:
// MongoServerError: not primary
// MongoServerError: WiredTiger error (-28) ENOSPC: No space left on device
```

## Immediate Response

### Step 1: Stop New Writes (If Possible)

```javascript
// If mongod is still responsive, pause the balancer (sharded cluster)
sh.stopBalancer()

// Put the node in maintenance mode to stop reads
db.adminCommand({ replSetMaintenance: true })
```

### Step 2: Check Disk Usage Breakdown

```bash
# Overall disk usage
df -h /var/lib/mongodb

# What is consuming disk in the MongoDB data directory
du -sh /var/lib/mongodb/*
# Output:
# 45G    collection-0-12345678.wt
# 30G    index-1-12345678.wt
# 5G     journal
# 1G     diagnostic.data
# 200M   mongod.lock

# Check if journals can be cleared
du -sh /var/lib/mongodb/journal/
```

## Safe Ways to Free Disk Space

### Option A: Remove Old Diagnostic Data

```bash
# MongoDB diagnostic data can be removed safely
ls -lh /var/lib/mongodb/diagnostic.data/
rm /var/lib/mongodb/diagnostic.data/metrics.interim
# Keep at least the last few diagnostic files
```

### Option B: Compact Collections

```javascript
// Compact reclaims fragmented space (briefly locks the collection at start and end)
// NOTE: compact requires some additional free disk space to operate
db.runCommand({ compact: "orders" })

// Check space saved after compact
db.orders.stats({ scale: 1048576 })
```

### Option C: Delete or Archive Old Data

```javascript
// Archive or delete old documents
// Example: delete events older than 90 days
db.events.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
})
```

### Option D: Drop Unused Collections and Indexes

```javascript
// Check collection sizes
db.getCollectionNames().forEach(name => {
  var s = db[name].stats({ scale: 1048576 })
  print(name, "data:", s.size.toFixed(2) + "MB", "storage:", s.storageSize.toFixed(2) + "MB")
})

// Drop unused collection
db.temp_migration_backup.drop()

// Remove unused indexes
db.orders.getIndexes()
db.orders.dropIndex("old_unused_index_name")
```

### Option E: Move Data Directory to Larger Volume

```bash
# 1. Stop mongod
sudo systemctl stop mongod

# 2. Mount a larger volume
sudo mkdir /data/mongodb-new
sudo mount /dev/sdb1 /data/mongodb-new

# 3. Move data files
sudo rsync -av --progress /var/lib/mongodb/ /data/mongodb-new/
sudo chown -R mongod:mongod /data/mongodb-new

# 4. Update mongod.conf
sudo sed -i 's|dbPath: /var/lib/mongodb|dbPath: /data/mongodb-new|' /etc/mongod.conf

# 5. Start mongod
sudo systemctl start mongod
```

## Freeing Space in the Journal Directory

```bash
# If the journal directory is large, force a checkpoint
# This allows WiredTiger to remove old journal files
mongosh --eval "db.adminCommand({ fsync: 1 })"
```

## Handling a Crash Due to Disk Full

If mongod crashed due to disk full, the data files may be in a partially written state. WiredTiger's journal ensures recovery:

```bash
# 1. Free some disk space first (remove diagnostic data, old logs)
rm /var/log/mongodb/mongod.log.old
find /var/log/mongodb -name "*.log.*" -mtime +7 -delete

# 2. Verify there is at least a few GB free
df -h /var/lib/mongodb

# 3. Restart mongod - WiredTiger will replay the journal to restore consistency
sudo systemctl start mongod

# 4. Watch logs for recovery progress
tail -f /var/log/mongodb/mongod.log | grep -E "recovery|checkpoint|ENOSPC|error"
```

## Monitoring and Alerts

```javascript
// Check current storage size
db.adminCommand({ dbStats: 1, scale: 1048576 })
// Look for: storageSize, dataSize, freeStorageSize

// Check freeStorageSize (deleted documents not yet reclaimed)
db.adminCommand({ dbStats: 1 }).freeStorageSize
```

Set up a disk usage alert with a monitoring script:

```bash
#!/bin/bash
# check-disk.sh - run every 5 minutes via cron
THRESHOLD=85
USAGE=$(df -h /var/lib/mongodb | awk 'NR==2 {gsub(/%/,""); print $5}')

if [ "$USAGE" -ge "$THRESHOLD" ]; then
  echo "ALERT: MongoDB disk usage at ${USAGE}% on $(hostname)" | \
    mail -s "MongoDB Disk Alert" ops@example.com
fi
```

## Configuring a Disk Usage Limit (WiredTiger)

You cannot set a hard cap in MongoDB, but you can size the WiredTiger cache conservatively to leave room for data growth:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4   # Leave remaining RAM for OS and queries
```

## Replica Set: Use a Secondary for Cleanup

On a replica set, do heavy cleanup work on a secondary first:

```javascript
// Stop replication on secondary
db.adminCommand({ replSetMaintenance: true })

// Perform compaction / deletion
db.runCommand({ compact: "orders" })

// Resume replication
db.adminCommand({ replSetMaintenance: false })
```

## Summary

When MongoDB runs out of disk space, stop writes if possible, then free space by removing diagnostic data, old logs, and unused collections or indexes. If compact is needed, ensure some free space exists first. For crashes caused by disk full, free space and restart - WiredTiger's journal handles recovery automatically. Long-term, monitor disk usage with automated alerts at 80% and 90% thresholds, implement TTL indexes for time-series data, and plan storage capacity with at least 30% headroom above your current data size.
