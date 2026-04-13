# Validation Summary: How to Work with Clustered Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.3+)
- MongoDB Clustered Collections
- MongoDB TTL (Time-To-Live) expiration
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: Clustered Collections — https://www.mongodb.com/docs/manual/core/clustered-collections/
- MongoDB official documentation: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation: ObjectId.createFromTime() — https://www.mongodb.com/docs/manual/reference/method/ObjectId.createFromTime/

## Issues Found
1. **Misleading ObjectId insert into TTL-enabled collection**: The "Inserting Documents" section showed an ObjectId-based `_id` insert into the `sessionEvents` collection, which was created with `expireAfterSeconds: 3600`. Since TTL on clustered collections requires the `_id` field to be a BSON Date type, an ObjectId `_id` would never be expired by TTL. Changed the second insert example to use the `events` collection (which has no TTL) instead of `sessionEvents`, and updated the comment to clarify it targets a non-TTL clustered collection.

## Review Notes
- The post correctly identifies that clustered collections were introduced in MongoDB 5.3.
- The `clusteredIndex` option syntax (`key: { _id: 1 }`, `unique: true`, optional `name`) is accurate.
- The `expireAfterSeconds` option is correctly placed as a top-level option in `createCollection`, not inside `clusteredIndex`.
- `ObjectId.createFromTime()` usage with `Math.floor(date.getTime() / 1000)` correctly converts milliseconds to the required seconds parameter.
- The `db.collection.stats()` method used in the comparison section is deprecated as of MongoDB 6.2 in favor of the `$collStats` aggregation stage, but still functions. This is acceptable given the post targets MongoDB 5.3+.
- Using `new Date()` as `_id` carries a risk of duplicate key errors if two documents are inserted within the same millisecond, since Date has only millisecond precision. The post doesn't warn about this, but it's a best-practice concern rather than a technical error.
- The limitations listed (no capped collections, `_id`-only cluster key, no conversion from regular collections, Date-only TTL) are all accurate.
