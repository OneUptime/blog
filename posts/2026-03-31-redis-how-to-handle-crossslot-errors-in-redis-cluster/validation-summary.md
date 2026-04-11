# Validation Summary: How to Handle CROSSSLOT Errors in Redis Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster (hash slots, CROSSSLOT errors, hash tags)
- Python redis-py (RedisCluster, pipelines)
- Node.js ioredis (Cluster mode)
- Redis Lua scripting (EVAL)
- Redis CLI (CLUSTER KEYSLOT)

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER KEYSLOT command documentation: https://redis.io/commands/cluster-keyslot/
- Redis hash tag documentation: https://redis.io/docs/reference/cluster-spec/#hash-tags
- redis-py RedisCluster API (v4.x+): https://redis-py.readthedocs.io/en/stable/clustering.html
- ioredis Cluster documentation: https://github.com/redis/ioredis#cluster
- CRC16-CCITT algorithm verification via Python implementation

## Issues Found
1. **Incorrect hash slot numbers for `user:1` and `user:2`**: The post claimed `user:1` hashes to slot 8106 and `user:2` hashes to slot 8086. Verified using the CRC16-CCITT algorithm (which Redis uses for slot computation): `user:1` actually hashes to slot 10778 and `user:2` to slot 6777. Corrected both values. The keys do hash to different slots as claimed, so the conceptual point was correct — only the specific numbers were wrong.

2. **Incorrect Python redis-py API usage**: The post used `redis.RedisCluster(startup_nodes=[{"host": "192.168.1.11", "port": 7001}])` with dictionary-style startup nodes. In redis-py 4.x+ (the current major version), `startup_nodes` expects a list of `ClusterNode` objects, not dictionaries. The dictionary style was from the older `redis-py-cluster` package which has been merged into redis-py. Fixed to use `from redis.cluster import RedisCluster, ClusterNode` with `ClusterNode("192.168.1.11", 7001)`.

## Review Notes
- The post mentions `RPOPLPUSH` which was deprecated in Redis 6.2 in favor of `LMOVE`. The post also lists `LMOVE` in the commands section, so both are represented. This is acceptable since `RPOPLPUSH` still exists for backward compatibility.
- The ioredis JavaScript code is correct and uses the current API.
- The Lua script example correctly demonstrates that all KEYS must be in the same slot.
- The list of commands that trigger CROSSSLOT is comprehensive and accurate.
- The trade-offs section accurately describes hot spot risks and availability concerns with hash tags.
