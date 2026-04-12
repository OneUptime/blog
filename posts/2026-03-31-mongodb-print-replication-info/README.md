# How to Use db.printReplicationInfo() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Oplog, Administration, Replica Set

Description: Learn how db.printReplicationInfo() shows oplog size and time window on the primary, helping you tune replication lag tolerance.

---

## Overview

`db.printReplicationInfo()` displays information about the primary's oplog, including its current size and the time window it covers. This is essential for understanding how long a secondary can lag behind the primary before it falls out of sync and requires a full resync.

```javascript
db.printReplicationInfo()
```

Example output:

```text
configured oplog size:   10240MB
log length start to end: 72000secs (20hrs)
oplog first event time:  Mon Mar 30 2026 10:00:00 GMT+0000
oplog last event time:   Tue Mar 31 2026 06:00:00 GMT+0000
now:                     Tue Mar 31 2026 06:05:00 GMT+0000
```

## Understanding the Output Fields

- **configured oplog size** - The maximum size the oplog is allowed to grow to. The oplog is a capped collection.
- **log length start to end** - How many seconds of operations are retained in the oplog right now.
- **oplog first event time** - The timestamp of the oldest event still in the oplog.
- **oplog last event time** - The timestamp of the most recent write operation.

The time window tells you how much lag a secondary can accumulate before it can no longer replicate from the primary and must resync from scratch.

## Why Oplog Window Matters

If a secondary falls behind by more than the oplog window (due to network issues, maintenance, or heavy write load), it enters RECOVERING state and must perform a full initial sync. A larger oplog window gives you more time to recover a lagging secondary.

```javascript
// Run on the primary to check current window
use local
db.oplog.rs.stats().maxSize  // configured max in bytes
db.oplog.rs.count()          // number of operations
```

## Checking Oplog Size Recommendation

MongoDB recommends an oplog window of at least 24 hours for most deployments. If `printReplicationInfo()` shows a window shorter than your expected maintenance window, increase the oplog size:

```javascript
// Resize oplog (MongoDB 3.6+)
db.adminCommand({
  replSetResizeOplog: 1,
  size: 20480  // 20 GB in MB
})
```

## Using rs.printReplicationInfo() Alias

On newer MongoDB shell versions, `rs.printReplicationInfo()` is an alias that works the same way:

```javascript
rs.printReplicationInfo()
```

## Running in Scripts

You can parse the oplog collection directly for automation:

```javascript
use local
const first = db.oplog.rs.find().sort({ $natural: 1 }).limit(1).next();
const last  = db.oplog.rs.find().sort({ $natural: -1 }).limit(1).next();

const windowHours = ((last.ts.t - first.ts.t) / 3600).toFixed(1);
print(`Oplog window: ${windowHours} hours`);

if (windowHours < 24) {
  print('WARNING: Oplog window is less than 24 hours - consider resizing');
}
```

## Summary

`db.printReplicationInfo()` is a quick diagnostic command that tells you how large your oplog is and how much write history it retains. Monitoring the oplog window helps ensure secondaries can recover from transient lag without requiring a full resync. If the window is too small, increase the oplog size using `replSetResizeOplog` before a maintenance event leaves a secondary unable to catch up.
