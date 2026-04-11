# Validation Summary: How to Use Redis CLI --cluster Commands for Cluster Management

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Cluster
- redis-cli --cluster subcommands (create, info, check, add-node, reshard, rebalance, del-node, fix, call)

## Sources Consulted
- Redis official documentation: Scale with Redis Cluster (https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- Redis Cluster specification (https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- Redis source code (src/redis-cli.c) for clusterManagerShowClusterInfo() and cluster creation slot assignment logic

## Issues Found

1. **`--cluster info` sample output was fabricated**: The blog showed an invented output format with lines like `Primaries: 3, Replicas: 3, Slots: 16384, Errors: 0` and per-node lines like `Master, 5461 slots (0-5460)`. The real output of `redis-cli --cluster info` shows only master nodes in the format `host:port (nodeid...) -> N keys | N slots | N slaves.` followed by a summary `[OK] N keys in M masters.` and average keys per slot. Replaced the fabricated output with a realistic example matching the actual format.

2. **Slot distribution ranges were incorrect**: The blog had Node 2 with slots 5461-10921 (5461 slots) and Node 3 with 10922-16383 (5462 slots). The actual Redis distribution algorithm assigns Node 2 slots 5461-10922 (5462 slots) and Node 3 slots 10923-16383 (5461 slots). The extra slot goes to the middle node, not the last. This was corrected in the updated `--cluster info` output by showing the correct slot counts per node.

## Review Notes
- All `redis-cli --cluster` subcommands (create, info, check, add-node, reshard, rebalance, del-node, fix, call) are verified to exist and use correct syntax.
- The `--cluster-slave` and `--cluster-master-id` flags are still the current CLI flag names, even though Redis has been transitioning terminology from "slave" to "replica" in other contexts.
- The `--cluster-from all` usage in the reshard example is confirmed to work as a special value accepted by redis-cli.
- The 16384 hash slot count is correct per the Redis Cluster specification.
