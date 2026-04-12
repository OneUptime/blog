# Validation Summary: How to Monitor Oplog Size and Replication Lag in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB oplog (operations log)
- MongoDB shell (`mongosh` / legacy `mongo` shell)
- `replSetGetStatus` admin command
- `collStats` on `local.oplog.rs`
- Prometheus alerting (with MongoDB exporter)
- `mongostat` CLI tool

## Sources Consulted
- MongoDB official documentation: `rs.printReplicationInfo()` — https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/
- MongoDB official documentation: `rs.printSecondaryReplicationInfo()` — https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB official documentation: `replSetGetStatus` — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB official documentation: `collStats` — https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB official documentation: BSON Timestamp type — https://www.mongodb.com/docs/manual/reference/bson-types/#timestamps
- MongoDB official documentation: `mongostat` — https://www.mongodb.com/docs/database-tools/mongostat/
- Percona MongoDB Exporter metrics reference

## Issues Found
1. **Programmatic Lag Calculation — incorrect use of `optime.ts.getTime()`**: The code used `primary.optime.ts.getTime() - m.optime.ts.getTime()` and divided by 1000. The `optime.ts` field is a BSON `Timestamp`, not a JavaScript `Date`. In the legacy mongo shell, `Timestamp.getTime()` returns seconds since epoch (not milliseconds), so dividing by 1000 produces a value 1000x too small. In `mongosh`, `Timestamp` objects have no `.getTime()` method at all. **Fix:** Changed to use `optimeDate` (a standard JS `Date` object included in `replSetGetStatus` output for each member), where `.getTime()` correctly returns milliseconds, making the `/ 1000` division correct.

## Review Notes
- `rs.printSecondaryReplicationInfo()` was introduced in MongoDB 4.4.1, replacing the deprecated `rs.printSlaveReplicationInfo()`. The post uses the modern name, which is correct for current versions.
- The `lastHeartbeat` field accessed in the "Metrics from replSetGetStatus" section will be `undefined` for the member you are directly connected to (it only exists for remote members). This is expected behavior and not a bug — the output simply shows `undefined` for that field on the self-member.
- The Prometheus metric names (`mongodb_mongod_replset_member_replication_lag`, `mongodb_mongod_replset_oplog_head_timestamp`, `mongodb_mongod_replset_oplog_tail_timestamp`) are consistent with the Percona MongoDB Exporter.
- The `mongostat --rowcount` flag and the `qr`/`qw` column descriptions are accurate.
