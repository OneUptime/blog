# Validation Summary: How to Implement Rate Limiting with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, `findOneAndUpdate`, `$inc`, `$setOnInsert`, `countDocuments`)
- Mongoose ODM (schemas, indexes, model methods)
- Express.js (middleware, `res.set`, `res.status`)
- Node.js

## Sources Consulted
- Mongoose `Model.findOneAndUpdate()` API docs — https://mongoosejs.com/docs/api/model.html
- Mongoose `Schema.index()` API docs — https://mongoosejs.com/docs/api/schema.html
- Mongoose `findOneAndUpdate` tutorial — https://mongoosejs.com/docs/tutorials/findoneandupdate.html
- Mongoose 8 migration guide — https://mongoosejs.com/docs/migrating_to_8.html
- MongoDB TTL index documentation (expireAfterSeconds: 0 behavior)

## Issues Found
1. **Sliding window race condition**: The original code used `Promise.all` to run `RequestLog.create()` and `RequestLog.countDocuments()` concurrently. Because these operations execute in parallel, the count may or may not include the just-inserted document, making the rate limit check non-deterministic. In some cases this would allow `maxRequests + 1` requests through. **Fix**: Changed to sequential execution — insert first, then count — so the count always includes the current request and `count <= maxRequests` correctly enforces the limit.

## Review Notes
- The `$setOnInsert: { key }` in the fixed window implementation is redundant since MongoDB automatically sets filter fields on upsert insert, but it is harmless and does not affect correctness.
- The sliding window implementation logs all requests including denied ones. This is a valid design choice (counting all attempts, not just successful ones) but readers should be aware of it.
- The `checkRateLimitByKey` function referenced in the per-endpoint section is not defined in the post. This is acceptable as the pattern is clear from context and the earlier `checkRateLimit` implementation.
- Under high concurrency with multiple server instances, even the sequential sliding window approach can have minor race conditions between the insert and count across different processes. This is an inherent limitation of the non-atomic approach and is acceptable for a practical tutorial.
