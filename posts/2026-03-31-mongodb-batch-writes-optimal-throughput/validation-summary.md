# Validation Summary: How to Batch Writes for Optimal Throughput in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB Node.js Driver (mongodb npm package)
- bulkWrite and insertMany APIs
- Write Concern configuration
- mongostat CLI tool

## Sources Consulted
- MongoDB Node.js Driver v6.x API documentation for `Collection.insertMany()`: https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#insertMany
- MongoDB Node.js Driver v6.x API documentation for `Collection.bulkWrite()`: https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#bulkWrite
- MongoDB Node.js Driver v6.x `BulkWriteResult` class: https://mongodb.github.io/node-mongodb-native/6.0/classes/BulkWriteResult.html
- MongoDB Node.js Driver v6.x `MongoBulkWriteError` class: https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoBulkWriteError.html
- MongoDB Node.js Driver v3 to v4 migration guide (removal of `hasWriteErrors`/`getWriteErrors`): https://www.mongodb.com/docs/drivers/node/current/upgrade/
- MongoDB manual — Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB manual — `mongostat`: https://www.mongodb.com/docs/database-tools/mongostat/

## Issues Found

### Issue 1: Deprecated `nInserted` property (line 94)
- **What was wrong:** The error handler for duplicate key errors used `err.result?.nInserted` to get the count of successfully inserted documents. `nInserted` is a property from the legacy v3.x Node.js driver. In v4+ the `BulkWriteResult` class uses `insertedCount`.
- **What was changed:** Replaced `err.result?.nInserted` with `err.result?.insertedCount`.
- **Why:** Using the legacy property name would return `undefined` with the modern driver, causing inserted count tracking to always fall back to 0.

### Issue 2: Non-existent `hasWriteErrors()` / `getWriteErrors()` methods (lines 138-143)
- **What was wrong:** The "Ordered vs. Unordered Batches" code example called `result.hasWriteErrors()` and `result.getWriteErrors()` on the `BulkWriteResult` object. These methods existed in the v3.x driver but were removed in v4+. In modern drivers, write errors during `bulkWrite` with `ordered: false` cause a `MongoBulkWriteError` exception to be thrown; the result object from a successful call contains no error information.
- **What was changed:** Wrapped the `bulkWrite` call in a try/catch block. On success, errors are reported as 0. In the catch block, `err.result` provides the partial `BulkWriteResult` and `err.writeErrors` provides the array of write errors.
- **Why:** The original code would throw a `TypeError` at runtime (`result.hasWriteErrors is not a function`) when using the Node.js driver v4 or later.

## Review Notes
- The first code example imports `MongoClient` but never uses it, and references an undefined `collection` variable. This is acceptable for a tutorial showing snippets, but a reader copying the code verbatim would need to add the connection setup.
- The duplicate key error check (`err.code === 11000`) in the "Optimal Batch Size" section works in practice but is slightly fragile — the top-level `code` on a `MongoBulkWriteError` is set from the first write error. A more robust check would be `err instanceof MongoBulkWriteError`, but the current approach is a common and widely-used pattern appropriate for a blog post.
- The batch size recommendations (500-2000) and general throughput guidance are reasonable and align with MongoDB best practices.
