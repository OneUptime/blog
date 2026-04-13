# Validation Summary: How to Model a Notification System in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, indexes, aggregation pipeline, TTL indexes)
- MongoDB Shell (mongosh)
- JavaScript/Node.js (code examples)

## Sources Consulted
- MongoDB ObjectId specification: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB `db.collection.find()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB `cursor.sort()` documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- MongoDB `cursor.limit()` documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- MongoDB `createIndex()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `updateMany()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB `$count` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/

## Issues Found

1. **Invalid ObjectId strings (23 hex characters instead of 24)**
   - **What was wrong:** The three ObjectId values in the core schema example (`"64a1b2c3d4e5f6789012345"`, `"64a1b2c3d4e5f6789012346"`, `"64a1b2c3d4e5f6789012347"`) were each 23 hex characters long. MongoDB ObjectIds must be exactly 24 hex characters (12 bytes).
   - **What was changed:** Appended a trailing `0` to each ObjectId string to make them valid 24-character hex strings.
   - **Why:** `ObjectId()` with a 23-character string would throw an error in both mongosh and the Node.js driver.

2. **Incorrect `find()` usage — sort/limit passed as projection argument**
   - **What was wrong:** The query `db.notifications.find(filter, { sort: {...}, limit: 20 })` incorrectly passed sort and limit options as the second argument to `find()`. In the mongo shell, the second argument to `find()` is the projection (field selection), not an options object. Passing `{ sort: ..., limit: ... }` there would be interpreted as a projection, not as query modifiers, and the query would not sort or limit as intended.
   - **What was changed:** Rewrote to use the correct chained cursor method syntax: `.find(filter).sort({ createdAt: -1 }).limit(20)`.
   - **Why:** This is the correct and documented way to apply sort and limit in the mongo shell.

## Review Notes
- The TTL `expireAfterSeconds: 7776000` correctly equals 90 days (90 × 86,400 = 7,776,000 seconds).
- The compound index design and partial index strategy are sound and follow MongoDB best practices.
- The `updateMany` call and aggregation pipeline `$count` usage are correct.
- The post correctly describes the `updateMany` as a "bulk write" in casual terms, though technically MongoDB also has a distinct `bulkWrite()` API — this is a minor terminology note, not an error.
