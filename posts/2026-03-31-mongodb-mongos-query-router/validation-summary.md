# Validation Summary: How to Use mongos as a Query Router in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- mongos query router
- MongoDB shell (mongosh)
- MongoDB sharding configuration (YAML config files)
- MongoDB connection strings

## Sources Consulted
- MongoDB official documentation on mongos: https://www.mongodb.com/docs/manual/reference/program/mongos/
- MongoDB sharding documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB sh.enableSharding() deprecation: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB config.chunks collection changes: https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB explain() output for sharded clusters: https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found

1. **Incorrect connection string example**: The connection string included `?replicaSet=` (empty parameter) which is incorrect for mongos connections. The post's own text correctly stated not to use `replicaSet`, but the example contradicted that advice. Fixed by removing the `?replicaSet=` parameter entirely.

2. **Deprecated `sh.enableSharding()` command**: The post included `sh.enableSharding("myapp")` which was deprecated in MongoDB 6.0 (became a no-op since databases are automatically enabled for sharding) and removed entirely in MongoDB 8.0. Since this post is dated 2026, this command would not work on current MongoDB versions. Fixed by removing the `sh.enableSharding()` call.

3. **Outdated `config.chunks` query using `ns` field**: The post queried `db.chunks.find({ ns: "myapp.orders" })` but starting in MongoDB 5.0, the `config.chunks` collection uses `uuid` instead of `ns` to identify the source collection. The old query would return no results on modern MongoDB. Fixed by updating to the two-step approach: look up the collection UUID from `config.collections`, then query `config.chunks` by `uuid`.

## Review Notes
- The `explain()` output path `queryPlanner.winningPlan.shards` for verifying targeted vs. broadcast queries is correct for MongoDB 5.0+ sharded explain output, but the exact structure can vary between MongoDB versions.
- The mongos configuration YAML is correct and uses standard fields.
- The general explanation of targeted vs. scatter-gather query routing is accurate.
- The `currentOp` command syntax is correct, though MongoDB also supports the `$currentOp` aggregation stage as a more modern alternative.
