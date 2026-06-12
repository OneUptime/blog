# Validation Summary: How to Build Distributed Counters with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Cluster
- redis-py
- Python
- Lua scripting in Redis
- Redis strings and atomic counters
- Redis sorted sets
- Redis HyperLogLog

## Sources Consulted
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis GETSET command documentation: https://redis.io/docs/latest/commands/getset/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis HyperLogLog documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The introduction claimed Redis counters can scale to millions of increments per second without qualification. Changed this to "very high increment rates" because actual throughput depends on Redis deployment, hardware, clustering, networking, and client behavior.
- The introduction said production counters should "never lose a count." Changed this to "avoid losing counts" because Redis persistence and Redis Cluster write safety are not absolute guarantees under every failure mode.
- The sharded counter section implied sharding multiple keys helps when a single counter key is a bottleneck. Clarified that higher write capacity requires distributing shard keys across Redis Cluster hash slots/nodes.
- The sharded counter `get()` and `get_approximate()` methods used `MGET`, which is not suitable when shard keys are intentionally distributed across Redis Cluster hash slots. Replaced `MGET` with pipelined `GET` calls.
- The sharded counter `reset()` method used one Lua script over all shard keys, which is not compatible with shard keys distributed across Redis Cluster hash slots. Replaced it with per-shard atomic `GETSET` operations through a non-transactional pipeline and documented that the reset is not globally atomic across cluster slots.
- The sharded counter accepted invalid `num_shards` and `sample_size` values that could lead to empty shard lists or division by zero. Added validation for both values.
- The time-windowed counter described "sliding or fixed" windows, but the implementation creates fixed buckets. Updated the description to fixed time windows.
- The time-windowed counter used `timestamp or time.time()`, which treats a valid timestamp of `0` as missing. Changed it to an explicit `is not None` check.
- Several later Python examples used `redis.Redis` without importing `redis`, and the persistence example used `time.time()` without importing `time`. Added the missing imports.
- The persistence example described "guaranteed persistence" and "no data loss" while storing snapshots in Redis itself. Reworded this to Redis-backed snapshots that reduce data loss after restarts.
- The persistence example accepted `snapshot_interval` but never used it as an interval. Renamed it to `snapshot_every` and used it to control the increment count between snapshots.
- The multi-dimensional counter used redis-py's `zrevrange()`, matching the Redis `ZREVRANGE` command that has been deprecated since Redis 6.2. Updated it to `zrange(..., desc=True, withscores=True)`.
- The HyperLogLog example said Redis uses approximately 12 KB per counter and that `PFADD` returns whether cardinality changed. Updated this to "up to ~12KB" and clarified that `PFADD` reports whether the HyperLogLog internal state changed.

## Review Notes
The examples are syntactically valid Python after the fixes. The sharded reset remains intentionally not globally atomic when shards are distributed across Redis Cluster hash slots; a globally atomic multi-key reset would require co-locating keys in one hash slot, which would trade away cluster write distribution.
