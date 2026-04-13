# Validation Summary: How to Implement API Gateway with MongoDB for Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js Driver v6+)
- MongoDB Change Streams
- MongoDB TTL Indexes
- Express.js (middleware pattern)
- Node.js / JavaScript (async/await)

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
1. **Incorrect rate limiting terminology (line 79)**: The section title and description claimed "sliding window rate limiting" but the implementation uses a fixed window counter approach (bucketing by `Math.floor(Date.now() / (windowSeconds * 1000))`). A true sliding window would track individual request timestamps. Changed "sliding window" to "fixed window".

2. **Unused variable in `checkRateLimit` (line 83)**: The variable `windowStart` was declared (`new Date(Date.now() - windowSeconds * 1000)`) but never used anywhere in the function. Removed the dead code.

## Review Notes
- Change streams (used in the `watchRouteChanges` function) require a MongoDB replica set or sharded cluster deployment. This is not mentioned in the post. For a self-hosted single-node dev setup, this would fail. This is not incorrect but could be clarified in a future update.
- The `authenticateApiKey` middleware function takes `db` as a fourth parameter, which is non-standard for Express middleware (typically `(req, res, next)`). This is functional but would require wrapping or currying when registering with Express. This is a style choice, not an error.
- The rate limit TTL of 120 seconds is hardcoded, which may not align with all `windowSeconds` values passed to `checkRateLimit`. This works but could lead to counters expiring before the window ends if `windowSeconds > 120`. Not strictly an error in the code shown, but worth noting for production use.
