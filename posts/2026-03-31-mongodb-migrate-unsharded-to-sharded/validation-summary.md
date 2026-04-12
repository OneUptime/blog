# Validation Summary: How to Migrate an Unsharded Collection to a Sharded Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded clusters, mongos, config servers)
- MongoDB Shell (`mongosh` / `sh.*` helpers)
- MongoDB Sharding (shard keys, chunk splitting, balancer)

## Sources Consulted
- MongoDB sh.enableSharding() docs: https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/
- MongoDB enableSharding command docs: https://www.mongodb.com/docs/manual/reference/command/enablesharding/
- MongoDB reshardCollection docs: https://www.mongodb.com/docs/manual/reference/command/reshardcollection/
- MongoDB Config Database docs: https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Connection String Options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- MongoDB Index Builds on Populated Collections: https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB currentOp command docs: https://www.mongodb.com/docs/manual/reference/command/currentop/
- MongoDB moveRange docs: https://www.mongodb.com/docs/manual/reference/command/moveRange/

## Issues Found

1. **Shard key described as "irreversible" (High severity):** The post stated choosing a shard key is an "irreversible decision." Since MongoDB 5.0, the `reshardCollection` command allows changing the shard key. Fixed the wording to note it is a heavyweight but possible operation.

2. **`config.chunks` query using `ns` field (High severity):** The aggregate query filtered `config.chunks` by `{ ns: "myapp.orders" }`. In MongoDB 5.0+, the `ns` field was replaced by `uuid`. This query would return zero results on modern MongoDB. Fixed to look up the collection UUID from `config.collections` first, then filter chunks by `uuid`.

3. **Connection string included `replicaSet` parameter for mongos (High severity):** The example connection string `mongodb://mongos1:27017,mongos2:27017/myapp?replicaSet=rs0` incorrectly includes `replicaSet`. The `replicaSet` parameter is for replica set connections only; using it with `mongos` routers causes connection failures. Removed the parameter and added a clarifying note.

4. **`sh.enableSharding()` presented as mandatory step (Medium severity):** Starting in MongoDB 6.0, `sh.enableSharding()` is no longer required - the database is automatically enabled for sharding when you shard its first collection. Added a version note clarifying this.

5. **"Background (non-blocking) build" wording for index builds (Low severity):** The `background` index build option was removed in MongoDB 4.2. The post's phrasing implied the old `background: true` option was in play. Reworded to describe the optimized build process accurately.

## Review Notes
- The `currentOp` command used for monitoring index builds (line 46) was deprecated in MongoDB 6.2 in favor of the `$currentOp` aggregation stage. The shown syntax still works but is not the recommended approach for MongoDB 6.2+. Left as-is since it remains functional.
- `sh.moveChunk()` is still valid but MongoDB 6.0+ introduced `sh.moveRange()` as a more capable alternative. Left as-is since `moveChunk` is not formally deprecated.
