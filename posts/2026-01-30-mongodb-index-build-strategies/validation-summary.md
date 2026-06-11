# Validation Summary: How to Build MongoDB Index Build Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB index builds
- MongoDB replica sets
- MongoDB rolling index builds
- mongosh
- MongoDB aggregation with `$currentOp`
- MongoDB server parameters

## Sources Consulted
- MongoDB Manual: Index Builds on Populated Collections - https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: Create a Rolling Index Build on Replica Sets - https://www.mongodb.com/docs/manual/tutorial/build-indexes-on-replica-sets/
- MongoDB Manual: createIndexes command - https://www.mongodb.com/docs/manual/reference/command/createindexes/
- MongoDB Manual: currentOp command and `$currentOp` guidance - https://www.mongodb.com/docs/manual/reference/command/currentop/
- MongoDB Manual: Server Parameters for Self-Managed Deployments - https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual: MongoDB Limits and Thresholds - https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: dropIndexes command - https://www.mongodb.com/docs/manual/reference/command/dropindexes/
- MongoDB Manual: Unique Indexes - https://www.mongodb.com/docs/manual/core/index-unique/

## Issues Found
- The rolling index build procedure incorrectly created indexes directly on replica set secondaries. MongoDB's documented rolling procedure requires taking one member out at a time, restarting it as a standalone on a different port with replica set configuration disabled, building the index, then rejoining it to the replica set. Updated the procedure and checklist accordingly.
- The automated rolling build script attempted to connect to secondaries and run `createIndex()` against them as replica set members, which would fail because secondaries do not accept those writes. Replaced it with a checklist helper that prints the required process-control steps.
- The modern replica set build sequence implied that secondaries build only after the primary commits. Updated the sequence diagram to show replicated start, local secondary builds, and commit quorum.
- The monitoring examples used `db.currentOp()` / the `currentOp` command as the primary approach. MongoDB 6.2+ deprecates the command in favor of the `$currentOp` aggregation stage, so examples now use `$currentOp`.
- The abort example used `killOp`. MongoDB documentation says not to use `killOp` to terminate in-progress index builds in replica sets or sharded clusters; changed the example to use `dropIndex()` / `dropIndexes()`.
- The memory-limit comment incorrectly described `maxIndexBuildMemoryUsageMegabytes` as bytes. Corrected it to megabytes.
- The partial unique index example used `$ne` inside `partialFilterExpression`, which is not a supported partial-index filter operator. Replaced it with a supported `$type: "string"` filter to exclude missing and null email values.
- The pre-build checklist said `db.adminCommand({ dbStats: 1 })` checked available disk space. Changed it to `db.stats()` and described it as database storage statistics.
- The recommendations overstated rolling builds as always preferred for production replica sets. Updated the wording to reflect MongoDB's guidance that rolling builds reduce build impact but add operational risk and lower resiliency.

## Review Notes
The post is now technically valid for modern MongoDB behavior. Some recommendations, such as exact collection-size thresholds and disk-space multipliers, remain operational heuristics rather than MongoDB-enforced rules.
