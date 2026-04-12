# How to Respond to MongoDB Disk Space Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Alert, Operation, Disk, Storage

Description: Learn how to diagnose and respond to MongoDB disk space alerts by identifying large collections, compacting storage, and scaling disk capacity before data loss occurs.

---

## Why Disk Space Alerts Are Critical

MongoDB stops accepting writes when disk usage reaches 100%. On Atlas, a disk space alert fires when usage exceeds a configurable threshold (default: 90%). Running out of disk space causes write failures, potential data corruption, and replica set instability. You must act quickly.

## Step 1: Identify What Is Consuming Space

Connect to `mongosh` and check database and collection sizes:

```javascript
// Size of each database
db.adminCommand({ listDatabases: 1, nameOnly: false })
  .databases
  .sort((a, b) => b.sizeOnDisk - a.sizeOnDisk)
  .forEach(d => print(d.name, (d.sizeOnDisk / 1e9).toFixed(2) + " GB"));

// Size of collections in a database
db = db.getSiblingDB("mydb");
db.getCollectionNames().forEach(name => {
  const stats = db[name].stats();
  print(name, (stats.storageSize / 1e6).toFixed(1) + " MB data,",
        (stats.totalIndexSize / 1e6).toFixed(1) + " MB indexes");
});
```

## Step 2: Check for Bloat from Deleted Documents

WiredTiger does not immediately return freed space to the OS after deletes. Check for reusable space:

```javascript
const stats = db.orders.stats({ wiredTiger: true });
const reusable = stats.wiredTiger["block-manager"]["file bytes available for reuse"];
const bloatRatio = reusable / stats.storageSize;
print("Reusable space ratio:", (bloatRatio * 100).toFixed(1) + "%");
```

If bloat exceeds 30-40%, compaction or collection drop-and-rebuild is worth considering.

## Step 3: Reclaim Space

### Run compact on a secondary first

```javascript
db.runCommand({ compact: "orders" });
```

Starting with MongoDB 4.4, `compact` does not block read or write operations. On MongoDB 6.1+, secondaries can continue replicating during compaction. For older versions, run it on a secondary while it is out of rotation and roll through the set to avoid downtime.

### Drop unused collections and indexes

```javascript
// List indexes and remove unused ones
db.orders.getIndexes().forEach(idx => print(JSON.stringify(idx)));
db.orders.dropIndex("old_status_index");
```

## Step 4: Archive or Delete Old Data

Identify documents older than a retention period and remove them in batches to avoid a large write spike:

```javascript
const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
const batchSize = 10000;
let totalDeleted = 0;
while (true) {
  const batch = db.events.find(
    { createdAt: { $lt: cutoff } },
    { projection: { _id: 1 } }
  ).limit(batchSize).toArray();
  if (batch.length === 0) break;
  const result = db.events.deleteMany({
    _id: { $in: batch.map(doc => doc._id) }
  });
  totalDeleted += result.deletedCount;
}
print("Deleted:", totalDeleted, "documents");
```

## Step 5: Scale Disk Capacity

On Atlas, increase disk size without downtime:

```bash
atlas clusters update MyCluster \
  --diskSizeGB 500
```

For self-managed deployments, add a larger volume and use `mongodump` / `mongorestore` to migrate, or add a new shard.

## Step 6: Configure Proactive Alerts

In Atlas, set disk alerts well below 100% to give yourself time to react:

```bash
atlas alerts settings create \
  --projectId <projectId> \
  --event OUTSIDE_METRIC_THRESHOLD \
  --metricName DISK_PARTITION_SPACE_USED_DATA \
  --metricOperator GREATER_THAN \
  --metricThreshold 80 \
  --metricUnits RAW \
  --notificationType EMAIL \
  --notificationEmailAddress ops@example.com
```

## Summary

When a MongoDB disk space alert fires, immediately identify the largest collections and indexes using `db.stats()`, check for WiredTiger bloat, compact on secondaries to reclaim fragmented space, delete or archive old data in batches, and scale disk capacity in Atlas if growth is expected to continue. Set alert thresholds at 70-80% to ensure enough lead time before writes are blocked.
