# Validation Summary: How to Audit Database Operations in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (Community and Enterprise editions)
- MongoDB Database Profiler (`system.profile`)
- MongoDB Change Streams
- MongoDB Oplog (`oplog.rs`)
- MongoDB Enterprise Audit Log
- MongoDB Node.js Driver
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Manual: Replica Set Oplog — https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Manual: Auditing (Enterprise) — https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB Manual: Configure Audit Filters — https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB Node.js Driver: BSON Timestamp — https://mongodb.github.io/node-mongodb-native/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/

## Issues Found
1. **Incorrect `Timestamp` constructor in oplog monitoring section (line 71):** `new Timestamp(Date.now() / 1000, 0)` had two problems: (a) it used the deprecated positional constructor form `Timestamp(low, high)` with the arguments in the wrong order — the seconds value was placed in the `low` (increment) position and `0` in the `high` (seconds) position, which would produce an incorrect timestamp; (b) `Date.now() / 1000` produces a floating-point number but the Timestamp constructor expects an integer. Fixed to `new Timestamp({ t: Math.floor(Date.now() / 1000), i: 0 })`, which uses the modern Node.js driver (v4+) object-based constructor with proper integer conversion.

## Review Notes
- Change Streams are correctly noted as available in Community edition, but they do require a replica set or sharded cluster to function. The post does not mention this prerequisite — not incorrect, but readers using a standalone `mongod` may be confused.
- The oplog monitoring example uses `cursor.on("data", ...)` which relies on the cursor implementing Node.js readable stream semantics. This works in driver v4 but behavior may vary in v5+; `for await (const op of cursor)` would be more portable across driver versions.
- The change stream `$match` filter captures "insert", "update", and "delete" but not "replace" operations. This is not wrong (the filter is intentional), but readers should be aware that `replaceOne()` operations produce a "replace" event type, not "update".
- The Enterprise audit filter example is correct for MongoDB's YAML config format and uses valid `authCheck` audit event fields.
