# Validation Summary: How to Build a Comment System with Nested Replies in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands, CRUD operations)
- MongoDB Aggregation Framework (`$graphLookup`)
- MongoDB Indexing
- Document embedding patterns

## Sources Consulted
- MongoDB documentation on `ObjectId`: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB documentation on `$graphLookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
- MongoDB documentation on `$push`: https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on document size limits: https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size

## Issues Found
- **Invalid ObjectId values**: The post used `ObjectId("c1")` and `ObjectId("c2")` which are invalid. `ObjectId()` requires a 24-character hex string. Using a 2-character string like `"c1"` throws an error in the MongoDB shell. Replaced with valid 24-character hex strings (`"aaaaaaaaaaaaaaaaaaaaaaaa"` and `"bbbbbbbbbbbbbbbbbbbbbbbb"`) for correctness while maintaining readability.

## Review Notes
- The `$graphLookup` usage is correct: `connectFromField: "_id"` and `connectToField: "parentId"` properly traverses the parent-child tree downward from root comments.
- The advice to keep embedded reply arrays under 100 entries is reasonable given MongoDB's 16 MB document size limit.
- The indexing strategy with compound indexes on `{ postId: 1, createdAt: 1 }` and `{ parentId: 1, createdAt: 1 }` is appropriate for the described query patterns.
- The `depthField` explanation is accurate — it adds a numeric field to each result indicating its recursion depth.
