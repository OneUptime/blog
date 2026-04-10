# Validation Summary: How to Troubleshoot Redis Cluster Slot Not Covered

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis Cluster
- redis-cli (CLI tool and --cluster subcommands)
- Redis hash slot architecture (CRC16, 16384 slots)
- Redis cluster resharding and slot migration

## Sources Consulted
- Redis official documentation for CLUSTER INFO: https://redis.io/docs/latest/commands/cluster-info/
- Redis official documentation for CLUSTER NODES: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis official documentation for CLUSTER ADDSLOTS: https://redis.io/docs/latest/commands/cluster-addslots/
- Redis official documentation for CLUSTER SETSLOT: https://redis.io/docs/latest/commands/cluster-setslot/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

## Issues Found

### Issue 1: Incorrect grep pattern for migration/importing state in CLUSTER NODES output
- **What was wrong:** The command `redis-cli -c CLUSTER NODES | grep -E "migrating|importing"` would not match any output. CLUSTER NODES does not contain the literal words "migrating" or "importing". Instead, slot migration states are represented using bracket notation: `[slot->-destinationNodeId]` for migrating slots and `[slot-<-sourceNodeId]` for importing slots.
- **What was changed:** Replaced the grep pattern with `grep -E "\[.*->-|\[.*-<-"` and added a comment explaining the bracket notation format.
- **Why:** The original command would silently return no results even when slots are in a migration state, causing users to miss the problem entirely.

### Issue 2: Incorrect usage of CLUSTER ADDSLOTS
- **What was wrong:** The "Fix All Uncovered Slots" section set a `HEALTHY_NODE_ID` variable but never used it, and connected to `<any-node>` for the ADDSLOTS command. `CLUSTER ADDSLOTS` assigns slots to the node you are directly connected to — it does not accept a target node ID parameter. Connecting to an arbitrary node could assign slots to the wrong node.
- **What was changed:** Removed the unused `HEALTHY_NODE_ID` variable, changed `<any-node>` to `<healthy-primary-node>` in the loop, and added a comment clarifying that ADDSLOTS assigns to the connected node.
- **Why:** The original code could cause slots to be assigned to an unintended node, potentially worsening the cluster state.

## Review Notes
- `CLUSTER SLOTS` is deprecated in Redis 7.0+ in favor of `CLUSTER SHARDS`. The post mentions both commands, which provides good backward compatibility coverage, but a version note could be added in the future.
- The `--cluster-slave` flag used in the "Prevent Future Slot Coverage Failures" section still works but was renamed to `--cluster-replica` in Redis 7.0+. Not technically wrong since it's still accepted as an alias.
- The post could mention `redis-cli --cluster fix <node>:6379` as a quick automated fix for uncovered slots, but this is an omission rather than an error.
