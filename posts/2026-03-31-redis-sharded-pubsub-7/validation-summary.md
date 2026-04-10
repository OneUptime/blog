# Validation Summary: How to Use Sharded Pub/Sub in Redis 7

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0 (Sharded Pub/Sub: SSUBSCRIBE, SPUBLISH, PUBSUB SHARDCHANNELS, PUBSUB SHARDNUMSUB)
- redis-py (Python Redis client, RedisCluster)
- ioredis (Node.js Redis client, Cluster mode)

## Sources Consulted
- https://redis.io/docs/latest/commands/ssubscribe/ — SSUBSCRIBE command reference (confirmed available since Redis 7.0.0)
- https://redis.io/docs/latest/commands/spublish/ — SPUBLISH command reference (confirmed available since Redis 7.0.0)
- https://redis.io/docs/latest/commands/pubsub-shardchannels/ — PUBSUB SHARDCHANNELS subcommand reference
- https://redis.io/docs/latest/commands/pubsub-shardnumsub/ — PUBSUB SHARDNUMSUB subcommand reference
- https://redis.io/docs/latest/develop/interact/pubsub/ — Official Redis Pub/Sub documentation (confirmed fan-out behavior of classic Pub/Sub and hash-slot routing of sharded Pub/Sub)
- https://github.com/redis/redis-py (master branch) — redis-py source code for RedisCluster constructor and ClusterPubSub API
- https://github.com/redis/ioredis — ioredis README and CHANGELOG for sharded pub/sub support history

## Issues Found

1. **Python `startup_nodes` used dictionaries instead of `ClusterNode` objects**: Both Python examples passed `startup_nodes=[{"host": "127.0.0.1", "port": "7001"}]` to `RedisCluster`. The `startup_nodes` parameter requires a list of `ClusterNode` objects, not plain dictionaries. Additionally, `port` was a string `"7001"` instead of an integer `7001`. Fixed by switching to the simpler `host`/`port` keyword arguments: `RedisCluster(host="127.0.0.1", port=7001, ...)`.

2. **Missing `import json` in Python publish example**: The publish code example called `json.dumps()` but did not import `json`. Added the missing import.

3. **Unused `import redis` in Python subscriber example**: The subscriber code imported `redis` at the top but never used it (only `RedisCluster` from `redis.cluster` was used). Removed the unused import.

4. **ioredis version requirement too low**: The prerequisites listed `ioredis >= 5.0`, but sharded pub/sub support in Cluster mode was not functional until v5.6.0, and the `shardedSubscribers` option was introduced in v5.9.0. Updated to `ioredis >= 5.9.0`.

5. **ioredis Cluster missing `shardedSubscribers: true` option**: The Node.js subscriber Cluster instance did not include the required `shardedSubscribers: true` option. Without this, sharded subscriptions are disabled. Added the option to the subscriber constructor.

## Review Notes
- All Redis command references (SSUBSCRIBE, SPUBLISH, PUBSUB SHARDCHANNELS, PUBSUB SHARDNUMSUB) are confirmed correct and available since Redis 7.0.0.
- The comparison table between classic and sharded Pub/Sub is accurate: classic broadcasts to all nodes, sharded routes to owning shard, pattern subscriptions are not supported in sharded mode.
- The guidance on when to use sharded vs classic Pub/Sub is sound.
- The PUBSUB SHARDCHANNELS command returns information at the shard level, not the full cluster level. The blog does not make this distinction explicit, but the commands shown are still correct as written.
