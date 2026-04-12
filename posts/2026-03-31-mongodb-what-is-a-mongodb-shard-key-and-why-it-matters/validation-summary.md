# Validation Summary: What Is a MongoDB Shard Key and Why It Matters

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharding subsystem)
- MongoDB Shell (`mongosh` / `mongo` shell helpers)
- MongoDB config database (`config.chunks`, `config.collections`)

## Sources Consulted
- MongoDB official documentation: Shard Keys — https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB official documentation: `sh.shardCollection()` — https://www.mongodb.com/docs/manual/reference/method/sh.shardcollection/
- MongoDB official documentation: `reshardCollection` — https://www.mongodb.com/docs/manual/reference/command/reshardCollection/
- MongoDB official documentation: Config Database — https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Jira SERVER-53105: Remove namespace field from config.chunks — https://jira.mongodb.org/browse/SERVER-53105
- MongoDB official documentation: `sh.shardAndDistributeCollection()` (8.0+) — https://www.mongodb.com/docs/manual/reference/method/sh.shardanddistributecollection/

## Issues Found
1. **Outdated `config.chunks` query using `ns` field**: The section "Checking Chunk Distribution" queried `config.chunks` with `{ $match: { ns: "myapp.orders" } }`. Starting in MongoDB 6.0, the `ns` field was removed from `config.chunks` and replaced by `uuid` (SERVER-53105). The original query only works on MongoDB 5.x and earlier. **Fix**: Added a version comment to the original query clarifying it applies to MongoDB 5.x and earlier, and added a MongoDB 6.0+ alternative that first looks up the collection UUID from `config.collections` and then matches by `uuid` in `config.chunks`.

## Review Notes
- `sh.shardCollection()` is still valid but MongoDB 8.0 introduced `sh.shardAndDistributeCollection()` as a recommended alternative that shards and immediately rebalances. The post's use of `sh.shardCollection()` remains correct for general guidance.
- The statement "Every document must contain the shard key" is technically relaxed starting in MongoDB 4.4 (missing shard key fields are treated as null), but the statement is correct as best-practice guidance since null shard keys cause poor distribution.
- The immutability note correctly mentions that MongoDB 4.2+ allows shard key updates in some cases.
- All `sh.shardCollection()` syntax, `reshardCollection` admin command syntax, and hashed/range/compound shard key examples are correct.
