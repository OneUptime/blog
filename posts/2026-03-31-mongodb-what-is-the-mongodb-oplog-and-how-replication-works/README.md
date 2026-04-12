# What Is the MongoDB Oplog and How Replication Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Replica Set, High Availability

Description: Learn what the MongoDB oplog is, how replica set replication uses it to synchronize data, and how to monitor and size it correctly.

---

## What Is the Oplog

The oplog (operations log) is a special capped collection in the `local` database on every replica set member. It records all write operations applied to the primary in an idempotent format. Secondary members continuously tail this collection and replay operations to stay in sync.

## How Replication Works

1. A write operation is applied to the primary
2. The operation is recorded as an entry in the primary's oplog
3. Secondary members detect the new oplog entry via a tailable cursor
4. Each secondary fetches and replays the operation
5. Once replayed, the secondary's data matches the primary

## Oplog Entry Format

```javascript
// View recent oplog entries
use local
db.oplog.rs.find().sort({ $natural: -1 }).limit(5).pretty()
```

A typical oplog entry:

```javascript
{
  "lsid": { ... },
  "ts": Timestamp(1743384000, 1),   // when the op occurred
  "t": NumberLong(1),               // term number
  "h": NumberLong(0),
  "v": 2,
  "op": "i",                        // i=insert, u=update, d=delete, c=command
  "ns": "myapp.orders",            // namespace
  "ui": UUID("..."),
  "o": { "_id": ObjectId("..."), "amount": 99.99 }  // the operation
}
```

## Oplog Operation Types

| Code | Operation |
|------|-----------|
| i    | Insert |
| u    | Update |
| d    | Delete |
| c    | Command (createCollection, dropCollection, etc.) |
| n    | No-op |

## Checking Oplog Status

```javascript
rs.printReplicationInfo()
// Shows: oplog size, first event time, last event time, oplog window
```

```javascript
rs.printSecondaryReplicationInfo()
// Shows: lag for each secondary member
```

## Oplog Size

The oplog is a capped collection. When full, oldest entries are overwritten. The window of time covered by the oplog depends on write volume:

- High-write workloads: oplog may only cover hours
- Low-write workloads: oplog may cover weeks

Default size: 5% of free disk, min 1GB, max 50GB.

## Resizing the Oplog

```javascript
// Check current size
use local
db.oplog.rs.stats().maxSize

// Resize (MongoDB 3.6+)
db.adminCommand({ replSetResizeOplog: 1, size: 10240 })  // 10GB in MB
```

## Oplog and Replication Lag

If a secondary falls behind (replication lag), it will eventually go out of sync if the primary's oplog overwrites entries the secondary hasn't replayed yet. Monitor lag:

```javascript
var status = rs.status()
var primary = status.members.find(m => m.stateStr === "PRIMARY")
status.members.forEach(m => {
  if (m.stateStr === "SECONDARY") {
    print(`${m.name}: lag = ${primary.optimeDate - m.optimeDate}ms`)
  }
})
```

## Summary

The MongoDB oplog is a capped collection that records all write operations on the primary. Secondaries tail the oplog and replay operations to maintain data consistency. Oplog window size depends on write volume and allocated disk space. Monitor replication lag and resize the oplog if secondaries frequently fall behind.
