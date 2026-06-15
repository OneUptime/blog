# Validation Summary: How to Fix 'MOVED' Errors in Redis Cluster

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Redis Cluster
- redis-cli
- redis-py
- ioredis
- Jedis
- Python
- Node.js
- Java

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis CLUSTER KEYSLOT command documentation: https://redis.io/docs/latest/commands/cluster-keyslot/
- Redis CLUSTER SHARDS command documentation: https://redis.io/docs/latest/commands/cluster-shards/
- Redis CLUSTER SLOTS command documentation: https://redis.io/docs/latest/commands/cluster-slots/
- Redis ASKING command documentation: https://redis.io/docs/latest/commands/asking/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py RedisCluster source documentation: https://redis.readthedocs.io/en/stable/_modules/redis/cluster.html
- redis-py production retry guidance: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- ioredis cluster documentation: https://ioredis.readthedocs.io/en/stable/README/
- Jedis official README: https://github.com/redis/jedis

## Issues Found
- The example MOVED response used slot `5474` for key `user:1`, but Redis Cluster key slot calculation maps `user:1` to slot `10778`. Updated all related examples to use `10778`.
- The Python resilient client example used `skip_full_coverage_check`, which is not a current redis-py `RedisCluster` constructor option. Replaced it with `require_full_coverage=False`.
- The Python resilient client example used `cluster_error_retry_attempts`, which is deprecated in current redis-py. Replaced it with a `Retry(ExponentialBackoff(), 3)` object.
- The Jedis example used `JedisCluster`, which is deprecated in current Jedis. Updated the example and summary table to use `RedisClusterClient`.
- The debugging example used `cluster_slots()` and parsed it as a raw nested list. Current redis-py parses `CLUSTER SLOTS` into a dictionary, and Redis 7 deprecates `CLUSTER SLOTS` in favor of `CLUSTER SHARDS`. Updated the debugging code to use `cluster_shards()`.
- The stale slot cache example claimed `cluster_slots()` refreshes slot information. Updated it to say it fetches current topology via `cluster_shards()`.

## Review Notes
- ioredis still documents `scaleReads: 'slave'`, so the example is technically valid even though Redis documentation increasingly uses "replica" terminology.
- `CLUSTER SHARDS` requires Redis 7.0 or later. The updated debugging snippet is current for modern Redis, but Redis 6 deployments would need `CLUSTER SLOTS` or client-specific topology APIs.
