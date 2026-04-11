# Validation Summary: How to Scale Redis for Multi-Region Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (open source) — replication, Sentinel, Cluster
- Redis Enterprise / Redis Cloud — active-active CRDT-based geo-replication
- Python redis-py client library (redis.Redis, redis.sentinel.Sentinel, redis.cluster.RedisCluster)
- Redis CLI (`redis-cli`, `redis-cli --cluster`)

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster tutorial and `redis-cli --cluster` usage: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis configuration file reference (replica-lazy-flush, repl-backlog-size, repl-timeout): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- redis-py documentation (Sentinel, RedisCluster): https://redis-py.readthedocs.io/
- Redis Enterprise active-active CRDB documentation: https://redis.io/docs/latest/operate/rs/databases/active-active/
- Other blog posts in this repo using `redis-cli --cluster create` for reference (posts/2026-03-31-redis-cluster-create-from-scratch, posts/2026-02-20-redis-cluster-setup)

## Issues Found
1. **`redis-cli --cluster create` with insufficient nodes**: The original command listed only 3 nodes (`redis-a1`, `redis-a2`, `redis-a3`) with `--cluster-replicas 1`. Redis Cluster requires at least 6 nodes when `--cluster-replicas 1` is specified (3 masters + 3 replicas). The command would fail with an error. Fixed by adding 3 replica nodes (`redis-a4`, `redis-a5`, `redis-a6`) to match the 6-node minimum.
2. **Misleading comment on cluster create**: The original comment said "Region A: nodes handling slots 0-5460", implying the initial cluster only covers a subset of slots. In reality, `--cluster create` distributes all 16384 slots across the masters. The slots are later resharded to Region B. Fixed the comment to: "Region A: 3 masters + 3 replicas, all 16384 slots start here".

## Review Notes
- `sentinel.slave_for()` in the Sentinel example still works but is considered legacy naming. Newer redis-py versions (5.0+) provide `sentinel.replica_for()` as the preferred alias. Not changed since `slave_for` remains functional.
- The `RedisCluster` constructor uses dict-based `startup_nodes` (e.g., `{"host": "...", "port": 6379}`). While this works, newer redis-py (4.1+) prefers `ClusterNode` objects. Not changed since the dict format is still supported.
- The Redis Enterprise REST API example (`/v1/bdbs` with `crdt` fields) is illustrative. The exact API schema may vary across Redis Enterprise versions; readers should consult their version's REST API reference.
- The `repl-timeout 60` config value is actually the Redis default. For cross-region deployments with higher latency, a larger value (e.g., 120 or 180) would be more appropriate. Not changed since 60 is valid and the comment already notes its purpose.
