# How to Troubleshoot MongoDB Disk Space Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Disk Space, Storage, Troubleshooting, WiredTiger

Description: Learn how to diagnose and resolve MongoDB disk space issues including data file growth, index bloat, and oplog consumption.

---

## Checking Disk Usage

Start by understanding what is consuming disk space:

```bash
# Check overall disk usage on the MongoDB data directory
df -h /var/lib/mongodb

# Detailed breakdown by file
du -sh /var/lib/mongodb/*

# Check data directory size
du -sh /var/lib/mongodb/
```

## MongoDB Database and Collection Stats

```javascript
// Database-level storage summary
db.stats({ scale: 1048576 })  // in MB
/*
{
  db: "mydb",
  objects: 12481352,
  dataSize: 8741.3,       // actual data size
  storageSize: 3294.8,    // disk size (compressed)
  indexSize: 892.1,       // index storage
  totalSize: 4186.9       // storageSize + indexSize
}
*/

// Find the largest collections
const collections = db.getCollectionNames()
const stats = collections.map(name => {
  const s = db.getCollection(name).stats({ scale: 1048576 })
  return {
    name,
    dataMB: s.size || 0,
    storageMB: s.storageSize || 0,
    indexMB: s.totalIndexSize || 0,
    docs: s.count || 0
  }
}).sort((a, b) => b.storageMB - a.storageMB)

stats.slice(0, 10).forEach(s =>
  printjson(s)
)
```

## Checking Oplog Size

The oplog is often the largest consumer of disk space on replica set members:

```javascript
// Connect to local database
use local

// Check oplog size and usage
db.oplog.rs.stats({ scale: 1048576 })
/*
{
  maxSize: 51200,        // max oplog size in MB
  size: 49500,           // current data size
  storageSize: 41200,    // compressed storage
  count: 10483221        // number of oplog entries
}
*/

// Check oplog window (how long the oplog covers)
rs.printReplicationInfo()
/*
configured oplog size: 50000 MB
log length start to end: 86400 secs (24 hrs)
*/
```

Resize the oplog if it is too large:

```javascript
// Resize oplog (MongoDB 3.6+)
db.adminCommand({ replSetResizeOplog: 1, size: 10240 })  // 10GB
```

## Recovering Space with compact

WiredTiger does not immediately return space to the OS after deletes. Use `compact` to reclaim it:

```javascript
// Compact a collection (blocks reads/writes in MongoDB 5.0 and earlier; non-blocking in 6.0+)
db.runCommand({ compact: "orders" })

// Check space before and after
const before = db.orders.stats({ scale: 1048576 }).storageSize
db.runCommand({ compact: "orders" })
const after = db.orders.stats({ scale: 1048576 }).storageSize
print(`Freed: ${(before - after).toFixed(1)} MB`)
```

Warning: In MongoDB 5.0 and earlier, `compact` blocks reads and writes on the collection. In MongoDB 6.0+, `compact` is non-blocking. For older versions, run during maintenance windows.

## Dropping Unused Indexes

Indexes consume significant disk space. Remove unused ones:

```javascript
// List all indexes and their sizes for a collection
db.orders.stats({ scale: 1048576 }).indexSizes
/*
{
  "_id_": 42.1,
  "status_1": 28.3,
  "createdAt_-1": 58.7,
  "oldField_1": 15.2    // potentially unused
}
*/

// Find unused indexes using $indexStats
db.orders.aggregate([{ $indexStats: {} }])
// Look for indexes with accesses.ops: 0

// Drop an unused index
db.orders.dropIndex("oldField_1")
```

## Managing Log File Disk Usage

```bash
# Check MongoDB log file size
ls -lh /var/log/mongodb/mongod.log

# Rotate log file (keeps current log, opens a new one)
mongosh --eval "db.adminCommand({ logRotate: 1 })"

# Or send SIGUSR1 signal
kill -USR1 $(pgrep mongod)

# Configure log rotation in mongod.conf
# systemLog:
#   logRotate: rename  # or reopen
#   destination: file
#   path: /var/log/mongodb/mongod.log
```

## Cleaning Up with TTL Indexes

Set TTL indexes to automatically expire old documents:

```javascript
// Create TTL index on logs collection - expire after 30 days
db.applicationLogs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
)

// Check when TTL will fire next
db.adminCommand({ serverStatus: 1 }).metrics.ttl
// { "deletedDocuments": 1842, "passes": 288 }

// TTL background task runs every 60 seconds
```

## Disk Usage in Atlas

In MongoDB Atlas, monitor disk usage in the Atlas UI:

```bash
# Via Atlas CLI
atlas metrics databases <cluster-name> --period P1D --granularity PT1H

# Atlas automatically warns at 80% disk usage
# Configure alerts: Atlas UI > Alerts > Add Alert > Disk Space Used %
```

## Emergency Space Recovery

If disk is nearly full and MongoDB is struggling:

```javascript
// 1. Check what is largest
db.stats({ scale: 1073741824 })  // in GB

// 2. Drop the largest collection you can afford to lose (or archive first)
db.archiveLogs.drop()

// 3. Verify space was freed
db.stats({ scale: 1073741824 })

// 4. Compact remaining collections
db.runCommand({ compact: "orders" })
```

```bash
# Also check journal files
ls -lh /var/lib/mongodb/journal/

# WiredTiger automatically manages journal size, but check for old .wt files
ls -lh /var/lib/mongodb/*.wt
```

## Summary

Diagnose MongoDB disk space issues by checking collection and database stats, oplog size, and log file growth. Recover space by running `compact` on collections after large deletes, dropping unused indexes, implementing TTL indexes for time-series data, and resizing an oversized oplog. In emergencies, dropping unused collections and compacting immediately can free significant space.
