# Validation Summary: How to Handle Errors in Bulk Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (bulk write operations, error handling)
- Node.js MongoDB Driver (v5+/v6)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Node.js Driver API documentation for `BulkWriteResult` — https://mongodb.github.io/node-mongodb-native/6.0/classes/BulkWriteResult.html
- MongoDB Node.js Driver API documentation for `MongoBulkWriteError` — https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoBulkWriteError.html
- MongoDB Manual: Bulk Write Operations — https://www.mongodb.com/docs/manual/core/bulk-write-operations/
- Cross-referenced with other validated blog posts in this repository covering `initializeOrderedBulkOp`, `initializeUnorderedBulkOp`, and `bulkWrite`

## Issues Found
1. **Legacy result property names**: The post used `result.nInserted`, `err.result.nInserted`, `result.nModified`, and `result.nUpserted` — these are legacy property names from the MongoDB Node.js driver v3. The modern driver (v5+/v6) uses `insertedCount`, `modifiedCount`, and `upsertedCount` on `BulkWriteResult`. Fixed all three occurrences:
   - `result.nInserted` → `result.insertedCount` (line 36)
   - `err.result.nInserted` → `err.result.insertedCount` (line 40)
   - `result.nModified` / `result.nUpserted` → `result.modifiedCount` / `result.upsertedCount` (line 71)

## Review Notes
- The post uses the legacy bulk API (`initializeOrderedBulkOp` / `initializeUnorderedBulkOp`) rather than the more modern `collection.bulkWrite()` method. Both APIs are still supported in the current driver, so this is not an error, but the modern `bulkWrite()` API is generally recommended for new code.
- The `getWriteErrors()`, `hasWriteConcernError()`, and `getWriteConcernError()` methods on `BulkWriteResult` are correct and current.
- The `MongoBulkWriteError` class name and its `result` property are correct.
- Error code `11000` for duplicate key errors is correct.
- The retry strategy correctly filters out duplicate key errors (non-transient) and only retries documents that failed for other reasons.
