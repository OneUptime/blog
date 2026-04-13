# Validation Summary: How to Move a Chunk Manually in MongoDB Sharding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharding, chunk management)
- MongoDB Shell (mongosh)
- MongoDB config database (config.chunks, config.collections, config.changelog, config.migrations)
- MongoDB admin commands (moveChunk, split, listShards, currentOp, balancerStop/balancerStart)

## Sources Consulted
- MongoDB documentation on moveChunk command: https://www.mongodb.com/docs/manual/reference/command/moveChunk/
- MongoDB documentation on config.chunks collection: https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB documentation on split command: https://www.mongodb.com/docs/manual/reference/command/split/
- MongoDB documentation on managing the balancer: https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB 6.0 release notes (config.chunks schema changes): https://www.mongodb.com/docs/manual/release-notes/6.0/

## Issues Found

1. **`config.chunks` queries used removed `ns` field (Critical)**: All queries against `config.chunks` used `{ ns: "ecommerce.orders" }` to filter by collection. Starting in MongoDB 6.0, the `ns` field was removed from `config.chunks` documents and replaced with `uuid`. Since MongoDB 5.0 reached end-of-life in October 2024, all currently supported versions (6.0, 7.0, 8.0) require using `uuid`. Fixed all three affected locations (Step 1, Step 5, Step 6) to first look up the collection UUID from `config.collections` and then query chunks by `uuid`.

2. **Step 6 projection missing `shard` field (Bug)**: The bulk moves script used `db.chunks.find({ ... }, { min: 1 })` as the projection, but the subsequent loop accessed `chunk.shard` to check if a move was needed. With the `{ min: 1 }` projection, `shard` would be undefined, causing every chunk to be moved regardless of current placement. Fixed by adding `shard: 1` to the projection.

3. **Step 6 missing config database context (Minor)**: The bulk moves code block used `db.chunks.find()` which requires the current database to be `config`, but the code block did not include a `use config` statement. Added `use config` before the chunks query.

## Review Notes
- The `moveChunk` command was deprecated in MongoDB 8.0 in favor of `moveRange`. The command still works in 8.0 but may be removed in a future version. A future update to this post could show the `moveRange` alternative.
- The `_waitForDelete` option is prefixed with underscore, indicating it is an internal/undocumented option. It works but is not part of the stable public API.
- The `sh.stopBalancer(30000)` call is correct for both legacy mongo shell and mongosh, passing a timeout in milliseconds.
- The `config.changelog` queries using `ns` field are correct -- changelog event documents retain the `ns` field to record which namespace was affected, unlike `config.chunks` which dropped it.
- The BSON document comparison used in chunk-finding queries (`min: { $lte: { customerId: "CUST-5000" } }`) is technically valid and works correctly for single-field shard keys via MongoDB's document comparison semantics.
