# Validation Summary: How to Use Ordered vs Unordered Bulk Writes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (bulkWrite API)
- MongoDB Node.js Driver (v5/v6)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Node.js Driver - Bulk Operations: https://www.mongodb.com/docs/drivers/node/current/crud/bulk-write/
- MongoBulkWriteError API Reference (v6.8): https://mongodb.github.io/node-mongodb-native/6.8/classes/MongoBulkWriteError.html
- BulkWriteResult API Reference: https://mongodb.github.io/node-mongodb-native/7.0/classes/BulkWriteResult.html
- MongoDB bulkWrite() mongosh Reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/

## Issues Found

### 1. Ordered error handling used non-existent properties on MongoBulkWriteError
- **What was wrong:** The ordered error handling code accessed `err.index` and `err.code` directly on the `MongoBulkWriteError` object. `err.index` does not exist on this error class, and `err.code` returns the overall bulk write error code (65), not the specific write error's code (e.g., 11000 for duplicate key). The comment `err.result.result.nInserted` had a spurious double `.result` and used the legacy `nInserted` property name.
- **What was changed:** Replaced with `err.writeErrors.forEach()` loop accessing `writeErr.index` and `writeErr.code` on individual `WriteError` objects. Changed `err.result.result.nInserted` to `err.result.insertedCount`.
- **Why:** `MongoBulkWriteError` exposes individual write errors via the `writeErrors` array, where each `WriteError` has `index`, `code`, and `errmsg`. The modern Node.js driver (v5+) uses `insertedCount` on `BulkWriteResult`, not the legacy `nInserted`.

### 2. Unordered error handling used legacy result property
- **What was wrong:** `err.result.nInserted` used the legacy/v3 driver property name.
- **What was changed:** Replaced `err.result.nInserted` with `err.result.insertedCount`.
- **Why:** The modern MongoDB Node.js driver (v5+) uses `insertedCount` on `BulkWriteResult`.

## Review Notes
- The performance benchmark code reuses the same `operations` array for both ordered and unordered runs. Since documents don't specify `_id`, both runs succeed, but the unordered run inserts into a collection that already has 10,000 documents from the ordered run, making it not a perfectly fair comparison. This is a minor methodological note and doesn't invalidate the general claim that unordered writes are faster.
- The post mixes mongosh syntax (`db.products.bulkWrite(...)`) and Node.js driver syntax (`await db.collection("data").bulkWrite(...)`), which is common in MongoDB tutorials. The context (use of `await`, `console.time`) makes the Node.js intent clear where applicable.
