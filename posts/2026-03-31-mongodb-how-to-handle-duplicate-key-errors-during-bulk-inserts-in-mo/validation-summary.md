# Validation Summary: How to Handle Duplicate Key Errors During Bulk Inserts in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side duplicate key error E11000)
- MongoDB Node.js Driver (insertMany, bulkWrite APIs)
- JavaScript / Node.js (async/await patterns)

## Sources Consulted
- MongoDB Node.js Driver API documentation for `BulkWriteResult` (https://mongodb.github.io/node-mongodb-native/)
- MongoDB Node.js Driver API documentation for `MongoBulkWriteError` and `WriteError`
- MongoDB Server documentation on `insertMany` (https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/)
- MongoDB Server documentation on `bulkWrite` (https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/)
- MongoDB Server documentation on `$setOnInsert` (https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/)
- MongoDB Server documentation on unique indexes (https://www.mongodb.com/docs/manual/core/index-unique/)

## Issues Found
1. **`err.result.nInserted` is a legacy API property (3 occurrences).** The `nInserted` property belongs to the MongoDB Node.js driver v3.x `BulkWriteResult` API. In the current driver (v4+/v5+/v6+), the property is `insertedCount`. Changed all three occurrences of `err.result.nInserted` to `err.result.insertedCount`.

2. **`e.err.keyValue` is not a valid property path on `WriteError`.** In the compound unique index error handling example, the code accessed `e.err.keyValue`, but `WriteError` objects do not have an `.err` sub-property. Changed to `e.errmsg`, which is the documented property containing the full error message (including duplicate key details).

## Review Notes
- The pre-filtering approach (`insertNewOnly` function) has an inherent TOCTOU race condition between checking existing IDs and inserting new documents. The post mitigates this by using `{ ordered: false }` on the final insert, but does not explicitly mention the race. This is acceptable for a tutorial but worth noting.
- The compound index example mixes `await` (for `insertMany`) with a non-awaited `createIndex` call. This is fine as illustrative code showing the index definition separately from the error handling logic.
- All patterns shown (ordered/unordered inserts, upsert, replace, $setOnInsert, pre-filtering, metrics logging) are valid and well-established MongoDB patterns.
