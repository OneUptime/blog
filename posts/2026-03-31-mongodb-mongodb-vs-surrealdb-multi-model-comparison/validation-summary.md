# Validation Summary: MongoDB vs SurrealDB: Multi-Model Database Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, aggregation pipeline, change streams)
- SurrealDB (multi-model database, SurrealQL, graph traversal, live queries)
- MongoDB Node.js Driver
- SurrealDB JavaScript SDK

## Sources Consulted
- MongoDB `insertOne` docs: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB ObjectId docs: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB aggregation pipeline docs: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB change streams docs: https://www.mongodb.com/docs/manual/changeStreams/
- SurrealDB CREATE statement docs: https://surrealdb.com/docs/surrealql/statements/create
- SurrealDB RELATE statement docs: https://surrealdb.com/docs/surrealql/statements/relate
- SurrealDB SELECT / graph traversal docs: https://surrealdb.com/docs/surrealql/statements/select
- SurrealDB LIVE statement docs: https://surrealdb.com/docs/surrealql/statements/live
- SurrealDB JavaScript SDK `live` method docs: https://surrealdb.com/docs/sdk/javascript/methods/live
- SurrealDB math functions docs: https://surrealdb.com/docs/surrealql/functions/math

## Issues Found
1. **Invalid ObjectId string**: `ObjectId("user-123")` is not a valid MongoDB ObjectId. ObjectId requires a 24-character hexadecimal string. The string "user-123" is only 8 characters and contains non-hex characters, which would throw a `BSONError` at runtime. Fixed to `ObjectId("507f1f77bcf86cd799439011")`.

2. **Outdated SurrealDB JavaScript SDK live query API**: The blog used `db.live("orders", (action, result) => {...})` with a callback as the second argument. The current SurrealDB JS SDK does not accept a callback directly in `db.live()`. Instead, `db.live()` returns a subscription object, and you call `.subscribe()` on it to register a listener. Fixed to use `const stream = await db.live("orders"); stream.subscribe(...)`.

## Review Notes
- The MongoDB change stream example uses `change.fullDocument`, which is always available for `insert` operations but only contains the delta for `update` operations by default. To get the full document on updates, `{ fullDocument: 'updateLookup' }` must be passed to `watch()`. This is a minor nuance not worth fixing in a comparison post but worth noting.
- All SurrealQL syntax (CREATE, RELATE, graph traversal with `->`, GROUP BY with `math::sum`) was verified as correct against official docs.
- The MongoDB aggregation pipeline example is correct and follows recommended stage ordering.
- Claims about MongoDB's 2009 production history, SurrealDB's 1.0 release in 2023, and SurrealDB's still-developing distributed capabilities are all accurate.
