# Validation Summary: How to Monitor MongoDB Sharding with sh.status()

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB 7.0 (sharded cluster)
- `sh.status()` shell helper
- `config` database collections (`chunks`, `shards`, `collections`, `changelog`, `mongos`)
- MongoDB aggregation framework
- `mongosh` shell

## Sources Consulted
- MongoDB Manual: `sh.status()` — https://www.mongodb.com/docs/manual/reference/method/sh.status/
- MongoDB Manual: `config.chunks` collection — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB Manual: `config.collections` collection — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.collections
- MongoDB 5.0 Release Notes (removal of `ns` field from `config.chunks`) — https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB 6.1 Release Notes (removal of auto-splitting) — https://www.mongodb.com/docs/manual/release-notes/6.1/
- MongoDB Manual: Balancer — https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/

## Issues Found

1. **`autosplit` section in sample `sh.status()` output**: The sample output showed an `autosplit: Currently enabled: yes` section, but the mongos version displayed was "7.0.4". Auto-splitting was removed in MongoDB 6.1 and this section no longer appears in `sh.status()` output for MongoDB 6.1+. Removed the `autosplit` section from the sample output.

2. **`config.chunks` queries using `$ns` field**: All aggregation queries on `config.chunks` referenced `$ns` to identify the collection namespace. Starting in MongoDB 5.0, the `ns` field was removed from `config.chunks` and replaced by `uuid`. Since the post targets MongoDB 7.0, updated all chunk queries to use `$lookup` against `config.collections` on the `uuid` field to resolve collection namespaces.

3. **`use config` inside function body**: The `shardingHealthCheck()` function contained `use config`, which is a `mongosh` shell-level command that cannot be used inside a JavaScript function body (it would cause a syntax error). Replaced with `var configDb = db.getSiblingDB('config')` and updated all collection references within the function to use `configDb` instead of `db`.

4. **`{ dropped: false }` filter on `config.collections`**: The "Checking Collection Sharding Config" section filtered `config.collections` with `{ dropped: false }`. Starting in MongoDB 5.0, the `dropped` field was removed from `config.collections` — dropped collections are simply deleted from this collection. This filter would return no results on MongoDB 5.0+. Replaced with an empty filter `{}`.

## Review Notes
- The `config.changelog` queries correctly use the `ns` field, which is still present in changelog documents (unlike `config.chunks`).
- The `sh.getBalancerState()` and `sh.isBalancerRunning()` calls are correct and supported in `mongosh`.
- The `config.mongos` ping-based stale detection query is a valid monitoring pattern.
- The post could benefit from mentioning `db.collection.getShardDistribution()` as a simpler per-collection alternative, but this is not an error.
