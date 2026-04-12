# Validation Summary: What Is a MongoDB Collection and How It Differs from a Table

## Status
validated

## Post Type
Concept / Comparison Guide

## Technologies Covered
- MongoDB (collections, schema validation, capped collections, time-series collections, indexing, WiredTiger storage engine)
- SQL / Relational databases (tables, schema enforcement, foreign keys)
- JavaScript / mongosh shell
- PostgreSQL (CREATE TABLE syntax with SERIAL, gen_random_uuid())

## Sources Consulted
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: db.collection.renameCollection() — https://www.mongodb.com/docs/manual/reference/method/db.collection.renameCollection/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: $lookup Aggregation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/

## Issues Found

1. **Drop then rename same collection (Section 3, "Dropping and renaming")**: The example called `db.old_orders.drop()` and then `db.old_orders.renameCollection("orders_archive")` on the same collection. After dropping, the collection no longer exists, so the rename would fail. Fixed by changing the rename to use a different collection name (`db.recent_orders.renameCollection("orders_archive")`).

2. **Combined storageEngine and timeseries options (Section 4, "Collection-level settings")**: The example combined `storageEngine` (with WiredTiger config) and `timeseries` options in a single `createCollection()` call. Time-series collections manage their own internal storage via system.buckets collections, making the combined storageEngine configuration misleading. Split into two separate `createCollection()` calls to accurately demonstrate each feature independently.

## Review Notes
- The `DESCRIBE table` entry in the Practical Comparison table is MySQL-specific. PostgreSQL uses `\d table` or queries against `information_schema`. Since the post targets generic SQL concepts, this is acceptable but could be noted in a future revision.
- The async JavaScript example for application-level referential integrity uses `await` with `db.customers.findOne()`, which assumes the Node.js MongoDB driver. In mongosh, `findOne()` returns a document directly without `await`. This is fine since the example is clearly application code (using `async function`), not a shell snippet.
- All MongoDB API usage (`insertMany`, `insertOne`, `createCollection`, `createIndex`, `getIndexes`, `drop`, `renameCollection`, `getCollectionNames`, `countDocuments`, `$jsonSchema`, `$lookup`) is current and non-deprecated.
