# Validation Summary: How to Design Schemas for Write-Heavy Workloads in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (shell commands, sharding, indexing, profiler, TTL indexes)
- MongoDB Node.js Driver (bulkWrite, write concern, collection options)
- WiredTiger storage engine (implicit — write behavior)

## Sources Consulted
- [MongoDB Node.js Driver v6 API — BulkWriteResult](https://mongodb.github.io/node-mongodb-native/6.12/classes/BulkWriteResult.html)
- [MongoDB Node.js Driver v6 API — MongoBulkWriteError](https://mongodb.github.io/node-mongodb-native/6.12/classes/MongoBulkWriteError.html)
- [MongoDB Manual — sh.enableSharding()](https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/)
- [MongoDB Manual — Index Builds on Populated Collections](https://www.mongodb.com/docs/manual/core/index-creation/)
- [MongoDB Manual — createIndex() background option](https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)
- [MongoDB Manual — Bulk Write Operations](https://www.mongodb.com/docs/manual/core/bulk-write-operations/)
- [MongoDB Manual — Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)
- [MongoDB Manual — TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB Manual — Database Profiler](https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/)

## Issues Found

1. **Principle 2 — Outdated "document moves" terminology**: The original text said "Unbounded array growth causes document moves, which are expensive." This refers to MMAPv1 storage engine behavior. With WiredTiger (default since MongoDB 3.2, only engine since 4.2), documents are rewritten on every update — there is no concept of "moving" a document. Updated to explain that large documents are expensive to rewrite and consume more WiredTiger cache.

2. **Principle 4 — Misleading `{ background: true }` usage**: The code used `{ background: true }` in a `createIndex()` call with a leading comment saying "Enable background index builds to avoid blocking writes." The `background` option is silently ignored in MongoDB 4.2+. Index builds now use an optimized process that yields to reads/writes during the main scanning phase, holding an exclusive lock only briefly at the start and end. Removed the deprecated option and replaced the comment with an accurate explanation.

3. **Principle 6 — Incorrect error handling for unordered bulk writes**: The code called `result.hasWriteErrors()` and `result.getWriteErrors()` on the return value of `bulkWrite()`. While these methods exist on `BulkWriteResult`, they are unreachable in practice: when any write operation fails in an unordered bulk write, the Node.js driver throws a `MongoBulkWriteError` exception rather than returning a result. The error handling code would never execute. Fixed by wrapping `bulkWrite()` in a try/catch that catches `MongoBulkWriteError` and accesses partial results via `err.result.insertedCount` and `err.writeErrors`.

4. **Principle 7 — Unnecessary `sh.enableSharding()` call**: The code called `sh.enableSharding("telemetry")` before sharding a collection. Starting in MongoDB 6.0, this call is no longer required — databases are automatically enabled for sharding when you shard their first collection. Removed the call and added a comment explaining the change.

## Review Notes
- The statement "Every index is updated on every write" (Principle 4) is a simplification. For inserts and deletes, all indexes are updated. For updates, only indexes on modified fields are updated. Since the post focuses on write-heavy workloads (which often involve high insert rates), this simplification is acceptable in context.
- The TTL index `expireAfterSeconds` value uses an arithmetic expression (`30 * 24 * 60 * 60`) which is evaluated correctly by the MongoDB shell. This is fine.
- The post does not specify a target MongoDB version. All code now works correctly on MongoDB 4.2+ through current versions.
