# Validation Summary: How to Use CLUSTER SHARDS in Redis to View Shard Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (CLUSTER SHARDS command)
- Redis Cluster architecture (shards, slots, primary/replica topology)
- Python redis-py client library (RedisCluster)

## Sources Consulted
- Official Redis CLUSTER SHARDS documentation: https://redis.io/docs/latest/commands/cluster-shards/
- Official Redis CLUSTER NODES documentation: https://redis.io/docs/latest/commands/cluster-nodes/
- redis-py source code (cluster commands): https://github.com/redis/redis-py/blob/master/redis/commands/cluster.py

## Issues Found
1. **CLUSTER NODES version was incorrect**: The comparison table stated CLUSTER NODES was available since Redis 1.0. Redis Cluster was not introduced until Redis 3.0.0, so CLUSTER NODES has been available since 3.0, not 1.0. Fixed the table entry from "1.0" to "3.0".

2. **Python API calls were incorrect**: All three Python code examples used `redis.Redis` with `r.cluster('shards')`, which is not a valid redis-py API. The correct approach is to use `RedisCluster` from `redis.cluster` and call the `cluster_shards()` method. Fixed all three examples to import `from redis.cluster import RedisCluster`, instantiate `RedisCluster(...)`, and call `r.cluster_shards()`.

## Review Notes
- The sample output structure and field descriptions accurately match the official Redis documentation for CLUSTER SHARDS.
- The health field values (online, failed, loading) are correct per official docs.
- The slot iteration logic in the Python examples correctly handles the flat pair format returned by redis-py.
- The post does not mention additional node fields like `hostname` and `tls-port` that are also returned by CLUSTER SHARDS, but this omission is acceptable for a tutorial-level post.
