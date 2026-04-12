# Validation Summary: How to Monitor Index Build Progress in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (currentOp, serverStatus, index builds)
- mongosh (JavaScript shell)
- Replica set monitoring

## Sources Consulted
- MongoDB currentOp command documentation: https://www.mongodb.com/docs/manual/reference/command/currentop/
- MongoDB db.currentOp() method documentation: https://www.mongodb.com/docs/manual/reference/method/db.currentop/
- MongoDB serverStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB Index Builds on Populated Collections: https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB $indexStats aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB source code (index_builds_manager.cpp, index_build_interceptor.cpp) for msg string verification
- MongoDB sleep() method documentation: https://www.mongodb.com/docs/manual/reference/method/sleep/

## Issues Found

1. **Fabricated `$indexBuildStats` section (Critical)**: The entire "Using $indexBuildStats (MongoDB 7.0+)" section referenced a feature that does not exist. There is no `$indexBuildStats` aggregation stage or `serverStatus().indexBuildStats` field in any MongoDB version. Replaced the section with the real `serverStatus().indexBuilds` field, which provides aggregate counters (`total`, `killedDueToInsufficientDiskSpace`, `failedDueToDataCorruption`).

2. **Truncated index build msg string (Medium)**: The "draining writes" phase message was listed as `"Index Build: draining writes"` but the actual MongoDB string is `"Index Build: draining writes received during build"`. Corrected to the full string. Also removed the unverified `"Index Build: commit index build"` msg value, which could not be confirmed in MongoDB source code.

3. **Misleading replica set description (Medium)**: The post stated "Each replica set member builds indexes independently," which incorrectly describes the coordination mechanism. Since MongoDB 4.4, index builds are coordinated across replica set members via a commit quorum. Updated to explain the coordinated mechanism while preserving the correct practical advice to monitor each member separately.

4. **Description metadata update**: Removed reference to the non-existent `$indexBuildStats` from the post's description line.

## Review Notes
- The `currentOp` database command is deprecated since MongoDB 6.2 in favor of the `$currentOp` aggregation stage. The post could mention this in a future update.
- The code examples using `db.currentOp()` shell helper still work in mongosh and are the simpler approach, so they remain valid for practical use.
- The time estimation logic is sound but could note that the scan phase rate is not constant (I/O contention, memory pressure can cause fluctuations). This is a minor pedagogical point, not an error.
