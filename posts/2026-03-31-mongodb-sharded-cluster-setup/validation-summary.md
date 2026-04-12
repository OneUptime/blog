# Validation Summary: How to Set Up MongoDB Sharded Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded cluster architecture)
- mongosh (MongoDB Shell)
- mongos (query router)
- MongoDB Node.js Driver
- YAML configuration files

## Sources Consulted
- MongoDB Sharded Cluster documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB Deploy a Sharded Cluster tutorial: https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/
- MongoDB sh.addShard() reference: https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- MongoDB sh.shardCollection() reference: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB sh.enableSharding() reference: https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

### 1. Incorrect mongos connection string (Step 8)
- **What was wrong:** The application connection example declared an unused `uri` variable with `?replicaSet=rs0` in the connection string, while the `MongoClient` was constructed with a separate hardcoded URI. The `replicaSet` parameter must not be used when connecting to mongos routers — it is only for direct replica set connections and would cause the driver to attempt replica set discovery against mongos, leading to connection failures.
- **What was changed:** Removed the unused `uri` variable and updated the `MongoClient` constructor to use a single correct connection string listing both mongos instances without the `replicaSet` parameter: `"mongodb://mongos1:27017,mongos2:27017/"`.
- **Why:** The MongoDB driver interprets `replicaSet` as an instruction to use replica set topology monitoring. When pointed at mongos instances, this is incorrect and can prevent successful connections.

## Review Notes
- `sh.enableSharding()` (Step 5) has been a no-op since MongoDB 6.0 (released July 2023). In MongoDB 6.0+, sharding is automatically enabled on a database when you shard the first collection. The method still works without error, but readers using modern MongoDB versions can skip this step and go directly to `sh.shardCollection()`. The post does not specify a target MongoDB version.
- The `sh.status()` example output in Step 7 only lists 2 hosts per shard (e.g., `shard1a:27018,shard1b:27018`) even though each shard was configured with 3 members. This is cosmetically inconsistent but does not affect correctness — it appears to be truncated for brevity.
- The mermaid diagram shows arrows from Config Servers to Shards labeled "Stores chunk metadata." In reality, config servers store chunk metadata locally and mongos reads it from them to route queries. The metadata is not stored on the shards. This is a minor diagram clarity issue.
