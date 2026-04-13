# How to Fix MongoError: Oplog Size Is Too Small in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replica Set, Replication, Administration

Description: Learn why the MongoDB oplog being too small causes replication lag and stream errors, and how to resize the oplog to fix the problem.

---

## Understanding the Problem

The oplog (operations log) is a capped collection (`local.oplog.rs`) that records all write operations on the primary. Secondaries replay oplog entries to stay in sync. Change streams also rely on oplog entries to deliver events.

When the oplog is too small, it rolls over before secondaries can replay all entries, causing:

```text
MongoServerError: can no longer get change stream resume token because
  the resume point may no longer be in the oplog.
```

Or for secondaries:

```text
Replication error: our last op time fetched is no longer in the remote oplog
```

## Step 1: Measure Current Oplog Size and Window

In `mongosh` on the primary:

```javascript
// Get current oplog stats
db.getReplicationInfo()
```

Output includes:

```text
logSizeMB : 2048
usedMB    : 2048
timeDiff  : 3600
timeDiffHours : 1.0
```

`timeDiffHours` shows how many hours of operations the oplog currently holds. If this is shorter than your secondaries' maximum replication lag, increase the oplog size.

## Step 2: Check Replication Lag

```javascript
rs.printReplicationInfo()    // primary oplog window
rs.printSecondaryReplicationInfo() // secondary lag
```

A secondary lag greater than the oplog window means the secondary will fall out of sync.

## Step 3: Resize the Oplog (MongoDB 3.6+)

You can resize the oplog without taking the replica set offline using `replSetResizeOplog`:

```javascript
// Resize to 10 GB (10240 MB) on the primary
db.adminCommand({ replSetResizeOplog: 1, size: 10240 })
```

Do this on each member of the replica set:

```javascript
// Run on each member (connect to each one)
db.adminCommand({ replSetResizeOplog: 1, size: 10240 })
```

Verify the new size:

```javascript
db.getReplicationInfo()
// logSizeMB should reflect the new size
```

## Step 4: Set a Permanent Minimum Size

To persist the size across restarts, set it in `mongod.conf`:

```yaml
replication:
  oplogSizeMB: 10240
```

Or use the command-line flag:

```bash
mongod --replSet rs0 --oplogSize 10240
```

## Step 5: Calculate the Right Oplog Size

A good rule of thumb: the oplog window should be at least 24 hours, ideally 72 hours. Calculate the required size based on your write throughput:

```javascript
// Writes per second * seconds per hour * desired hours * average op size
// Example: 1000 ops/sec * 3600 * 72 hours * 200 bytes = ~48 GB
// Most deployments need 2-50 GB

// Check your write rate
db.serverStatus().opcounters
```

## Step 6: Monitor Oplog Window in Production

Set up monitoring alerts when the oplog window drops below 24 hours. Using mongosh:

```javascript
const info = db.getReplicationInfo();
if (info.timeDiffHours < 24) {
  print(`WARNING: Oplog window is ${info.timeDiffHours} hours - consider resizing`);
}
```

## Summary

An undersized oplog causes secondaries to fall out of sync and change stream resume tokens to expire. Use `replSetResizeOplog` to increase the oplog size online without downtime, set `oplogSizeMB` in `mongod.conf` for persistence, and size the oplog to hold at least 24-72 hours of operations based on your write throughput and acceptable replication lag.
