# Validation Summary: How to Troubleshoot MongoDB Replication Lag

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (Replica Sets, Replication, Oplog)
- mongosh (MongoDB Shell)
- WiredTiger storage engine
- Linux system monitoring tools (top, iostat, sar, mtr)

## Sources Consulted
- MongoDB replSetGetStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB serverStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB hello command documentation (replacement for deprecated isMaster): https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB replica set member states reference: https://www.mongodb.com/docs/manual/reference/replica-states/
- MongoDB replSetResizeOplog documentation: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB rs.printReplicationInfo() and rs.printSecondaryReplicationInfo() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/
- MongoDB replica set configuration (secondaryDelaySecs): https://www.mongodb.com/docs/manual/reference/replica-configuration/

## Issues Found

1. **Deprecated `isMaster` command**: `db.adminCommand({ isMaster: 1 })` was deprecated in MongoDB 5.0 in favor of `db.adminCommand({ hello: 1 })`. Changed to `hello` and updated the example output comment to include the modern `isWritablePrimary` field.

2. **Non-existent `applierBatchSize` field**: `db.adminCommand({ replSetGetStatus: 1 }).applierBatchSize` referenced a field that does not exist in the `replSetGetStatus` output. Removed this line.

3. **Incorrect `lastApplied` field path**: `db.adminCommand({ replSetGetStatus: 1 }).lastApplied` is not a valid field. The correct path is `db.adminCommand({ replSetGetStatus: 1 }).optimes.appliedOpTime`. Fixed accordingly.

4. **Wrong path for replication buffer stats**: `db.serverStatus().repl.buffer` is incorrect. The `repl` section of `serverStatus` contains replica set configuration info, not metrics. Replication buffer statistics are under `db.serverStatus().metrics.repl.buffer`. Fixed the path.

5. **Deprecated field name in print label**: The print statement used `slaveDelay=` as a label while reading the modern `secondaryDelaySecs` field. Changed the label to `secondaryDelaySecs=` for consistency, since `slaveDelay` was renamed in MongoDB 5.0.

6. **Wrong replica set member state number**: The code used `m.state === 6` with the comment `// 6 = STARTUP2 (initial sync)`, but state 6 is actually `UNKNOWN`. State 5 is `STARTUP2` (the initial sync state). Fixed to `m.state === 5`.

7. **Invalid `initialSyncStatus` on member subdocuments**: `m.initialSyncStatus` was accessed on member objects from the `members` array, but `initialSyncStatus` is not a field on member subdocuments. It is a top-level field in the `replSetGetStatus` response, and only available when the command is run on the syncing secondary itself. Fixed to show `state` and `stateStr` for primary-side monitoring, and added a comment about connecting to the secondary for detailed sync status.

## Review Notes
- The `isMaster` command still works as a backward-compatible alias, but new code and tutorials should use `hello` since `isMaster` is officially deprecated.
- The `metrics.repl.buffer` section was reorganized in some MongoDB versions. For MongoDB 5.1+, some of these metrics may have moved or been removed. The post does not target a specific MongoDB version, so this is acceptable.
- The `rs.printSecondaryReplicationInfo()` method replaced the older `rs.printSlaveReplicationInfo()` in MongoDB 4.4.11+. The post correctly uses the modern name.
- The `replSetResizeOplog` size parameter is in megabytes, so `100000` is approximately 97.6 GB, not exactly 100 GB as the comment states. This is close enough to not warrant a fix.
