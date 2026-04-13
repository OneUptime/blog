# Validation Summary: How to Monitor Bulk Operation Performance in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side profiler, currentOp, serverStatus, opcounters)
- MongoDB Node.js Driver (bulk operations API, initializeUnorderedBulkOp)
- JavaScript / Node.js (async/await)

## Sources Consulted
- MongoDB Node.js Driver API documentation for `BulkWriteResult`: https://mongodb.github.io/node-mongodb-native/6.0/classes/BulkWriteResult.html
- MongoDB Node.js Driver API documentation for `UnorderedBulkOperation`: https://mongodb.github.io/node-mongodb-native/6.0/classes/UnorderedBulkOperation.html
- MongoDB Manual — Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual — currentOp: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB Manual — serverStatus: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual — Bulk Write Operations: https://www.mongodb.com/docs/manual/core/bulk-write-operations/

## Issues Found
- **`BulkWriteResult` property names outdated**: The code used `result.nModified` and `result.nUpserted`, which are legacy property names from the MongoDB Node.js driver v3.x. In driver v4+ (current is v6.x), these properties were renamed to `result.modifiedCount` and `result.upsertedCount`. Changed both to the current property names.

## Review Notes
- The post uses `initializeUnorderedBulkOp()` which is still supported but is the older bulk API style. The modern alternative is `collection.bulkWrite()`. Both are valid; no change needed since the legacy API is not deprecated.
- All other code examples (database profiler setup, system.profile queries, currentOp inspection, serverStatus opcounters) are correct and use current APIs.
- The technical advice on batch sizing, write concern trade-offs, ordered vs unordered operations, and index impact on bulk updates is accurate.
