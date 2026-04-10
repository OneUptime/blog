# Validation Summary: Redis Runbook: Handling Cluster Node Failures

## Status
validated

## Post Type
Runbook

## Technologies Covered
- Redis Cluster
- redis-cli (command-line interface)

## Sources Consulted
- Redis CLUSTER NODES documentation: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis CLUSTER FAILOVER documentation: https://redis.io/docs/latest/commands/cluster-failover/
- Redis CLUSTER FORGET documentation: https://redis.io/docs/latest/commands/cluster-forget/
- Redis CLUSTER INFO documentation: https://redis.io/docs/latest/commands/cluster-info/
- Redis Cluster tutorial (scaling and failover): https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-cli --cluster subcommands documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/

## Issues Found

1. **Step 1 - `grep -v connected` returns no results**: The command `redis-cli CLUSTER NODES | grep -v connected` was intended to find nodes that are not connected. However, the CLUSTER NODES link-state field is either `connected` or `disconnected`. Since `disconnected` contains the substring `connected`, `grep -v connected` filters out both connected AND disconnected nodes, effectively returning no output. Fixed to `grep fail` to correctly identify failed nodes.

2. **Step 5 - Deprecated `--cluster-slave` flag**: The `--cluster-slave` flag was renamed to `--cluster-replica` in Redis 5.0 as part of inclusive language changes. While `--cluster-slave` is still accepted for backward compatibility, `--cluster-replica` is the current recommended flag. Updated to `--cluster-replica`.

3. **Step 7 - Incorrect time window for CLUSTER FORGET**: The post stated to repeat `CLUSTER FORGET` on all nodes "within the node timeout period." This is incorrect. `CLUSTER FORGET` places the forgotten node on a 60-second ban list. The command must be sent to all cluster nodes within that fixed 60-second window to prevent gossip from re-adding the node. This is unrelated to the `cluster-node-timeout` configuration. Fixed to reference the correct 60-second window.

## Review Notes
- The post correctly distinguishes between `CLUSTER FAILOVER` (safe, coordinated) and `CLUSTER FAILOVER FORCE` (when primary is unreachable). There is also a `CLUSTER FAILOVER TAKEOVER` variant for when a majority of masters are down, but omitting it is reasonable for a general runbook.
- The `cluster_state:fail` explanation is accurate for the default configuration (`cluster-require-full-coverage yes`). With this setting disabled, the cluster continues serving requests for covered slots even when some slots are unassigned.
- All `redis-cli --cluster` subcommands (`add-node`, `check`, `rebalance`) use correct syntax and flags.
