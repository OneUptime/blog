# Validation Summary: How to Use db.printReplicationInfo() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, oplog)
- mongosh / mongo shell
- BSON Timestamp type
- `replSetResizeOplog` admin command

## Sources Consulted
- MongoDB official documentation on `db.printReplicationInfo()` and `rs.printReplicationInfo()` — https://www.mongodb.com/docs/manual/reference/method/db.printReplicationInfo/
- MongoDB official documentation on the oplog — https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB official documentation on `replSetResizeOplog` — https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB BSON Timestamp type documentation — https://www.mongodb.com/docs/manual/reference/bson-types/#timestamps
- mongosh Timestamp API — https://www.mongodb.com/docs/mongodb-shell/reference/data-types/#timestamp

## Issues Found
1. **Incorrect timestamp arithmetic in scripting example** (line 78): The code used `last.ts.getTime()` and `first.ts.getTime()` with a division by `(1000 * 3600)`. This had two problems:
   - **Wrong method**: In `mongosh` (the current standard MongoDB shell), BSON `Timestamp` objects expose the time component via the `.t` property (seconds since epoch), not a `.getTime()` method. The `.getTime()` method existed only in the legacy `mongo` shell.
   - **Wrong unit assumption**: The BSON Timestamp time component is in **seconds**, not milliseconds. Dividing by `1000 * 3600` would produce a result 1000x too small. The correct divisor is `3600` (seconds per hour).
   - **Fix applied**: Changed `(last.ts.getTime() - first.ts.getTime()) / (1000 * 3600)` to `(last.ts.t - first.ts.t) / 3600`.

## Review Notes
- `db.printReplicationInfo()` is deprecated in `mongosh` (since MongoDB 5.0+) in favor of `rs.printReplicationInfo()`. The post covers both but frames `rs.printReplicationInfo()` as "an alias" when it is actually the preferred method. This is not technically wrong but could be clarified in a future update.
- `db.oplog.rs.count()` shown in the "Why Oplog Window Matters" section is deprecated in favor of `countDocuments({})` or `estimatedDocumentCount()`. It still works but emits a deprecation warning in modern shells.
- The `replSetResizeOplog` command syntax and the oplog size recommendation of 24+ hours are accurate.
- The example output format for `db.printReplicationInfo()` is representative and accurate.
