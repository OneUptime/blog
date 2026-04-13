# How to Resize the Oplog with replSetResizeOplog in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Administration, Performance

Description: Use the replSetResizeOplog command to dynamically resize the MongoDB oplog without restarting, and understand how oplog size affects replication lag and change streams.

---

## What Is the Oplog?

The oplog (operations log) is a special capped collection (`local.oplog.rs`) that records every write operation in a replica set. Secondary members continuously read the primary's oplog to replicate changes.

Oplog size matters because:
- A small oplog fills up quickly, limiting how far behind a secondary can fall before it becomes "stale"
- Change streams use the oplog - small oplogs reduce the resume token window
- Online Archive and Live Migration depend on the oplog window

## Check Current Oplog Size and Window

```javascript
// Check oplog status
rs.printReplicationInfo()
```

Output:
```text
configured oplog size:   2048MB
log length start to end: 86400secs (24hrs)
oplog first event time:  Thu Jan 15 2024 00:00:00 GMT+0000
oplog last event time:   Thu Jan 16 2024 00:00:00 GMT+0000
now:                     Thu Jan 16 2024 08:00:00 GMT+0000
```

The "log length" is the oplog window - how far back in time the oplog covers.

```javascript
// Check secondary replication lag
rs.printSecondaryReplicationInfo()
```

## The replSetResizeOplog Command

`replSetResizeOplog` allows resizing the oplog on a running node without downtime (MongoDB 3.6+):

```javascript
// Resize oplog to 10GB (size in megabytes)
db.adminCommand({ replSetResizeOplog: 1, size: 10240 })
```

This is a **live operation** - no restart required. The change takes effect immediately.

## Step 1: Determine the Right Oplog Size

Calculate the required oplog size based on write throughput:

```javascript
// Method 1: Check current oplog usage rate
use local
var start = db.oplog.rs.find().sort({ $natural: 1 }).limit(1).next();
var end = db.oplog.rs.find().sort({ $natural: -1 }).limit(1).next();

var duration = (end.ts.t - start.ts.t) / 3600;  // hours
var sizeGB = db.oplog.rs.stats().size / 1024 / 1024 / 1024;
var rateGBPerHour = sizeGB / duration;

print("Oplog fill rate: " + rateGBPerHour.toFixed(2) + " GB/hour");
print("To keep 72 hours of oplog: " + (rateGBPerHour * 72 * 1024).toFixed(0) + " MB");
```

```javascript
// Method 2: Atlas-style check - compute GB/hour
db.adminCommand({ replSetGetStatus: 1 }).members.forEach(m => {
  if (m.self) print("Self: optime", m.optime);
})
```

## Step 2: Resize on the Primary

```javascript
// Connect to primary
mongosh "mongodb://admin:pass@primary:27017/?replicaSet=rs0&authSource=admin"

// Check current size
use local
db.oplog.rs.stats().maxSize / 1024 / 1024 + " MB"

// Resize to 20GB
db.adminCommand({ replSetResizeOplog: 1, size: 20480 })
```

Successful response:
```json
{ "ok": 1 }
```

## Step 3: Resize on Secondaries

Each member maintains its own oplog. Resize all members:

```bash
#!/bin/bash
# Resize oplog on all replica set members
NEW_SIZE_MB=20480
MEMBERS=("primary:27017" "secondary1:27017" "secondary2:27017")

for MEMBER in "${MEMBERS[@]}"; do
  echo "Resizing oplog on $MEMBER..."
  mongosh "mongodb://admin:pass@${MEMBER}/admin" \
    --eval "db.adminCommand({ replSetResizeOplog: 1, size: ${NEW_SIZE_MB} })"
done
```

## Step 4: Verify the Resize

```javascript
// Verify on each member
rs.printReplicationInfo()

// Or check directly
use local
db.oplog.rs.stats().maxSize / 1024 / 1024 + " MB current max"
```

## Persisting the Resize

Starting in MongoDB 4.0, `replSetResizeOplog` changes are persistent - the new oplog size survives restarts. In MongoDB 3.6, the change was temporary and would reset on restart.

It is still good practice to set `replication.oplogSizeMB` in `mongod.conf` so that the intended size is explicit in your configuration:

```yaml
# /etc/mongod.conf
replication:
  replSetName: "rs0"
  oplogSizeMB: 20480
```

On Atlas, the oplog size is automatically managed and scales with cluster tier. You can configure a minimum oplog window through the Atlas UI under cluster settings.

## Shrinking the Oplog

`replSetResizeOplog` can also shrink the oplog. MongoDB truncates from the oldest entries:

```javascript
// Shrink to 5GB (may truncate oldest entries)
db.adminCommand({ replSetResizeOplog: 1, size: 5120 })
```

Shrinking reduces the oplog window - verify secondaries can still replicate before shrinking on the primary.

## Oplog Size Guidelines

| Write Volume | Recommended Oplog Window | Oplog Size |
|---|---|---|
| Low (< 1GB/day writes) | 24 hours | 2-5 GB |
| Medium (1-10GB/day) | 48-72 hours | 10-50 GB |
| High (> 10GB/day) | 24 hours minimum | 50+ GB |

Add more headroom if:
- You use change streams (longer window = longer resume token validity)
- You run Live Migration
- Secondaries might fall behind during maintenance windows

## Summary

`replSetResizeOplog` dynamically resizes the oplog on a running MongoDB node without requiring a restart. Starting in MongoDB 4.0, the change persists through restarts. Calculate the required size based on write throughput and desired window duration, run the command on all replica set members, and set `oplogSizeMB` in `mongod.conf` to keep your configuration explicit. Larger oplogs provide longer windows for secondary catch-up, change stream resume tokens, and migration operations.
