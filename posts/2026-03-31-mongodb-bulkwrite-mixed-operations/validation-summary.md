# Validation Summary: How to Use bulkWrite() with Mixed Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side bulkWrite command)
- MongoDB Node.js Driver (bulkWrite API, BulkWriteResult, MongoBulkWriteError)
- JavaScript / Node.js (async/await patterns)

## Sources Consulted
- MongoDB official documentation: bulkWrite() method reference (https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/)
- MongoDB Node.js Driver documentation: Bulk Write operations (https://www.mongodb.com/docs/drivers/node/current/crud/bulk-write/)
- MongoDB Node.js Driver source code: bulk/common.ts (https://github.com/mongodb/node-mongodb-native/blob/main/src/bulk/common.ts)
- MongoDB CRUD Bulk Write specification (https://github.com/mongodb/specifications/blob/master/source/crud/bulk-write.md)

## Issues Found

1. **Incorrect reference to `result.writeErrors` (line 52)**: The text said to handle partial failures by "inspecting `result.writeErrors`", implying `writeErrors` is a property on the normal `BulkWriteResult`. In fact, `BulkWriteResult` does not have a `writeErrors` property. When partial failures occur in unordered mode, the driver throws a `MongoBulkWriteError`, and the errors are available on `err.writeErrors`. Fixed to reference `MongoBulkWriteError` and `err.writeErrors`.

2. **Misleading 100,000 operation limit claim (line 56)**: The post stated you need to manually chunk operations "to avoid hitting the 100,000 operation limit per `bulkWrite` call." The MongoDB Node.js driver automatically splits operations into server batches of `maxWriteBatchSize` (100,000) transparently. Manual chunking is not required to avoid this limit. Fixed the wording to clarify the driver handles batching automatically, while noting that manual chunking is still useful for memory management and progress tracking.

## Review Notes
- The six supported operation types (insertOne, updateOne, updateMany, replaceOne, deleteOne, deleteMany) are all correctly listed and demonstrated with proper syntax.
- The WriteError properties `index` and `errmsg` used in the error handling example are correct per the driver source code.
- The ETL sync pattern using upserts with `$nin`-based cleanup is a valid and common approach.
- The BulkWriteResult properties (`insertedCount`, `modifiedCount`, `deletedCount`) are correct.
