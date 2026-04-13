# Validation Summary: How to Flush Dirty Pages to Disk in MongoDB

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB `fsync` command
- MongoDB `fsyncLock` / `fsyncUnlock`
- WiredTiger checkpoint configuration
- MongoDB `serverStatus` diagnostics

## Sources Consulted
- MongoDB fsync command reference: https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB configuration options reference: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB WiredTiger engine config IDL (mongo/src/mongo/db/storage/wiredtiger/wiredtiger_global_options.idl) on GitHub
- MongoDB currentOp reference: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- WiredTiger reconfigure API documentation (source.wiredtiger.com)

## Issues Found

### 1. Fabricated `checkpointSizeMB` configuration option
- **What was wrong:** The YAML configuration snippet used `storage.wiredTiger.engineConfig.checkpointSizeMB: 0` to adjust the checkpoint interval. This option does not exist in MongoDB. Using it would cause a startup error.
- **What was changed:** Replaced with `storage.wiredTiger.engineConfig.configString: "checkpoint=(wait=30)"`, which passes the checkpoint interval directly to the WiredTiger engine via the valid `configString` parameter.
- **Why:** The valid WiredTiger engine config options under `storage.wiredTiger.engineConfig` are: `cacheSizeGB`, `journalCompressor`, `directoryForIndexes`, `maxCacheOverflowFileSizeGB`, `configString`, and a few others. There is no `checkpointSizeMB`.

### 2. Incorrect `fsync` command sample output
- **What was wrong:** The sample output for `db.adminCommand({ fsync: 1 })` showed `{ info: 'all dbs flushed', ok: 1 }`. The `info` field only appears when `lock: true` is used (i.e., with `fsyncLock`). A plain `fsync` without lock returns `{ ok: 1 }`.
- **What was changed:** Updated the sample output to `{ ok: 1 }`.
- **Why:** The `info`, `lockCount`, and `seeAlso` fields are specific to the locking variant of the fsync command.

## Review Notes
- The `db.adminCommand({ currentOp: 1 })` command used for checking fsync lock status is deprecated since MongoDB 6.2. The recommended replacement is the `$currentOp` aggregation stage. This is not incorrect for current usage but may warrant a future update.
- The `wiredTigerEngineRuntimeConfig` parameter with `checkpoint=(wait=N)` is functional based on WiredTiger's reconfigure API but is not prominently documented in official MongoDB docs. It is a valid advanced configuration approach.
- The `configString` configuration option is marked as hidden in MongoDB's IDL definitions. It works but is considered an advanced option. The blog could note this caveat in a future revision.
