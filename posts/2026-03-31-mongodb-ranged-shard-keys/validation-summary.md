# Validation Summary: How to Use Ranged Shard Keys in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharding, ranged shard keys)
- MongoDB Shell (`mongosh`) helper methods (`sh.shardCollection`, `sh.splitAt`, `explain()`)

## Sources Consulted
- MongoDB Sharding documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB `sh.enableSharding()` deprecation notes: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB `sh.shardCollection()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB `config.chunks` collection schema changes (5.0+): https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB compound shard key documentation: https://www.mongodb.com/docs/manual/core/sharding-shard-key/#compound-shard-keys
- MongoDB zone sharding documentation: https://www.mongodb.com/docs/manual/core/zone-sharding/

## Issues Found

1. **Removed `sh.enableSharding()` step**: `sh.enableSharding()` was deprecated in MongoDB 6.0 (became a no-op) and removed in MongoDB 8.0. Since MongoDB 8.0+ is current, this command would fail. Removed the step entirely and renumbered the remaining steps.

2. **Incorrect heading "Use a compound key with a hashed prefix"**: The code example `{ customerId: 1, createdAt: 1 }` is a ranged compound key, not a hashed prefix. A hashed prefix would use `{ customerId: "hashed" }`. Changed the heading to "Use a compound key with a high-cardinality prefix" which accurately describes the technique shown.

3. **Misleading heading "Add a zone prefix"**: MongoDB has a specific "zones" feature (formerly tag-aware sharding) for directing data to specific shards. The technique shown (adding a random bucket field) is unrelated to MongoDB zones. Changed to "Add a random bucket prefix" to avoid confusion with the zones feature.

4. **Outdated `config.chunks` query using `ns` field**: Starting in MongoDB 5.0, the `config.chunks` collection uses `uuid` instead of `ns` to identify the parent collection. The original query `db.chunks.find({ ns: "myapp.orders" })` would return no results on MongoDB 5.0+. Updated to first look up the collection UUID from `config.collections`, then query chunks by `uuid`.

## Review Notes
- The post does not specify a target MongoDB version. All fixes bring the content in line with MongoDB 6.0+ / 8.0+ behavior.
- The `sh.splitAt()` method and pre-splitting guidance are correct and still valid.
- The explanation of targeted vs scatter-gather queries is accurate.
- The compound shard key criteria (high cardinality, non-monotonic, query alignment) are sound advice consistent with MongoDB best practices.
