# Validation Summary: How to Respond to MongoDB Background Index Build Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB 4.4+
- MongoDB Atlas
- mongosh (MongoDB Shell)
- MongoDB index builds (hybrid build process)

## Sources Consulted
- MongoDB Manual: Index Builds on Populated Collections — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: db.currentOp() — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB Manual: db.collection.getIndexes() — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB Manual: Index Build Process (Hybrid Index Builds) — https://www.mongodb.com/docs/manual/core/index-creation/#index-build-process
- MongoDB Manual: Replica Set Index Builds — https://www.mongodb.com/docs/manual/core/index-creation/#index-builds-on-replica-sets

## Issues Found

1. **`background: true` option in `createIndex` (line 90)**: The `background` option was deprecated in MongoDB 4.2 and is ignored in MongoDB 4.4+. The post itself correctly states that all index builds in 4.4+ are hybrid builds, making the `background: true` option contradictory and misleading. Removed the option from the `createIndex` call.

2. **`buildInProgress` field in `getIndexes()` output (lines 33, 73)**: `getIndexes()` does not return a `buildInProgress` field. In-progress index builds are not visible in `getIndexes()` output; they must be checked via `db.currentOp()` or `db.adminCommand({ currentOp: true })`. Replaced the `getIndexes().filter()` example with a `currentOp` query and updated the Step 3 text to direct readers to use `currentOp`.

3. **"the build resumes from scratch" after replica set restart (line 63)**: In MongoDB 4.4+, index builds are durable. If a `mongod` instance restarts during an index build, the build automatically resumes on startup from where it left off, not from scratch. Corrected this claim.

4. **"Use `writeConcern` after the build" (line 110)**: `writeConcern` is specified as an option on the `createIndex` command itself, not applied as a separate step after the build. Reworded to say "Specify `writeConcern` on the `createIndex` command."

## Review Notes
- The `currentOp` filtering approach in Step 1 and Step 5 is correct and is the recommended way to monitor index builds.
- The aggregation pipeline for finding duplicates is correct and a good practice before creating unique indexes.
- The `dropIndex` / `createIndex` retry pattern in Step 4 is sound advice for recovering from failed builds.
- The post could mention `db.adminCommand({ setIndexCommitQuorum })` for controlling index build commit quorum on replica sets, but this is an enhancement rather than a correction.
