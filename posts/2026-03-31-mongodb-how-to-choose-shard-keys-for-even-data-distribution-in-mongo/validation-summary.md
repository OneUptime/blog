# Validation Summary: How to Choose Shard Keys for Even Data Distribution in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB sharding (shard keys, chunks, zones)
- MongoDB Shell (`mongosh`) commands: `sh.shardCollection()`, `sh.status()`, `sh.addShardToZone()`, `sh.updateZoneKeyRange()`
- MongoDB aggregation framework
- Hashed shard keys vs. ranged shard keys
- Zone-based sharding

## Sources Consulted
- MongoDB Manual — Shard Keys: https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB Manual — Hashed Sharding: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual — Zone Sharding: https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB Manual — sh.shardCollection(): https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual — config.chunks collection: https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB 6.0 Compatibility Changes (removal of `ns` field from `config.chunks`): https://www.mongodb.com/docs/manual/release-notes/6.0-compatibility/

## Issues Found
1. **`config.chunks` query used deprecated `ns` field** — The query to check chunk distribution per shard used `{ $match: { ns: "mydb.orders" } }` against the `config.chunks` collection. Starting in MongoDB 6.0 (released July 2022), the `ns` field was removed from `config.chunks` and replaced with `uuid`. Since MongoDB 5.0 reached end-of-life in October 2024, all currently supported versions require the UUID-based approach. Fixed by first looking up the collection UUID from `config.collections` and then matching on `uuid` in `config.chunks`.

## Review Notes
- The `db.orders.distinct("customerId").length` call is technically correct but will fail if the distinct result exceeds the 16MB BSON document size limit. For very large collections, an aggregation with `$group` and `$count` would be more robust. This is a practical limitation rather than a technical error, and the post uses it in a pre-sharding evaluation context where collection sizes may be manageable.
- All `sh.shardCollection()`, `sh.addShardToZone()`, and `sh.updateZoneKeyRange()` calls use correct syntax compatible with current MongoDB versions.
- The explanation of shard key properties (cardinality, frequency, monotonicity) accurately reflects MongoDB's official documentation.
- The trade-off description for hashed sharding (good write distribution, no range queries) is accurate.
