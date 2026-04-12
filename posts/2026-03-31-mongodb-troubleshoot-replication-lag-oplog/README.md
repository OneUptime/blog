# How to Troubleshoot Replication Lag Using Oplog Metrics in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Oplog, Troubleshooting, Replica Set

Description: Use MongoDB oplog metrics and replica set status to diagnose the root cause of replication lag and apply targeted fixes before secondaries fall out of sync.

---

Replication lag occurs when secondaries cannot apply oplog entries as fast as the primary produces them. Left unchecked, a secondary can fall off the oplog and require a full initial sync. This guide walks through diagnosing lag using oplog metrics.

## Step 1 - Measure Current Lag

```javascript
rs.printSecondaryReplicationInfo()
```

Or calculate it programmatically:

```javascript
const status = db.adminCommand({ replSetGetStatus: 1 });
const primaryTs = status.members.find(m => m.stateStr === "PRIMARY").optime.ts;

status.members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(m => {
    const lagSecs = primaryTs.getTime() - m.optime.ts.getTime();
    print(`${m.name}: ${lagSecs}s lag`);
  });
```

## Step 2 - Check Oplog Apply Rate on Secondary

Connect to the lagging secondary and check its replication worker stats:

```javascript
// On the secondary
db.serverStatus().metrics.repl.apply
```

Key fields:

```javascript
{
  "ops": NumberLong(450000), // total operations applied
  "batches": {
    "num": NumberLong(3500),
    "totalMillis": NumberLong(870000)  // total time spent applying
  }
}
```

Calculate average batch latency:

```javascript
const apply = db.serverStatus().metrics.repl.apply;
const avgBatchMs = apply.batches.totalMillis / apply.batches.num;
print("Avg batch apply time (ms):", avgBatchMs.toFixed(1));
```

High average batch time points to secondary I/O or CPU being the bottleneck.

## Step 3 - Compare Network vs Apply Lag

The total lag has two components: network fetch time and apply time.

```javascript
const buffer = db.serverStatus().metrics.repl.buffer;
print("Oplog buffer size (bytes):", buffer.sizeBytes);
print("Oplog buffer count:", buffer.count);
print("Oplog buffer max (bytes):", buffer.maxSizeBytes);
```

If the buffer is full, the network fetcher is ahead of the applier - the secondary is receiving data but cannot apply it fast enough (CPU/disk bottleneck on secondary).

If the buffer is empty and lag is still growing, the network connection is the bottleneck.

## Step 4 - Check Secondary Disk I/O

```bash
# On the secondary host
iostat -xz 5 3
```

Look for high `%util` on the MongoDB data disk. If it is consistently above 80%, the secondary disk is the bottleneck.

## Step 5 - Increase Apply Threads

For write-heavy workloads, increase parallel apply threads on the secondary. This parameter can only be set at startup, not at runtime.

In `mongod.conf`:

```yaml
setParameter:
  replWriterThreadCount: 32
```

Or start `mongod` with:

```bash
mongod --setParameter replWriterThreadCount=32
```

The default is 16. Increasing beyond 16 helps when operations target different documents and collections that can be applied in parallel.

## Step 6 - Identify Hot Documents

If the same documents are updated frequently, operations on them cannot be parallelized. Find hot documents in the oplog:

```javascript
use local
db.oplog.rs.aggregate([
  { $match: { op: "u" } },
  { $group: { _id: "$o2._id", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

High update counts on the same `_id` values indicate write contention that limits parallelism.

## Step 7 - Check for Index Builds on Secondary

Index builds can consume I/O on secondaries and slow oplog application:

```javascript
db.currentOp({ "command.createIndexes": { $exists: true } });
```

Consider running index builds during off-peak hours using rolling index builds.

## Summary

Replication lag has four common root causes: secondary disk I/O saturation, insufficient apply threads, network bottleneck between primary and secondary, and hot-document write contention that prevents parallelism. Use `replSetGetStatus`, `metrics.repl.apply`, and `metrics.repl.buffer` to isolate the bottleneck. Increase apply thread count for parallel workloads, address disk I/O with faster storage, and schedule index builds during off-peak windows.
