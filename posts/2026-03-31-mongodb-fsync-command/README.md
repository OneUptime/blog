# How to Use the fsync Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Command, Administration, Backup, WiredTiger

Description: Learn how to use MongoDB's fsync command to flush dirty pages to disk and optionally lock the database for filesystem-level backups.

---

## What Is fsync?

The `fsync` command instructs MongoDB to flush all pending write operations from memory to disk (the underlying filesystem). It can optionally acquire a write lock, preventing any new writes while the flush is in progress. This makes `fsync` valuable for taking filesystem-level snapshots or backups that require a consistent, fully flushed data directory.

## Running fsync Without a Lock

Flush dirty pages to disk without blocking writes:

```javascript
db.adminCommand({ fsync: 1 })
```

This is rarely needed for WiredTiger because WiredTiger runs checkpoints automatically every 60 seconds. However, you may use it before a storage-level snapshot to reduce the amount of recovery work needed at startup.

## Running fsync With a Lock

Lock the database, flush, and prevent new writes:

```javascript
db.adminCommand({ fsync: 1, lock: true })
```

A successful response looks like:

```json
{
  "info": "now locked against writes, use db.fsyncUnlock() to unlock",
  "lockCount": 1,
  "seeAlso": "http://dochub.mongodb.org/core/fsynccommand",
  "ok": 1
}
```

While the lock is held, any write operation blocks until `fsyncUnlock` is called. Read operations continue without interruption.

## Checking Lock Status

Verify whether a lock is currently active:

```javascript
db.currentOp().fsyncLock
```

Returns `true` if the database is locked. You can also query the admin database:

```javascript
db.getSiblingDB("admin").currentOp().fsyncLock
```

## Unlocking After the Backup

Once the filesystem snapshot is complete, release the lock:

```javascript
db.fsyncUnlock()
```

Or equivalently:

```javascript
db.adminCommand({ fsyncUnlock: 1 })
```

If multiple `fsync` lock calls were stacked, call `fsyncUnlock` the same number of times. Each call to `fsyncUnlock` returns a `lockCount` field showing the number of remaining locks:

```javascript
db.fsyncUnlock()
// Response includes: { "info": "fsyncUnlock completed", "lockCount": NumberLong(1), "ok": 1 }
// When lockCount reaches 0, writes are fully re-enabled.
```

## End-to-End Backup Script

A complete filesystem backup script using the lock:

```bash
#!/bin/bash
MONGO_URI="mongodb://admin:secret@mongo1:27017/?authSource=admin"
SNAPSHOT_PATH="/mnt/backups/mongodb-$(date +%Y%m%d%H%M)"

# Acquire fsync lock
mongosh --quiet "$MONGO_URI" --eval 'db.adminCommand({ fsync: 1, lock: true })'

# Take snapshot (example with LVM)
lvcreate --snapshot --name mongosnap --size 10G /dev/vg0/mongodata

# Release lock
mongosh --quiet "$MONGO_URI" --eval 'db.fsyncUnlock()'

echo "Backup snapshot created at $SNAPSHOT_PATH"
```

## Important Caveats

- `fsync` with `lock: true` must NOT be used on a primary in production if you can avoid it - it blocks all incoming writes. Instead, perform snapshot backups on secondaries.
- WiredTiger does not guarantee a consistent backup by just flushing; you must also freeze the filesystem (e.g., via LVM snapshot or cloud disk snapshot) while the lock is held.
- In replica sets, prefer running `fsync` lock on a secondary to avoid impacting application traffic on the primary.

## Replica Set Backup Strategy

On a secondary member:

```javascript
// Connect to the secondary directly (bypass read preference)
db.adminCommand({ fsync: 1, lock: true });
// Take snapshot
// Then release:
db.fsyncUnlock();
```

Because secondaries can lag behind the primary, verify the `optimeDate` is acceptable before treating this as a current backup.

## Summary

The `fsync` command flushes MongoDB's in-memory dirty pages to disk. When used with `lock: true`, it prevents writes and enables consistent filesystem-level backups. Always run `fsyncUnlock` after the snapshot, prefer running locks on secondaries to avoid impacting writes, and verify lock count before assuming a single `fsyncUnlock` call is sufficient.
