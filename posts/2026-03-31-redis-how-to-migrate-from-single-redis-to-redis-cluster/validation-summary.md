# Validation Summary: How to Migrate from Single Redis to Redis Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- Redis (standalone and Cluster mode)
- Redis CLI (`redis-cli --cluster` commands)
- redis-py (Python Redis client, 4.x+)
- Redis Cluster hash slots and hash tags
- Redis DUMP/RESTORE for data migration

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis Cluster tutorial: https://redis.io/docs/management/scaling/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/clustering.html
- Redis CLI `--cluster` subcommands: https://redis.io/docs/management/cli/#cluster-mode
- Redis DUMP and RESTORE command docs: https://redis.io/commands/dump/ and https://redis.io/commands/restore/

## Issues Found
1. **Migration script used dict format for `startup_nodes` instead of `ClusterNode` objects** (Step 3, custom migration script): `RedisCluster(startup_nodes=[{"host": "127.0.0.1", "port": 7000}])` uses the old `redis-py-cluster` dict format. In redis-py 4.x+, `startup_nodes` requires `ClusterNode` objects. Fixed to `RedisCluster(startup_nodes=[ClusterNode("127.0.0.1", 7000)])` and added `ClusterNode` to the import statement.

2. **Common Pitfalls section used same incorrect dict format**: The inline `python3 -c` command used `startup_nodes=[{'host':'127.0.0.1','port':7000}]`. Fixed to use `ClusterNode('127.0.0.1', 7000)` with the appropriate import, consistent with the application code example in Step 4.

## Review Notes
- The `--cluster-from-user` and `--cluster-from-pass` flags in the `redis-cli --cluster import` command are valid for Redis 7.0+. The post does not specify a Redis version, so readers on Redis 6.x may not have these flags available. The example passes `--cluster-from-pass ""` which is unnecessary when no authentication is needed; users should omit these flags or replace with actual credentials.
- The slot numbers in the hash tag example (slot 9186 for `user:123:profile`, slot 7024 for `user:123:sessions`) are illustrative. The key point that these keys land on different slots is correct.
- The `redis.cluster.key_slot()` function works because `redis/cluster.py` imports `key_slot` from `redis.crc` at module level, making it accessible as a module attribute. A more explicit import would be `from redis.crc import key_slot`, but the current usage is functional.
- The post correctly covers all major pitfalls (KEYS vs SCAN in cluster, SELECT limitation, transaction slot requirements).
