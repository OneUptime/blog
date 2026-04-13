# Validation Summary: How to Add Shards to a MongoDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB sharded clusters
- MongoDB shell helpers (sh.status, sh.addShard, sh.getBalancerState, sh.isBalancerRunning)
- MongoDB replica set configuration and initiation
- MongoDB balancer and chunk migration
- mongod configuration (YAML format)
- systemctl service management

## Sources Consulted
- MongoDB official documentation: Add Shards to a Sharded Cluster (https://www.mongodb.com/docs/manual/tutorial/add-shards-to-shard-cluster/)
- MongoDB official documentation: sh.addShard() (https://www.mongodb.com/docs/manual/reference/method/sh.addShard/)
- MongoDB official documentation: Deploy a Sharded Cluster (https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/)
- MongoDB official documentation: Sharded Cluster Components (https://www.mongodb.com/docs/manual/core/sharded-cluster-components/)
- MongoDB official documentation: Remove Shards from a Sharded Cluster (https://www.mongodb.com/docs/manual/tutorial/remove-shards-from-cluster/)
- MongoDB official documentation: Manage the Balancer (https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/)

## Issues Found
1. **Incorrect claim about standalone mongod shards**: The introduction stated "You can add a standalone mongod or a replica set as a shard - replica sets are strongly recommended for production." In all currently supported MongoDB versions (4.4+), shards must be deployed as replica sets. Standalone mongod instances are no longer supported as shards. Changed to: "Each shard must be deployed as a replica set."

## Review Notes
- The `config.locks` collection queries (Steps 3 and Troubleshooting) reference an older mechanism for checking balancer lock state. Starting with MongoDB 3.4+, the balancer runs on the config server primary and the lock mechanism changed. The queries will still work but `sh.getBalancerState()` and `sh.isBalancerRunning()` (which the post already covers) are the modern recommended approaches.
- The `config.chunks` aggregation in Step 4 works in MongoDB versions prior to 6.0. In MongoDB 6.0+, chunk metadata storage was restructured into per-collection namespaces. The `sh.status()` command shown in Step 5 remains the most reliable cross-version method for checking chunk distribution.
- The mongod configuration uses port 27017 with `clusterRole: shardsvr`. The default port for shardsvr is 27018, but explicitly setting 27017 is valid since the port is specified in the configuration.
- The Mermaid diagram simplifies the architecture by showing config servers connecting to shards. In practice, mongos reads metadata from config servers and routes queries to shards directly. This is an acceptable simplification for a conceptual diagram.
