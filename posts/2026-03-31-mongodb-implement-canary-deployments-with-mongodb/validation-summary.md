# Validation Summary: How to Implement Canary Deployments with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- MongoDB Aggregation Framework
- MongoDB Indexes (sparse indexes)
- Feature flags pattern with MongoDB

## Sources Consulted
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB index build process (4.2+ changes): https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB sparse indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB aggregation pipeline operators (`$match`, `$group`, `$cond`, `$avg`, `$sum`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- MongoDB Node.js driver API (`findOne`, `insertOne`, `updateOne`, `aggregate`, `toArray`): https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **Deprecated `background: true` option in `createIndex`**: The `background` option was deprecated in MongoDB 4.2 (August 2019). Starting with 4.2, all index builds use an optimized process that holds and releases locks only at the start and end, yielding to interleaving read/write operations during the build. The `background` option is ignored in 4.2+. Removed `background: true` from the `createIndex` call, keeping only `sparse: true`.

## Review Notes
- The `hashUserId` function used in the feature flag check is referenced but not defined. This is acceptable for a tutorial — it's clear from context that it should be a deterministic hash function. However, readers may benefit from knowing that a simple approach like using a CRC32 or converting a portion of the userId to a numeric value would work.
- The feature flag lookup queries MongoDB on every request. In production, caching the flag value with a short TTL would be advisable to reduce database load, but this is outside the scope of the post.
- All MongoDB driver API usage (`findOne`, `insertOne`, `updateOne`, `aggregate`, `toArray`) is correct for the current Node.js driver.
- The aggregation pipeline is syntactically correct and logically sound.
- The `sparse: true` index explanation is accurate — documents without the `tier` field are excluded from the index.
