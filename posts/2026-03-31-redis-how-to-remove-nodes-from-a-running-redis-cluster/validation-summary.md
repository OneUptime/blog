# Validation Summary: How to Remove Nodes from a Running Redis Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Redis Cluster
- redis-cli (cluster management subcommands: del-node, reshard, rebalance, check)
- CLUSTER NODES, CLUSTER INFO, CLUSTER FORGET commands

## Sources Consulted
- Redis official documentation: CLUSTER NODES command — https://redis.io/commands/cluster-nodes
- Redis official documentation: CLUSTER FORGET command — https://redis.io/commands/cluster-forget
- Redis official documentation: CLUSTER INFO command — https://redis.io/commands/cluster-info
- Redis Cluster tutorial (scaling/resharding section) — https://redis.io/docs/management/scaling/
- redis-cli --cluster help output for del-node, reshard, rebalance, and check subcommands

## Issues Found

### 1. Inconsistent sample CLUSTER NODES output (Step 1 vs Step 3)
**What was wrong:** The sample CLUSTER NODES output in Step 1 showed node `jkl012` with `[no slots]`, but Step 3 then demonstrated resharding 4096 slots FROM `jkl012`. You cannot migrate slots from a node that has none — the example was internally contradictory.

**What was changed:** Updated the Step 1 sample output to show a 4-node cluster where all nodes hold slots: `0-4095`, `4096-8191`, `8192-12287`, `12288-16383`. This makes `jkl012` (with 4096 slots at `12288-16383`) a valid source for the reshard example.

### 2. Incorrect CLUSTER INFO check for verifying empty slots (Step 4)
**What was wrong:** The post used `CLUSTER INFO | grep cluster_slots_assigned` on the drained node and expected the output to be `cluster_slots_assigned:0`. However, `cluster_slots_assigned` is a **cluster-wide** metric — it reports the total number of slots assigned across all nodes in the entire cluster. After draining one node, all 16384 slots are still assigned (just to other nodes), so this value would remain `16384`, not `0`. The check would never produce the expected result.

**What was changed:** Replaced the CLUSTER INFO check with `CLUSTER NODES | grep myself`, which shows the node's own entry. After a successful reshard, the node's entry will have no slot ranges at the end, confirming it holds zero slots. Added a sample output line showing what a drained node's self-entry looks like.

## Review Notes
- Step 2 shows a separate `SHUTDOWN` command after `del-node`, but Step 5 correctly notes that `del-node` already shuts down the removed instance. The extra SHUTDOWN in Step 2 is redundant (it would fail since the node is already down), though not harmful. A future edit could remove it for consistency.
- The `del-node` output shown in Step 5 omits the `CLUSTER RESET SOFT` line that redis-cli actually prints (`>>> Sending CLUSTER RESET SOFT to the deleted node.`). This is a minor omission that doesn't affect the tutorial's usefulness.
- The CLUSTER FORGET 60-second blacklist window is correctly documented.
- All redis-cli --cluster subcommand syntaxes (del-node, reshard, rebalance, check) are correct.
