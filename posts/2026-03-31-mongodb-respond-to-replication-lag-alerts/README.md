# How to Respond to MongoDB Replication Lag Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Alert, Replica Set, Operation

Description: Learn how to diagnose and resolve MongoDB replication lag alerts by identifying bottlenecks on secondaries, adjusting write concerns, and monitoring the oplog.

---

## What Is Replication Lag?

Replication lag is the delay between when a write is committed on the primary and when it is applied on a secondary. High lag means secondary reads are stale, failovers may result in data loss if lag exceeds your RPO, and reads from secondary prefer stale data. Atlas alerts fire when lag exceeds a configurable threshold (default: 60 seconds).

## Step 1: Measure Current Lag

```javascript
rs.printSecondaryReplicationInfo();
// source: rs0/secondary1:27017
// syncedTo: Tue Mar 31 2026 09:00:00
// 45 secs (0.01 hrs) behind the primary
```

Or check raw lag:

```javascript
const status = rs.status();
const primary = status.members.find(m => m.stateStr === "PRIMARY");
status.members.forEach(m => {
  if (m.stateStr === "SECONDARY") {
    const lagSec = Math.round((primary.optimeDate - m.optimeDate) / 1000);
    print(m.name, "lag:", lagSec, "seconds");
  }
});
```

## Step 2: Identify the Cause

### Heavy write load on the primary

The secondary cannot apply oplog entries fast enough. Check primary write throughput:

```javascript
const ss = db.adminCommand({ serverStatus: 1 });
print("Opcounters - insert:", ss.opcounters.insert,
      "update:", ss.opcounters.update,
      "delete:", ss.opcounters.delete);
```

### Slow index builds on secondary

Background index builds consume secondary CPU and slow oplog application. Check:

```javascript
db.adminCommand({ currentOp: true, "command.createIndexes": { $exists: true } });
```

### Replication I/O bottleneck

Secondaries with slower disks or network may lag. Check oplog window:

```javascript
const oplog = db.getSiblingDB("local").oplog.rs;
const first = oplog.find().sort({ $natural: 1 }).limit(1).next();
const last  = oplog.find().sort({ $natural: -1 }).limit(1).next();
const windowHours = (last.ts.t - first.ts.t) / 3600;
print("Oplog window:", windowHours.toFixed(1), "hours");
```

## Step 3: Remediation Actions

### Reduce write throughput temporarily

If a bulk import or migration is causing lag, rate-limit the writes:

```javascript
// Insert with delay between batches
for (let i = 0; i < docs.length; i += 500) {
  await db.collection.insertMany(docs.slice(i, i + 500));
  await new Promise(r => setTimeout(r, 100)); // 100ms pause between batches
}
```

### Use majority write concern for critical writes

This ensures the write is acknowledged only after a majority of replica set members have committed it, adding back-pressure that slows the write rate and helps secondaries catch up:

```javascript
await db.orders.insertOne(order, { writeConcern: { w: "majority", wtimeout: 5000 } });
```

### Exclude the lagging secondary from read routing

```javascript
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred",
  readPreferenceTags: [{ region: "us-east" }]  // route to healthy secondaries only
});
```

### Increase oplog size if window is too small

```javascript
db.adminCommand({ replSetResizeOplog: 1, size: 10240 }); // 10 GB
```

## Step 4: Configure Atlas Replication Lag Alerts

```bash
atlas alerts settings create \
  --event REPLICATION_OPLOG_WINDOW_RUNNING_OUT \
  --threshold 1 \
  --notificationType EMAIL \
  --notificationEmailAddress ops@example.com
```

## Summary

Responding to MongoDB replication lag alerts requires measuring lag with `rs.printSecondaryReplicationInfo()`, identifying whether the root cause is high write volume, slow secondary disks, or index builds on secondaries. Mitigate by rate-limiting bulk writes, using majority write concern for critical data, excluding lagging secondaries from read routing, and increasing the oplog size if the window is shrinking. Set Atlas alerts at 30-60 second thresholds to catch lag early.
