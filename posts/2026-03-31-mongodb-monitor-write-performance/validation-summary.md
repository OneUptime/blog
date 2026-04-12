# Validation Summary: How to Monitor Write Performance in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server, mongosh)
- MongoDB Database Profiler (`system.profile`)
- MongoDB `serverStatus` command
- MongoDB `currentOp` command
- MongoDB Replica Set monitoring (`rs.status()`, `rs.printSecondaryReplicationInfo()`)
- MongoDB Write Concerns (`w: "majority"`)
- MongoDB `explain()` for write operations
- WiredTiger storage engine

## Sources Consulted
- MongoDB Database Profiler documentation: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB `currentOp` command documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `rs.printSecondaryReplicationInfo()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB `replSetGetStatus` documentation: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/

## Issues Found
1. **Replication lag code mislabeled `optimeDate` as "lag"**: The original code printed `lag=${m.optimeDate}` for each replica set member, but `optimeDate` is an absolute timestamp (the date of the last oplog entry applied), not a lag duration. Fixed by computing actual lag as the difference between the primary's `optimeDate` and each secondary's `optimeDate`, displayed in seconds.

## Review Notes
- The `db.adminCommand({ currentOp: true })` command form is deprecated since MongoDB 6.2 in favor of the `$currentOp` aggregation stage. The blog's approach still works but users on MongoDB 6.2+ may want to use the aggregation alternative.
- The `metrics.getLastError` path in `serverStatus` uses legacy naming from the old `getLastError` command, but it still tracks write concern metrics for modern write commands and is documented as current.
- All profiler and `currentOp` `op` field values ("insert", "update", "remove") were verified against official documentation and are correct for modern MongoDB.
