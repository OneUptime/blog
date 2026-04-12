# Validation Summary: How to Monitor and Manage Temporary Storage in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sort and aggregation temporary storage)
- mongosh (MongoDB Shell)
- Linux filesystem management (ext4, mount, fstab)
- Bash scripting

## Sources Consulted
- MongoDB Limits and Thresholds: https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Aggregation Pipeline Limits: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- cursor.allowDiskUse(): https://www.mongodb.com/docs/manual/reference/method/cursor.allowdiskuse/
- db.currentOp(): https://www.mongodb.com/docs/manual/reference/method/db.currentop/
- getCmdLineOpts command: https://www.mongodb.com/docs/manual/reference/command/getcmdlineopts/
- MongoDB 6.0 Compatibility Changes: https://www.mongodb.com/docs/rapid/release-notes/6.0-compatibility/

## Issues Found
1. **Incorrect error name**: The post used `QueryExceededMemoryLimitNoPersistenceAllowed` but the correct MongoDB error name is `QueryExceededMemoryLimitNoDiskUseAllowed`. Fixed the error name on line 18.
2. **Misleading section heading**: The section titled "Monitoring Temp Space with serverStatus" actually demonstrates `db.currentOp()`, not `db.serverStatus()`. Changed the heading to "Monitoring Temp Space with currentOp".

## Review Notes
- In MongoDB 6.0+, `allowDiskUseByDefault` defaults to `true`, meaning sort and aggregation operations automatically spill to disk without requiring explicit `allowDiskUse: true`. The post's opening statement that operations "fail" without `allowDiskUse: true` is accurate for pre-6.0 but not for 6.0+ with default settings. The post does mention the 6.0+ parameter later, but readers may find the opening claim confusing in context of modern MongoDB.
- The `currentOp` filtering by `op.msg.includes("sort")` is not a reliable method for identifying sort operations. The `msg` field is documented for progress messages (e.g., index builds), not sort operations. Using `planSummary` or `command` fields would be more reliable.
- The `cursor: {}` option in the aggregate example is unnecessary for MongoDB 3.6+ where aggregate returns a cursor by default.
- The `currentOp()` method is deprecated since MongoDB 6.2 in favor of the `$currentOp` aggregation stage.
- The monitoring shell script requires admin privileges for the `getCmdLineOpts` command.
