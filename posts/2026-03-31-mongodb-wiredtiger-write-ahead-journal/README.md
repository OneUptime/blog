# How to Understand the WiredTiger Write-Ahead Journal in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Journal, Durability, Storage Engine

Description: Understand how WiredTiger's write-ahead journal works in MongoDB, how it ensures durability between checkpoints, and how to configure journaling behavior.

---

The WiredTiger write-ahead journal (WAL) is MongoDB's mechanism for guaranteeing that committed writes survive crashes. Understanding how the journal fits into WiredTiger's durability model helps you make informed trade-offs between performance and data safety.

## Journal Role in the Durability Model

WiredTiger uses a two-phase durability approach:

1. **Journal** - all writes are appended to a journal file on disk before being acknowledged (when `j: true` write concern is used)
2. **Checkpoints** - periodically, a consistent snapshot is written to the main data files

Between checkpoints, the journal records every write operation. If MongoDB crashes before the next checkpoint, it replays the journal from the last checkpoint on startup to restore consistency.

## Journal File Location

By default, journal files are stored in the `journal/` subdirectory of the MongoDB `dbPath`:

```bash
ls -lh /var/lib/mongodb/journal/
# WiredTigerLog.0000000001
# WiredTigerLog.0000000002
```

Each file is up to 100 MB by default. Old files are removed after a checkpoint makes them unnecessary for recovery.

## Journal Commit Interval

WiredTiger commits the journal buffer to disk every 100 milliseconds by default. Writes acknowledged with `j: false` may not yet be in the journal.

```yaml
# mongod.conf - set journal commit interval
storage:
  journal:
    commitIntervalMs: 100
```

Lowering this value increases durability at the cost of more I/O. For maximum durability, use `j: true` write concern - MongoDB waits for the journal to flush before acknowledging the write.

## Checking Journal Status

```javascript
db.serverStatus().wiredTiger.log
```

Key metrics:

```javascript
const log = db.serverStatus().wiredTiger.log;
console.log({
  logBytesWritten:     log["log bytes written"],
  logSyncOperations:   log["log sync operations"],
  logFlushOperations:  log["log flush operations"],
  logWritesRequiringSync: log["log sync_dir operations"]
});
```

## Disabling the Journal

In MongoDB versions prior to 6.1, you could disable journaling on standalone instances for development use:

```yaml
storage:
  journal:
    enabled: false
```

Starting with MongoDB 4.0, journaling cannot be disabled on replica set members. Starting with MongoDB 6.1, the `storage.journal.enabled` option was removed entirely and journaling is always enabled. Without journaling, a crash between checkpoints can result in data loss or corruption requiring `--repair`.

## Journal and Replica Sets

On replica sets, the oplog provides an additional layer of durability through replication. However, the journal protects individual nodes between checkpoints. Using `w: majority` with `j: true` ensures writes are journaled on the majority before acknowledgment.

```javascript
db.collection.insertOne(
  { event: "payment", amount: 500 },
  { writeConcern: { w: "majority", j: true } }
);
```

## Summary

WiredTiger's write-ahead journal records all writes between checkpoints, enabling crash recovery by replaying operations on startup. The journal flushes every 100 ms by default, but using `j: true` write concern forces a synchronous flush before acknowledging writes. Always keep the journal enabled in production. On replica sets, combine `w: majority` with `j: true` for the strongest durability guarantees.
