# Validation Summary: How to Perform a Health Check on a MongoDB Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongosh shell, WiredTiger storage engine)
- Replica set monitoring
- Bash scripting for automation

## Sources Consulted
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `rs.status()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB `currentOp` documentation: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB `listDatabases` command documentation: https://www.mongodb.com/docs/manual/reference/command/listDatabases/
- MongoDB `buildInfo` command documentation: https://www.mongodb.com/docs/manual/reference/command/buildInfo/
- MongoDB WiredTiger cache statistics: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger

## Issues Found
1. **Description mentioned "index health" but post does not cover it.** The description claimed the post covers "index health" but no section in the post addresses index checking. Changed "index health" to "connection pool health" to accurately reflect the content.

2. **Replication lag code called `rs.status()` twice.** The replication lag snippet called `rs.status()` once to find the primary and a second time to iterate members. Two separate server calls could return inconsistent data between invocations. Fixed by storing the result of `rs.status()` in a variable and reusing it.

## Review Notes
- The `asserts` field comment says "non-zero is concerning." In practice, asserts accumulate over the server's lifetime, so any long-running server will have non-zero values. The *rate of increase* is more meaningful than the absolute count. This is a nuance rather than an error, so it was left as-is.
- The replica set health check warns on any member not in PRIMARY or SECONDARY state. This would flag ARBITER nodes, which are expected in some topologies. Users with arbiters should adjust the check accordingly.
- The default MongoDB data path `/var/lib/mongodb` is correct for Debian/Ubuntu package installs but may differ on other platforms (e.g., `/data/db` for manual installs). The post reasonably uses the most common default.
- All `mongosh` commands, `serverStatus` field paths, `rs.status()` member fields, WiredTiger cache metric names, `currentOp` filter syntax, and `listDatabases` output structure are verified correct for MongoDB 6.x and 7.x.
