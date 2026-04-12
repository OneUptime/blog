# Validation Summary: What Is a Capped Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (capped collections)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB Manual: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: Tailable Cursors — https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB Manual: convertToCapped — https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- MongoDB Node.js Driver: FindOptions — https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **Incorrect claim about `_id` index**: The post stated "No `_id` index by default (but `_id` field still exists)." This is incorrect — MongoDB capped collections have an `_id` field and an `_id` index by default (since at least MongoDB 3.2). Fixed to: "Has an `_id` field and `_id` index by default (like regular collections)."

2. **Outdated claim about deleting documents**: The post stated "Cannot delete individual documents (only drop the whole collection)." Starting in MongoDB 5.0, individual document deletion from capped collections is supported. Updated to note the version-specific behavior.

3. **Incorrect tailable cursor shell example**: The post included `db.application_logs.find({}, { tailable: true, awaitData: true })` as a mongo shell example. In the mongo shell, the second parameter to `find()` is the projection, not cursor options — so `{ tailable: true, awaitData: true }` would be misinterpreted as a projection. Removed the incorrect shell example and kept only the correct Node.js driver example, with a note that tailable cursors are used through application drivers.

## Review Notes
- The `convertToCapped` command is functional but may be deprecated in future MongoDB versions. The post does not specify a version, so this is acceptable as-is.
- `db.collection.stats()` is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage, but it still works in most versions and is commonly referenced. Acceptable for a general tutorial.
