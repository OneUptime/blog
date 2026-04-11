# Validation Summary: How Redis Handles Cluster Topology Changes

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- Redis Cluster
- Redis gossip protocol and cluster bus
- Redis failover and election mechanism
- redis-py (Python Redis client)
- redis-cli cluster management commands

## Sources Consulted
- Redis CLUSTER INFO command documentation — https://redis.io/docs/latest/commands/cluster-info/
- Redis CLUSTER NODES command documentation — https://redis.io/docs/latest/commands/cluster-nodes/
- Redis Cluster specification — https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis configuration documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- redis-py GitHub repository (RedisCluster API) — https://github.com/redis/redis-py
- redis-py cluster documentation — https://redis-py.readthedocs.io/en/stable/clustering.html

## Issues Found

1. **`CLUSTER INFO | grep cluster_port` — non-existent field.** The `cluster_port` field is not reliably present in `CLUSTER INFO` output. Changed the command to use `CLUSTER NODES | head -1`, which shows the cluster bus port after the `@` symbol in node addresses.

2. **`CLUSTER INFO | grep cluster_slots_migrating` — non-existent field.** There is no `cluster_slots_migrating` field in `CLUSTER INFO`. Migrating/importing slot state is visible in `CLUSTER NODES` output as `[slot->-node]` and `[slot-<-node]` flags. Changed to `CLUSTER NODES | grep -E "migrating|importing"`.

3. **Python `startup_nodes` format incorrect.** The code passed `[{"host": "redis-1", "port": 6379}]` (dict format from the old redis-py-cluster package). Modern redis-py (4.x/5.x) requires `ClusterNode` objects: `[ClusterNode("redis-1", 6379)]`. Added the `ClusterNode` import and fixed the parameter.

4. **Python `skip_full_coverage_check` parameter does not exist.** This parameter was from the old redis-py-cluster library. In modern redis-py, the equivalent is `require_full_coverage` (boolean, default `True`). Fixed the parameter name and value.

5. **Python `retry_on_error=[Exception]` is not a valid RedisCluster parameter.** The `retry_on_error` parameter exists on the standalone `Redis` client but not on `RedisCluster`. RedisCluster uses `retry` (a `Retry` object) and `cluster_error_retry_attempts` instead. Removed the invalid parameter.

6. **Misleading comment on `cluster-require-full-coverage`.** The comment said "Minimum replicas needed to maintain writes for a primary," which is incorrect. This config controls whether the cluster requires all 16384 hash slots to be covered to accept writes. The minimum-replicas concept is governed by `min-replicas-to-write`. Fixed the comment.

## Review Notes
- The `--cluster-slave` flag in the add-node command still works but `--cluster-replica` is the newer preferred alias. Not changed since both are valid.
- The failover timeline (T+0s through T+20s) is illustrative and approximate; actual timings vary based on gossip propagation speed and cluster size. This is acceptable for a conceptual overview.
- The post correctly describes PFAIL-to-FAIL promotion requiring a majority of primary nodes, which aligns with the Redis Cluster specification.
