# Validation Summary: How to Manage Index Builds in MongoDB (Foreground vs Background)

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (4.0 and earlier, 4.2+)
- MongoDB index creation and management
- MongoDB replica sets and sharded clusters

## Sources Consulted
- MongoDB Manual: Index Build Process — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: db.killOp() — https://www.mongodb.com/docs/manual/reference/method/db.killOp/
- MongoDB Manual: db.collection.stats() — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB Manual: dropIndexes command — https://www.mongodb.com/docs/manual/reference/command/dropIndexes/
- MongoDB Manual: Build Indexes on Replica Sets — https://www.mongodb.com/docs/manual/tutorial/build-indexes-on-replica-sets/

## Issues Found

1. **Incomplete locking description**: The post described only two lock phases (X at start, IX during scan, X at end) but omitted the shared lock (`S`) drain phase that occurs between the IX scan phase and the final X lock. The S lock blocks writes but allows reads. Fixed by adding the drain phase as step 3 in the locking sequence.

2. **Incorrect method for aborting index builds**: The post recommended `db.killOp()` to terminate in-progress index builds. MongoDB documentation explicitly warns against using `killOp` to terminate index builds on replica sets or sharded clusters. The correct approach is to use `db.collection.dropIndex()` or the `dropIndexes` command. Fixed by replacing `db.killOp()` with `db.orders.dropIndex()` and adding a warning against using `killOp`.

3. **Incorrect propagation claim for killOp**: The post stated "On replica sets, killing the build on the primary propagates to secondaries." This is incorrect — propagation works via `dropIndexes`, which creates an `abortIndexBuild` oplog entry that secondaries replicate. Fixed the explanation to describe the correct mechanism.

4. **Missing required option for stats().indexDetails**: The post showed `db.orders.stats().indexDetails` but `indexDetails` is only included in the output when `{ indexDetails: true }` is passed as an option. Without it, the field is not present. Fixed to `db.orders.stats({ indexDetails: true }).indexDetails`.

## Review Notes
- The rolling index build description is a simplification of the full official procedure (which involves hiding the secondary, restarting it as a standalone on a different port, building the index, then rejoining). The post's description is directionally correct but someone following it would need to consult the official docs for the complete steps.
- The `db.collection.stats()` method has been noted as potentially deprecated in favor of the `$collStats` aggregation stage in newer MongoDB versions, but it still works.
