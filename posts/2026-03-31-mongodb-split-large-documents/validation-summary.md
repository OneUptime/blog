# Validation Summary: How to Split Large Documents in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document database, BSON format)
- MongoDB Shell (mongosh) JavaScript API
- MongoDB aggregation framework (`$bsonSize`, `$project`, `$match`, `$count`)
- MongoDB update operators (`$set`, `$unset`, `$push`, `$inc`, `$min`, `$max`)
- MongoDB bucket pattern for time-series data
- MongoDB schema design patterns (subset pattern, vertical splitting)

## Sources Consulted
- MongoDB documentation on BSON document size limit (16MB): https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size
- MongoDB documentation on `$bsonSize` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/
- MongoDB documentation on `$unset` update operator: https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- MongoDB documentation on `updateOne` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB documentation on `$min` and `$max` update operators: https://www.mongodb.com/docs/manual/reference/operator/update/min/
- MongoDB blog on bucket pattern: https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern

## Issues Found
1. **Pattern 2 (Bucket Pattern) — Schema/query mismatch**: The bucket document example used a compound `_id` field (`_id: { deviceId: "sensor_42", hour: ISODate(...) }`) to store `deviceId` and `hour`, but the `updateOne` filter referenced `deviceId` and `hour` as top-level fields. With `upsert: true`, MongoDB would create a document with an auto-generated `_id` and `deviceId`/`hour` as separate top-level fields — contradicting the schema shown. **Fix**: Changed the document schema to use top-level `deviceId` and `hour` fields (instead of nesting them inside `_id`), which is consistent with the `updateOne` filter and is the more common bucket pattern approach.

## Review Notes
- The `db.collection.stats()` method used in the verification section is deprecated in MongoDB 6.0+ in favor of `db.runCommand({ collStats: ... })` or the `$collStats` aggregation stage. It still works in current versions of mongosh for backward compatibility, so this is not an error but worth noting for future updates.
- The vertical splitting migration script (Pattern 3) uses destructuring with `...rest` but silently drops any fields not explicitly named. This is acceptable for a demonstration but in production a more defensive approach would be advisable.
- All code examples use mongosh-compatible JavaScript syntax (arrow functions, template literals, spread operator, optional chaining).
