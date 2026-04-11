# Validation Summary: How to Add Nodes to a Running Redis Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- redis-cli (`--cluster` subcommands: add-node, rebalance, reshard)
- Redis cluster configuration directives (cluster-enabled, cluster-config-file, cluster-node-timeout, masterauth)

## Sources Consulted
- Redis Cluster tutorial: https://redis.io/docs/manual/scaling/
- Redis CLI cluster support documentation: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER INFO command reference: https://redis.io/commands/cluster-info/
- Redis CLUSTER NODES command reference: https://redis.io/commands/cluster-nodes/
- Redis configuration reference: https://redis.io/docs/management/config/

## Issues Found

### Issue 1: Incorrect grep for "migrating" in CLUSTER INFO output
- **What was wrong:** The monitoring command `CLUSTER INFO | grep -E "cluster_slots|migrating"` suggested that migration state information appears in CLUSTER INFO output. It does not. CLUSTER INFO contains cluster-wide aggregate fields like `cluster_slots_assigned`, `cluster_slots_ok`, etc. Slot migration state (`[slot->-node_id]` / `[slot-<-node_id]`) is only visible in CLUSTER NODES output.
- **What was changed:** Split the monitoring into two commands: one using `CLUSTER INFO | grep cluster_slots` for aggregate slot stats, and a separate `CLUSTER NODES | grep "\->"` command to observe in-flight slot migrations.

### Issue 2: Incorrect cluster_slots_assigned value in verification example
- **What was wrong:** The example CLUSTER INFO output showed `cluster_slots_assigned:4096`, implying this field reports per-node slot counts. In reality, `cluster_slots_assigned` is a cluster-wide total. A healthy cluster should always report `16384` (all slots assigned). Showing `4096` would indicate only a quarter of slots are assigned cluster-wide, which signals an unhealthy state.
- **What was changed:** Corrected the value to `cluster_slots_assigned:16384`, added a note explaining this is a cluster-wide field, and added a `CLUSTER NODES | grep myself` command to show how to check per-node slot assignments.

## Review Notes
- The `--cluster-slave` flag used in Step 3 still works but Redis 7+ also recognizes `--cluster-replica` as an alias. Both are valid; the post uses the older but still-supported form.
- The `--cluster-weight` argument using `host:port=weight` format is valid — redis-cli resolves both node IDs and `host:port` addresses in this context.
- The post correctly notes that 3 primaries + 3 replicas is the minimum recommended Redis Cluster topology.
- The 16384 hash slot count and the math (16384 / 4 = 4096 per node) are correct.
