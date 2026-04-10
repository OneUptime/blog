# Validation Summary: What Does 'ASK' Redirection Mean in Redis Cluster

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis Cluster (ASK/MOVED redirection, slot migration, resharding)
- redis-cli (cluster mode, --cluster reshard, --cluster fix)
- redis-py (RedisCluster client, manual ASK handling)
- Python

## Sources Consulted
- Redis Cluster Specification — ASK and MOVED redirection semantics: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER NODES command documentation: https://redis.io/commands/cluster-nodes/
- Redis CLUSTER INFO command documentation: https://redis.io/commands/cluster-info/
- redis-cli --cluster reshard help output (valid flags: --cluster-from, --cluster-to, --cluster-slots, --cluster-yes, --cluster-pipeline, --cluster-timeout, --cluster-replace)
- redis-py documentation for RedisCluster: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect notation reference (line 114)**: Text said ASK redirections are shown "with `--` notation" but the actual redis-cli output uses `->` (arrow) notation. Fixed to `->`.

2. **Incorrect CLUSTER NODES grep pattern (lines 126-127)**: The command `grep -E "(migrating|importing)"` would not match anything because CLUSTER NODES represents migrating slots as `[slot->-nodeID]` and importing slots as `[slot-<-nodeID]` — it does not use the words "migrating" or "importing". Fixed to `grep "\["` with an explanatory comment about the arrow notation format.

3. **Misleading CLUSTER INFO command (line 129)**: The comment said "check slot state directly" but `CLUSTER INFO | grep -E "slot"` only returns aggregate slot count fields (cluster_slots_assigned, cluster_slots_ok, etc.), not migration state. Fixed the comment to accurately describe what is returned and corrected the grep pattern.

4. **Non-existent `--cluster-throttle` flag (line 153)**: The `--cluster-throttle` option does not exist for `redis-cli --cluster reshard`. Valid options for controlling migration impact are `--cluster-pipeline` (batch size) and `--cluster-timeout`. Fixed to use `--cluster-pipeline 5` with `--cluster-timeout 5000` and updated the comment accordingly.

## Review Notes
- The core technical explanations of ASK vs MOVED semantics, the migration process flow, and ASKING command behavior are all accurate and well-presented.
- The Python redis-py cluster example uses the current API (`from redis.cluster import RedisCluster`), which is correct for redis-py >= 4.1.0.
- The manual ASK handling example is educational and functionally correct, though in production code one would use connection pooling rather than creating a new Redis connection per redirect.
- The `--cluster fix` troubleshooting advice is accurate and practical.
