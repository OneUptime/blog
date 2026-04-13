# Validation Summary: How to Organize Collections by Feature or Domain in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB
- MongoDB Node.js Driver
- JavaScript / Node.js
- MongoDB Schema Design patterns (domain-driven collection grouping, repository pattern)
- MongoDB TTL indexes, compound indexes, unique indexes

## Sources Consulted
- MongoDB `$lookup` aggregation stage documentation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Node.js Driver `MongoClient.startSession()` API — https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB TTL Indexes documentation — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `createIndex()` documentation — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- Node.js `module.exports` / `require` semantics — https://nodejs.org/api/modules.html

## Issues Found

1. **Contradictory `$lookup` comments (lines 55-57)**: The original comments first stated "Cross-domain lookup uses $lookup with from qualified by database" then immediately said "$lookup must reference a collection in the same database." These two statements contradict each other. Since MongoDB 5.1+, `$lookup` supports cross-database joins via `from: { db: "<db>", coll: "<coll>" }`. Fixed by replacing the contradictory comments with an accurate note about MongoDB 5.1+ cross-database `$lookup` support and the application-code alternative for broader compatibility.

2. **`module.exports` / `require` destructuring mismatch (lines 87-90)**: The code exported `module.exports = COLLECTIONS` (the object directly) but then imported with `const { COLLECTIONS } = require("./collections")`, which destructures a property named `COLLECTIONS` from the object — this would be `undefined` since the exported object is the COLLECTIONS object itself, not a wrapper. Fixed by changing the import to `const COLLECTIONS = require("./collections")`.

3. **Internal driver API usage for session creation (line 114)**: `this.orders.s.db.client.startSession()` reached into the MongoDB driver's internal `.s` property, which is not part of the public API and may break across driver versions. Fixed by passing the `MongoClient` instance into the `OrderRepository` constructor and calling `this.client.startSession()` directly, which is the documented public API.

## Review Notes
- The TTL index with `expireAfterSeconds: 0` is correct — documents expire at the exact time specified by the `expiresAt` field value.
- The overall architectural advice (domain grouping, namespace constants, repository pattern) is sound and well-presented.
- The `session.withTransaction()` usage is correct but does not call `session.endSession()` after the transaction completes. In production code, a `try/finally` block to end the session would be advisable, but this is a style concern rather than a correctness bug in the context of a blog example.
