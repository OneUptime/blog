# How the MongoDB Oplog Works for Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Replica Set, Internal

Description: Learn how the MongoDB oplog enables replication across replica set members, including its structure, write ordering guarantees, and operational implications.

---

The oplog (operations log) is a special capped collection in MongoDB that records every write operation applied to the primary. Secondaries continuously tail the oplog and apply the same operations to stay in sync. Understanding the oplog is essential for managing replication lag, sizing, and change data capture.

## Where the Oplog Lives

The oplog is stored in the `local` database as the `oplog.rs` collection:

```javascript
use local
db.oplog.rs.findOne()
```

Sample oplog entry:

```javascript
{
  "ts": Timestamp(1711800000, 1),
  "t": NumberLong(5),
  "v": 2,
  "op": "i",                        // i=insert, u=update, d=delete, c=command
  "ns": "mydb.orders",
  "ui": UUID("..."),
  "o": { "_id": "order-123", "amount": 99.99, "status": "pending" }
}
```

Key fields:
- `ts` - timestamp of the operation (used for ordering)
- `op` - operation type
- `ns` - namespace (database.collection)
- `o` - the operation document

## How Secondaries Apply the Oplog

Each secondary maintains a pointer to the last oplog entry it applied. It continuously fetches new entries from the primary (or another secondary) and replays them in order:

```text
Primary:    [op1] [op2] [op3] [op4] [op5]
                                         ^-- current
Secondary:  [op1] [op2] [op3]
                              ^-- lag = 2 operations
```

The secondary can parallelize operations across different documents using the `replWriterThreadCount` setting. Operations on the same document are always applied in order.

## Checking Replication Status

```javascript
rs.printReplicationInfo()
// Shows oplog size, oldest entry time, and time until oplog wraps

rs.printSecondaryReplicationInfo()
// Shows lag per secondary member
```

Or use the raw values:

```javascript
db.adminCommand({ replSetGetStatus: 1 }).members.forEach(m => {
  print(m.name, "optime:", m.optime, "optimeDate:", m.optimeDate);
});
```

## Oplog as a Capped Collection

The oplog is a capped collection - it has a fixed maximum size. When it fills up, the oldest entries are overwritten. If a secondary falls so far behind that its last applied entry no longer exists in the primary's oplog, it enters `RECOVERING` state.

Check the oplog window (how far back it covers):

```javascript
rs.printReplicationInfo()
// Output:
// configured oplog size: 5120MB
// log length start to end: 345600secs (96hrs)
// oplog first event time: ...
// oplog last event time:  ...
```

## Idempotency of Oplog Operations

All oplog entries are designed to be idempotent - applying them multiple times produces the same result as applying them once. This is why `$inc` updates are converted to absolute `$set` operations in the oplog:

```javascript
// Application writes:
db.accounts.updateOne({ _id: "alice" }, { $inc: { balance: 50 } });

// Oplog records:
{
  "op": "u",
  "ns": "mydb.accounts",
  "o": { "$v": 2, "diff": { "u": { "balance": 150 } } },  // absolute value
  "o2": { "_id": "alice" }
}
```

## Parallel Oplog Application

By default, secondaries apply oplog entries using multiple writer threads:

```javascript
db.adminCommand({ setParameter: 1, replWriterThreadCount: 16 });
```

Operations on different documents within the same collection can be applied in parallel. Operations on the same document are always applied in order.

## Summary

The MongoDB oplog is a capped collection in the `local` database that records every write applied to a primary in an idempotent, ordered format. Secondaries tail the oplog and replay entries to stay in sync. The oplog window - determined by its size and write rate - defines how long a secondary can be offline before it falls out of sync. Size the oplog to cover at least 72 hours of writes for production replica sets.
