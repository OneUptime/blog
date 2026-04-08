# Validation Summary: How to Configure the sharding Section in mongod.conf

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB sharded clusters
- mongod.conf configuration (YAML format)
- mongos router configuration
- Config Server Replica Sets (CSRS)
- Shard server replica sets

## Sources Consulted
- MongoDB Manual: sharding.clusterRole configuration option — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-sharding.clusterRole
- MongoDB Manual: Deploy a Sharded Cluster — https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/
- MongoDB Manual: mongos configuration (sharding.configDB) — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-sharding.configDB
- MongoDB Manual: rs.initiate() — https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual: sh.addShard() — https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- MongoDB Manual: getCmdLineOpts command — https://www.mongodb.com/docs/manual/reference/command/getCmdLineOpts/

## Issues Found
1. **Contradictory statement about mongos sharding section**: The text stated that mongos "does not use a `sharding` section" while the YAML example directly below showed a `sharding:` top-level key with `configDB`. This was contradictory. Fixed to clarify that mongos does not use `clusterRole` but does have a `sharding` section containing `configDB`.

## Review Notes
- The `clusterRole` values (`configsvr`, `shardsvr`) are correct and current.
- Default ports (27019 for config servers, 27018 for shard servers) match MongoDB conventions.
- The `rs.initiate()` call for config servers correctly includes `configsvr: true`.
- The `sh.addShard()` format using `"replicaSetName/host:port,host:port"` is correct.
- The `getCmdLineOpts` and `serverStatus` commands are valid ways to verify the sharding role.
- Starting with MongoDB 8.0, config servers can also serve as shard servers (config shard), but the post covers the traditional dedicated config server topology which remains fully supported and is the standard approach.
