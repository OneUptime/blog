# Validation Summary: How to Choose Between Ordered and Unordered Bulk Operations in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (bulk write operations)
- MongoDB Node.js Driver (bulkWrite API)
- JavaScript / Node.js

## Sources Consulted
- MongoDB official documentation: Collection.bulkWrite() — https://www.mongodb.com/docs/drivers/node/current/usage-examples/bulkWrite/
- MongoDB Node.js Driver API: BulkWriteResult — https://mongodb.github.io/node-mongodb-native/6.0/classes/BulkWriteResult.html
- MongoDB Node.js Driver API: MongoBulkWriteError — https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoBulkWriteError.html
- MongoDB official documentation: Bulk Write Operations — https://www.mongodb.com/docs/manual/core/bulk-write-operations/

## Issues Found

1. **Performance benchmark missing collection cleanup between runs**: The benchmark inserted 10,000 documents with explicit `_id` values in the ordered run, then attempted to insert the same `_id` values in the unordered run without clearing the collection. The second run would fail entirely with duplicate key errors, making the benchmark invalid. **Fix**: Added `await db.collection("test").drop()` between the two runs.

2. **Incorrect error property `err.index` on MongoBulkWriteError**: The ordered error handling example used `err.index` to access the index of the failed operation. `MongoBulkWriteError` has no top-level `index` property; the failed operation index is available via `err.writeErrors[0].index`. **Fix**: Changed `err.index` to `err.writeErrors[0].index`.

3. **Legacy property `err.result.nInserted` (used twice)**: Both the ordered and unordered error handling examples used `err.result.nInserted`, which is from the legacy MongoDB Node.js driver (v3.x and earlier). The modern driver (v4+/v5+/v6+) uses `err.result.insertedCount` on `BulkWriteResult`. **Fix**: Changed both occurrences of `err.result.nInserted` to `err.result.insertedCount`.

## Review Notes
- The "Ordered: Sequential with Dependencies" example uses two separate `bulkWrite` calls on different collections, each with a single operation. The `ordered: true` flag is irrelevant when there's only one operation — the cross-collection dependency is actually guaranteed by `await`, not by the ordered flag. This is not technically wrong (the code works correctly) but could be pedagogically clearer.
- The hybrid pattern example inserts two documents into the same "data" collection in Group 1, which is a simplified example. In practice, the user/settings pattern would typically involve different collections.
- The 2-3x performance improvement claim for unordered vs ordered is a reasonable general estimate but actual results vary significantly based on cluster topology, write concern, network latency, and operation types.
