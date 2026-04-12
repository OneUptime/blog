# Validation Summary: How to Rename a MongoDB Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands, aggregation pipeline, admin commands)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual — `cloneCollectionAsCapped` command: https://www.mongodb.com/docs/manual/reference/command/clonecollectionascapped/
- MongoDB Manual — `$out` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB Manual — `db.collection.copyTo()` (deprecated): https://www.mongodb.com/docs/v4.0/reference/method/db.collection.copyTo/
- MongoDB Database Tools — `mongorestore` (--nsFrom/--nsTo): https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Database Tools — `mongodump`: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Manual — `db.updateUser()`: https://www.mongodb.com/docs/manual/reference/method/db.updateUser/

## Issues Found

1. **Method 2 title referenced removed `copyTo()` method.** The section was titled "Using copyTo in mongosh" but the code actually used `$out` aggregation, not `copyTo()`. The `copyTo()` method was deprecated in MongoDB 3.0 and effectively removed in MongoDB 4.2 (it depended on the `eval` command which was removed). Renamed the section to "Using $out Aggregation in mongosh" to match the actual code.

2. **Method 3 (`cloneCollectionAsCapped`) was entirely incorrect.** The section claimed `cloneCollectionAsCapped` could copy collections across databases, but this command only works within the same database. Additionally: (a) it creates capped collections, not regular collections, making it unsuitable for a general database rename; (b) `size: 0` is invalid for capped collections since they require a positive byte size; (c) the namespace syntax `"olddbname.users"` would be interpreted as a literal collection name in the current database, not a cross-database reference. Removed the entire section as it was fundamentally misleading with no correct equivalent adminCommand to replace it.

## Review Notes
- The `$out` cross-database syntax `{ db: "newdbname", coll: collName }` requires MongoDB 4.4+. The post does not mention this version requirement, which could cause confusion for users on older versions. A future update could note this.
- The `--db` flag for `mongodump` has been deprecated in the MongoDB Database Tools 100.x series in favor of connection string URIs, though it still works. This is a minor point and not an error.
- The post correctly notes that `mongorestore` preserves indexes while `$out` does not — this is an important distinction for users choosing between methods.
