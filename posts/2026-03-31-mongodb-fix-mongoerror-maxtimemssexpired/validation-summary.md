# Validation Summary: How to Fix MongoError: MaxTimeMSExpired in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (server and query engine)
- MongoDB Node.js Driver (v4+)
- MongoDB Aggregation Framework (`$match`, `$lookup`, `$group`, `$project`)
- MongoDB Atlas (cluster-level configuration)
- MongoDB Indexing (`createIndex`, `explain`)

## Sources Consulted
- MongoDB documentation on `maxTimeMS`: https://www.mongodb.com/docs/manual/reference/method/cursor.maxTimeMS/
- MongoDB documentation on error codes (code 50 / MaxTimeMSExpired): https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB documentation on `explain()`: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB documentation on aggregation pipeline optimization: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB documentation on `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB documentation on `currentOp`: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB documentation on `defaultMaxTimeMS` server parameter: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.defaultMaxTimeMS
- MongoDB documentation on read concern levels: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Node.js Driver API reference for `AggregateOptions` and `FindCursor`: https://mongodb.github.io/node-mongodb-native/

## Issues Found
No technical issues found.

## Review Notes
- The claim that `defaultMaxTimeMS` "requires MongoDB 8.0+" for Atlas may be slightly conservative. This parameter was introduced for `mongos` in earlier versions (around MongoDB 6.0) and expanded in subsequent releases. The exact Atlas availability boundary depends on the deployment type, but the advice is safe if conservative.
- The "Lock Contention" section (Cause 4) simplifies WiredTiger's concurrency model. WiredTiger uses document-level locking with MVCC, so reads do not typically block on write locks. However, under very heavy write load, storage engine ticket exhaustion and I/O contention can still delay reads, making the practical advice (route analytics queries to secondaries) sound.
- Read concern `"local"` is the default for primary reads, so explicitly setting it would not change behavior. Read concern `"available"` bypasses causal consistency guarantees and may return orphaned documents on sharded clusters, which is a trade-off worth mentioning for completeness. However, neither read concern directly addresses lock/ticket contention - the more impactful advice is routing to secondaries via read preference, which the post does recommend.
- The directory name contains a typo ("maxtimemssexpired" with double 's') compared to the actual MongoDB error code name "MaxTimeMSExpired". This is cosmetic and does not affect the post content.
