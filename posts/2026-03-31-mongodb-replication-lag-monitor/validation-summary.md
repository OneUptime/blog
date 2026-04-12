# Validation Summary: How to Monitor Replication Lag in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, replication, oplog)
- mongosh (MongoDB Shell)
- mongostat (MongoDB CLI monitoring tool)
- MongoDB Atlas / Ops Manager

## Sources Consulted
- MongoDB official documentation for `replSetGetStatus` (rs.status()): https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB official documentation for `serverStatus`: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation for `currentOp`: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB official documentation for `rs.printSecondaryReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB official documentation for `replSetResizeOplog`: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- mongostat source code (mongo-tools repository `stat_headers.go`) for column definitions
- MongoDB 5.0 release notes for `ismaster` to `isWritablePrimary` deprecation

## Issues Found

1. **Method 4 - Invalid `currentOp` filter on primary (line ~93):** The filter `"command.repl": { $exists: true }` is not a documented or valid field in `currentOp` output. There is no `command.repl` field in MongoDB's `currentOp` response. Changed to `"ns": "local.oplog.rs"` which correctly filters for oplog read operations (from secondaries fetching oplog entries). Also updated the comment from "view active replication workers" (replication workers run on secondaries, not the primary) to "view oplog read operations from secondaries".

2. **Method 5 - Wrong field names in `serverStatus` output (lines ~112-119):** Three sub-issues:
   - `replStats.ismaster` is deprecated since MongoDB 5.0. Changed to `replStats.isWritablePrimary`.
   - `stats.repl.opTimes` (camelCase) with sub-fields `applied`, `durable`, `lastCommitted` does not exist in `serverStatus` output. The `optimes` field (lowercase, with `appliedOpTime`, `durableOpTime`, `lastCommittedOpTime`) exists in `replSetGetStatus`, not `serverStatus`. Replaced with `stats.repl.lastWrite` which is the correct `serverStatus` field, containing `opTime`, `lastWriteDate`, `majorityOpTime`, and `majorityWriteDate`.

3. **Method 6 - False claim about mongostat `lagms` field (line ~136):** The post stated mongostat shows a `lagms` field in newer versions. This is incorrect — mongostat has never had a `lagms` column. The `repl` column only shows replica set member state (PRI, SEC, REC). Removed the false claim and directed readers to use `rs.status()` for actual lag values.

4. **Section title "Investigating Lag with explain()" (line ~194):** The section does not use `explain()` at all — it demonstrates connecting to a secondary and using `currentOp` to find slow operations. Renamed to "Investigating Lag on Secondaries" to accurately reflect the content.

## Review Notes
- The `ismaster` field in `serverStatus().repl` still works as a deprecated alias in MongoDB 5.0+, but the post should use current terminology since it doesn't target a specific older version.
- Method 3 (Oplog Comparison) requires connecting to primary and secondary separately to compare timestamps. The code comments note this, but readers should understand this cannot be run from a single connection.
- The alert thresholds table provides reasonable general guidance but these are not official MongoDB recommendations — they are best-practice suggestions that may vary by workload.
- `rs.printSecondaryReplicationInfo()` was renamed from `rs.printSlaveReplicationInfo()` in MongoDB 4.4.1+. The post correctly uses the newer name.
