# How to Respond to MongoDB Oplog Window Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replica Set, Alert, Operation

Description: Learn how to diagnose and respond to MongoDB oplog window shrinking alerts, resize the oplog, and prevent replication failures from outpacing the oplog.

---

## What Is the Oplog Window?

The oplog (operations log) is a capped collection that records all write operations on the primary. Secondaries read the oplog to replicate changes. The "oplog window" is how far back in time the oplog retains operations. If a secondary falls behind more than the oplog window, it enters RECOVERING state and cannot replicate - requiring a full resync.

Atlas alerts fire when the oplog window drops below a threshold (default: 1 hour).

## Step 1: Check the Current Oplog Window

```javascript
const oplog = db.getSiblingDB("local").oplog.rs;
const firstEntry = oplog.find().sort({ $natural:  1 }).limit(1).next();
const lastEntry  = oplog.find().sort({ $natural: -1 }).limit(1).next();

const windowSecs = lastEntry.ts.t - firstEntry.ts.t;
print("Oplog window:", (windowSecs / 3600).toFixed(2), "hours");
print("Oplog size:  ", (oplog.stats().maxSize / 1e9).toFixed(2), "GB");
print("Oplog used:  ", (oplog.stats().size / 1e9).toFixed(2), "GB");
```

## Step 2: Check Secondary Lag vs. Window

Compare the oplog window to the current replication lag:

```javascript
rs.status().members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(m => {
    const lagSecs = (new Date() - m.optimeDate) / 1000;
    print(m.name, "lag:", lagSecs.toFixed(0), "seconds");
  });
```

If a secondary's lag approaches the oplog window, it is at risk of needing a full resync.

## Step 3: Resize the Oplog

On self-managed MongoDB 3.6+, resize the oplog dynamically without restarting:

```javascript
// Resize to 20 GB
db.adminCommand({ replSetResizeOplog: 1, size: 20480 });
```

Check the current oplog size:

```javascript
db.getReplicationInfo();
// Returns logSizeMB, usedMB, timeDiff, timeDiffHours, tFirst, tLast
```

For older versions, resize by setting `replication.oplogSizeMB` in `mongod.conf` and restarting:

```yaml
replication:
  oplogSizeMB: 20480
```

On Atlas, the oplog size is managed automatically based on tier, but you can set a minimum retention period:

```javascript
db.adminCommand({ replSetResizeOplog: 1, minRetentionHours: 24 });
```

## Step 4: Identify What Is Consuming the Oplog

High write throughput fills the oplog quickly. Identify the operation types driving writes:

```javascript
const ss = db.adminCommand({ serverStatus: 1 });
print("Inserts:", ss.opcounters.insert);
print("Updates:", ss.opcounters.update);
print("Deletes:", ss.opcounters.delete);
```

Bulk operations that touch many documents expand rapidly in the oplog because each individual document modification is a separate oplog entry. Batch deletes of 1 million documents generate 1 million oplog entries.

## Step 5: Minimize Oplog Impact from Bulk Operations

Rate-limit bulk deletes:

```javascript
let totalDeleted = 0;
const batchSize = 1000;
while (true) {
  const docs = await db.events.find(
    { expiresAt: { $lt: new Date() } }
  ).limit(batchSize).toArray();
  if (docs.length === 0) break;
  const ids = docs.map(d => d._id);
  const result = await db.events.deleteMany({ _id: { $in: ids } });
  totalDeleted += result.deletedCount;
  if (docs.length < batchSize) break;
  await new Promise(r => setTimeout(r, 200)); // pause between batches
}
```

## Summary

MongoDB oplog window alerts warn you before a secondary falls so far behind that it needs a full resync. Measure the window with the oplog's first and last timestamp difference, compare it to current secondary lag, and resize the oplog using `replSetResizeOplog` when the window is too short. On Atlas, set `minRetentionHours` to guarantee a minimum window. Rate-limit bulk delete and update operations that generate disproportionate oplog volume.
