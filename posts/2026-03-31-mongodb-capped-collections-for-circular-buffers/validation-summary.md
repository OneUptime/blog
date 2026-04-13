# Validation Summary: How to Use Capped Collections for Circular Buffers in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors, `$natural` sort)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: db.collection.find() — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual: cursor.tailable() — https://www.mongodb.com/docs/manual/reference/method/cursor.tailable/
- MongoDB Manual: Tailable Cursors — https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB Manual: convertToCapped — https://www.mongodb.com/docs/manual/reference/command/convertToCapped/

## Issues Found
1. **Tailable cursor syntax error (fixed)**: The code passed `{ tailable: true, awaitData: true }` as the second argument to `db.collection.find()`. In mongosh, the second argument to `find()` is the projection parameter, not cursor options. This would have been interpreted as a field projection (including fields named "tailable" and "awaitData"), not as cursor configuration. Fixed by using the correct mongosh cursor modifier methods: `db.recentEvents.find().tailable().awaitData()`.

## Review Notes
- The limitation stating "You cannot update a document in a way that changes its size" may be outdated for MongoDB 4.2+, when the MMAPv1 storage engine was removed. WiredTiger does not have the same in-place update constraint. Current MongoDB documentation recommends creating an index for update operations on capped collections but does not mention a document size growth restriction. The blog's claim was accurate for older versions but readers using MongoDB 4.2+ should verify against current documentation.
- `db.collection.stats()` is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage, though it still functions. Readers on newer versions may want to use `db.recentEvents.aggregate([{ $collStats: { storageStats: {} } }])` instead.
- The `convertToCapped` command is functional but has limited use in production; MongoDB documentation notes it obtains an exclusive collection lock for the duration of the operation.
