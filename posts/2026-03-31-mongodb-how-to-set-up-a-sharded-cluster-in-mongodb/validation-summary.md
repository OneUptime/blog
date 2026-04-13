# Validation Summary: How to Set Up a Sharded Cluster in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded cluster architecture)
- mongod (config servers and shard servers)
- mongos (query routers)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Sharded Cluster documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB `sh.enableSharding()` deprecation notice: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB 8.0 release notes (removal of `sh.enableSharding()`): https://www.mongodb.com/docs/manual/release-notes/8.0/
- MongoDB `sh.shardCollection()` reference: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB `mongos` reference: https://www.mongodb.com/docs/manual/reference/program/mongos/
- MongoDB config server documentation: https://www.mongodb.com/docs/manual/core/sharded-cluster-config-servers/

## Issues Found
1. **Removed `sh.enableSharding("myapp")` call**: The method `sh.enableSharding()` was deprecated in MongoDB 6.0 and removed in MongoDB 8.0. Starting with MongoDB 6.0, databases are automatically enabled for sharding when you shard their first collection via `sh.shardCollection()`. Since MongoDB 8.0 is the current major release, calling `sh.enableSharding()` would produce an error. Removed the line so the tutorial works on modern MongoDB versions.

## Review Notes
- The architecture overview, all CLI flags (`--configsvr`, `--shardsvr`, `--configdb`), port conventions (27019 for config servers, 27018 for shards, 27017 for mongos), replica set initialization, and `sh.addShard()` syntax are all correct and current.
- The post shows starting only one node per replica set in the bash examples but initializes three-member replica sets in the `rs.initiate()` calls. This is a common tutorial convention (showing one node as representative), but readers should understand they need to repeat the `mongod` command on each host with the appropriate `--bind_ip` and `--dbpath`.
- The hashed shard key (`{ userId: "hashed" }`) is a valid and common choice for even data distribution.
