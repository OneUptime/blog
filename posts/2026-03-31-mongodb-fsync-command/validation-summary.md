# Validation Summary: How to Use the fsync Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (fsync, fsyncUnlock admin commands)
- WiredTiger storage engine
- mongosh (MongoDB Shell)
- LVM snapshots (Linux Logical Volume Manager)
- Bash scripting for backup automation

## Sources Consulted
- MongoDB official documentation: `fsync` command — https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB official documentation: `fsyncUnlock` command — https://www.mongodb.com/docs/manual/reference/command/fsyncUnlock/
- MongoDB official documentation: `db.fsyncUnlock()` shell method — https://www.mongodb.com/docs/manual/reference/method/db.fsyncUnlock/
- MongoDB official documentation: `serverStatus` command (`globalLock` section) — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#globallock
- MongoDB official documentation: WiredTiger checkpoints — https://www.mongodb.com/docs/manual/core/wiredtiger/#snapshots-and-checkpoints
- MongoDB official documentation: Back Up with Filesystem Snapshots — https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/

## Issues Found

### 1. Incorrect method for checking fsync lock count
- **What was wrong:** The post recommended using `db.adminCommand({ serverStatus: 1 }).globalLock.currentQueue` to check the fsync lock count. The `globalLock.currentQueue` field reports the number of operations *queued waiting for locks* (with sub-fields `total`, `readers`, and `writers`), not the number of stacked fsync locks. This would not tell the user how many `fsyncUnlock` calls are needed.
- **What was changed:** Replaced the incorrect `serverStatus` approach with an explanation that each `fsyncUnlock()` call returns a `lockCount` field in its response, which shows remaining locks. When `lockCount` reaches 0, writes are fully re-enabled. This is the documented and correct way to track stacked fsync locks.
- **Why:** Using `globalLock.currentQueue` would give misleading information. The `lockCount` in the `fsyncUnlock` response is the authoritative way to determine how many locks remain.

## Review Notes
- The `SNAPSHOT_PATH` variable in the end-to-end backup script is defined but never used in any subsequent command. The LVM snapshot is created directly on a named volume. This is not a technical error (the script works), but users may find it confusing that the variable is unused. A future revision could mount the snapshot at `SNAPSHOT_PATH` or remove the unused variable.
- The WiredTiger 60-second checkpoint interval claim is correct (default value of `storage.wiredTiger.engineConfig.checkpointIntervalSecs`).
- All `db.adminCommand()` syntax for `fsync` and `fsyncUnlock` is correct.
- The advice to prefer running fsync lock on secondaries for replica set backups is sound and aligns with MongoDB best practices.
- The note about checking `optimeDate` on secondaries before treating the backup as current is good practical advice.
