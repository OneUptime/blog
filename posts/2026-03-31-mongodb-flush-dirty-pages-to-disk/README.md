# How to Flush Dirty Pages to Disk in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Administration

Description: Learn how to flush dirty pages and the WiredTiger cache to disk in MongoDB using fsync and serverStatus to ensure data durability before snapshots.

---

MongoDB's WiredTiger storage engine uses an in-memory cache to buffer writes before flushing them to disk. Before taking a filesystem snapshot or performing certain maintenance operations, you need to flush all dirty (unwritten) pages to disk to ensure a consistent on-disk state.

## Understanding Dirty Pages

WiredTiger keeps modified data in its cache until a checkpoint or explicit flush occurs. The cache tracks dirty pages - data modified in memory but not yet written to disk.

Check current dirty cache statistics:

```javascript
db.serverStatus().wiredTiger.cache
```

Look for these fields:

```text
{
  "bytes currently in the cache": 524288000,
  "tracked dirty bytes in the cache": 12345678,
  "tracked dirty pages in the cache": 234
}
```

## Using fsync to Flush Dirty Pages

The `fsync` command flushes all dirty pages and the WiredTiger cache to disk:

```javascript
db.adminCommand({ fsync: 1 })
```

Sample output:

```text
{ ok: 1 }
```

This does not lock the database - writes can continue immediately after.

## Using fsync with Lock (for Snapshots)

Before taking a filesystem snapshot, lock writes and flush dirty pages atomically:

```javascript
db.fsyncLock()
```

This flushes all dirty pages AND prevents new writes, giving you a consistent snapshot point.

```text
{
  info: 'now locked against writes, use db.fsyncUnlock() to unlock',
  lockCount: 1,
  seeAlso: 'http://dochub.mongodb.org/core/fsynccommand',
  ok: 1
}
```

After taking your snapshot, unlock immediately:

```javascript
db.fsyncUnlock()
```

## Checking fsync Lock Status

Verify whether the database is currently locked:

```javascript
db.currentOp()
```

Look for `fsyncLock: true` in the output, or check:

```javascript
db.adminCommand({ currentOp: 1 }).fsyncLock
```

## WiredTiger Checkpoint Behavior

WiredTiger automatically checkpoints (flushes dirty pages) every 60 seconds by default. To adjust the checkpoint interval in the configuration file:

```yaml
storage:
  wiredTiger:
    engineConfig:
      configString: "checkpoint=(wait=30)"
```

Or set at runtime without restarting:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "checkpoint=(wait=30)"
})
```

This changes the checkpoint interval to 30 seconds.

## Monitoring Checkpoint Activity

Track checkpoint frequency in WiredTiger statistics:

```javascript
const stats = db.serverStatus().wiredTiger.transaction
print("Checkpoints:", stats["transaction checkpoint currently running"])
print("Checkpoint max time (ms):", stats["transaction checkpoint max time (msecs)"])
```

## When to Use fsync

- Before taking a filesystem snapshot of the MongoDB data directory.
- Before unmounting a disk containing MongoDB data.
- During controlled maintenance when you need data fully persisted.

Do not use `fsyncLock` in production for extended periods - it blocks all write operations during the lock.

## Summary

Use `db.adminCommand({ fsync: 1 })` to flush dirty pages without blocking writes. Use `db.fsyncLock()` before filesystem snapshots to guarantee a consistent on-disk state, and immediately follow with `db.fsyncUnlock()` after the snapshot completes. WiredTiger checkpoints automatically every 60 seconds under normal operation.
