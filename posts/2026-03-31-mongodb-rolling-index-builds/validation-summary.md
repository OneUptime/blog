# Validation Summary: How to Perform Rolling Index Builds in MongoDB Replica Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+, 4.4+ recommended)
- MongoDB Replica Sets
- MongoDB Index Management
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: Build Indexes on Replica Sets — https://www.mongodb.com/docs/manual/tutorial/build-indexes-on-replica-sets/
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Index Build Process (4.2+ optimized build) — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: replSetMaintenance command — https://www.mongodb.com/docs/manual/reference/command/replSetMaintenance/
- MongoDB Manual: rs.stepDown() — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB Manual: getReplicationInfo — https://www.mongodb.com/docs/manual/reference/method/db.getReplicationInfo/

## Issues Found

1. **Incorrect claim about MongoDB 4.2+ background index builds (Introduction)**
   - **What was wrong:** The post stated "MongoDB 4.2+ where background index builds are the default." In MongoDB 4.2+, the `background` option was deprecated entirely. MongoDB replaced both foreground and background builds with a new optimized hybrid index build process that holds exclusive locks only at the beginning and end of the build. It is not that "background is the default" — the distinction was removed.
   - **What was changed:** Replaced the claim with "MongoDB 4.2+ where the optimized index build process holds exclusive locks only at the start and end of the build."

2. **Invalid `replSetMaintenance` approach for rolling index builds (Step 2)**
   - **What was wrong:** The post recommended using `db.adminCommand({ replSetMaintenance: true })` as a simpler alternative for MongoDB 4.4+ instead of the standalone restart. This is incorrect for several reasons: (a) Maintenance mode (RECOVERING state) does NOT stop replication — the member continues pulling from the oplog; the post incorrectly claimed it "stops accepting replication." (b) In MongoDB 4.2+, index builds on replica set members are coordinated by the primary, so you cannot independently initiate an index build on a secondary in maintenance mode. (c) The official MongoDB documentation for rolling index builds requires the standalone restart approach for all versions.
   - **What was changed:** Replaced Step 2 with a proper "Shut Down the Secondary" step using `db.shutdownServer()`. Removed the `replSetMaintenance` code and incorrect explanation. Updated Step 3 heading to remove the "MongoDB < 4.4" qualifier since standalone restart is required for all versions.

3. **Deprecated `background: false` option in createIndex (Step 4)**
   - **What was wrong:** The `createIndex` call included `background: false` with a comment "standalone always builds in foreground." While the comment is correct, the `background` option is deprecated in MongoDB 4.2+ and is ignored. Including it is misleading in a post targeting 4.4+.
   - **What was changed:** Removed the `background: false` option from the `createIndex` call. Updated the code comment from "standalone (or maintenance-mode secondary)" to "standalone instance."

4. **Incorrect summary claim about `replSetMaintenance` (Summary)**
   - **What was wrong:** The summary stated "In MongoDB 4.4+ you can use `replSetMaintenance` to simplify the process without a standalone restart," reinforcing the incorrect approach from Step 2.
   - **What was changed:** Replaced with "Always use the standalone restart approach to ensure the index is built independently of replica set coordination."

## Review Notes
- The `rs.secondaryOk()` method used in the original Step 2 was deprecated in MongoDB 5.0 in favor of `db.getMongo().setReadPref()`. This code was removed as part of the `replSetMaintenance` fix, so it is no longer present in the post.
- The `comment` option in `createIndex` was added in MongoDB 4.4, which aligns with the post's recommended version.
- The `rs.stepDown(120)` parameter is `stepDownSecs` — the number of seconds to wait for an eligible secondary to catch up. The default is 60 seconds. The 120 value used is reasonable for production use.
- The `currentOp` monitoring command and `db.getReplicationInfo()` in the "Avoiding Common Pitfalls" section are correct and useful.
- The overall procedure (process secondaries first, step down primary last) correctly follows the MongoDB-recommended rolling index build approach.
