# Validation Summary: How to Use bulkWrite() for Efficient Batch Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side `bulkWrite` command)
- MongoDB Node.js Driver (`Collection.bulkWrite()` method)
- JavaScript / Node.js (async/await)

## Sources Consulted
- MongoDB official documentation: `db.collection.bulkWrite()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/
- MongoDB Node.js Driver API: `Collection.bulkWrite()` — https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#bulkWrite
- MongoDB Node.js Driver API: `MongoBulkWriteError` — https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoBulkWriteError.html
- MongoDB official documentation: Bulk Write Operations — https://www.mongodb.com/docs/manual/core/bulk-write-operations/

## Issues Found
1. **Misleading error handling claim in "Common Mistakes" section.**
   - **What was wrong:** The post stated that in unordered mode, "partial failures are reported but not thrown unless you check." This implies errors are silently swallowed, which is incorrect. In the Node.js driver, a `MongoBulkWriteError` exception **is** thrown whenever any operation fails in an unordered bulk write. The error object contains both the write errors and the partial success results (via `error.result`).
   - **What was changed:** Rewrote the bullet to accurately state that `MongoBulkWriteError` is thrown and contains both write errors and partial success results that need to be inspected.
   - **Why:** The original wording could lead developers to believe they need to poll or manually check for errors, when in reality they need to catch the thrown exception and inspect its contents.

## Review Notes
- The supported operation types list is complete and correct for all current MongoDB versions.
- All code examples use correct Node.js driver syntax and would work as shown.
- The `BulkWriteResult` properties listed (`insertedCount`, `matchedCount`, `modifiedCount`, `deletedCount`, `upsertedCount`, `upsertedIds`) are all correct for the current Node.js driver.
- The chunking recommendation of 500-1000 operations is conservative but reasonable. MongoDB's internal `maxWriteBatchSize` is 100,000, but smaller chunks are a sensible practice for memory management in application code.
- The class name was also updated from `BulkWriteError` to `MongoBulkWriteError` to match the current Node.js driver v4+ naming convention.
