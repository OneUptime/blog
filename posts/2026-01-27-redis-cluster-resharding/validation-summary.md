# Validation Summary: How to Configure Redis Cluster Resharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source
- Redis Cluster
- Redis CLI cluster manager
- Redis hash slots and hash tags
- Bash shell scripting

## Sources Consulted
- Redis docs: Scale with Redis Cluster - https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis docs: Redis Cluster specification - https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis docs: CLUSTER NODES - https://redis.io/docs/latest/commands/cluster-nodes/
- Redis docs: CLUSTER SLOTS - https://redis.io/docs/latest/commands/cluster-slots/
- Redis docs: CLUSTER INFO - https://redis.io/docs/latest/commands/cluster-info/
- Redis source: redis-cli cluster manager options - https://github.com/redis/redis/blob/8.2.1/src/redis-cli.c

## Issues Found
- The post described resharding as "zero downtime." Redis supports live reconfiguration, but the official Cluster specification notes that manual resharding can temporarily make multi-key operations unavailable even when hash tags are used. Updated the wording to "without a full cluster outage" and added the multi-key caveat.
- The post said Redis routes commands to the correct node. In Redis Cluster, cluster-aware clients normally route commands and handle MOVED/ASK redirections. Updated the wording to refer to a cluster-aware client.
- The node-removal script counted slots with `cluster_slots_assigned` from `CLUSTER INFO`. That field is cluster-wide, not per-node, so it could move the wrong number of slots. Replaced it with an `awk` calculation over `CLUSTER NODES` slot ranges for the node being removed.
- The hash slot formula was fenced as Bash even though it was explanatory pseudocode, not valid shell syntax. Changed the code fence to `text` and aligned the formula name with Redis' `HASH_SLOT` terminology.
- The sample `CLUSTER NODES` output used shortened IDs containing non-hex characters. Replaced them with full-length hexadecimal-looking node IDs consistent with Redis node ID format.

## Review Notes
The Redis CLI cluster manager flags shown in the post, including `--cluster-from`, `--cluster-to`, `--cluster-slots`, `--cluster-yes`, `--cluster-timeout`, `--cluster-pipeline`, `--cluster-weight`, `--cluster-threshold`, and `--cluster-simulate`, match the Redis 8.2.1 `redis-cli` source. `redis-cli` was not installed in the local workspace, so command verification used official Redis documentation and source code.
