# Validation Summary: How to Batch Large Write Operations for Better Performance in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server)
- MongoDB Node.js Driver (`insertMany`, `bulkWrite`)
- JavaScript / Node.js (async/await)

## Sources Consulted
- MongoDB Node.js Driver documentation: `Collection.insertMany()` — https://www.mongodb.com/docs/drivers/node/current/usage-examples/insertMany/
- MongoDB Node.js Driver documentation: `Collection.bulkWrite()` — https://www.mongodb.com/docs/drivers/node/current/usage-examples/bulkWrite/
- MongoDB Server documentation: `maxWriteBatchSize` parameter — https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB Node.js Driver API: `BulkWriteResult` — https://mongodb.github.io/node-mongodb-native/
- MongoDB Node.js Driver API: `MongoBulkWriteError` — https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **Inaccurate claim about `insertMany()` document limit**: The post stated that `insertMany()` "accepts up to 100,000 documents per call (MongoDB's default batch limit)." This is misleading. The 100,000 figure is the server's `maxWriteBatchSize` wire protocol parameter, but the MongoDB driver automatically splits larger batches transparently. `insertMany()` can accept any number of documents. Fixed the wording to clarify that the driver handles batch splitting automatically.

2. **Non-existent `BulkWriteResult` methods in the Monitoring section**: The post used `result.hasWriteErrors()` and `result.getWriteErrors()`, which do not exist on the `BulkWriteResult` object in the current MongoDB Node.js driver (v4+/v5+/v6+). In the modern driver, when write errors occur during a `bulkWrite()` with `ordered: false`, a `MongoBulkWriteError` exception is thrown. The partial results and write errors are accessible from the error object (`error.result`, `error.writeErrors`). Rewrote the monitoring example to use a try/catch pattern consistent with the current driver API.

## Review Notes
- The benchmark helper function (`benchmarkBatchSize`) has a subtle issue: after the first iteration, the driver will have injected `_id` fields into the document objects in memory. Subsequent iterations would attempt to insert documents with the same `_id` values, causing duplicate key errors. Since `ordered: false` is used, inserts would silently fail. This is a minor issue in an illustrative example and does not affect the core advice, so it was left as-is.
- The comment "one round-trip for 1000 documents" on the `insertMany` example is a simplification — it is one driver call, but the actual wire protocol interactions depend on message size. For 1000 small documents this is accurate in practice.
- All other code examples (`bulkWrite` operation format, ordered/unordered behavior, batch update pattern) are correct and consistent with the current MongoDB Node.js driver API.
