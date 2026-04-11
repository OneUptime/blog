# Validation Summary: How to Reshard Hash Slots in Redis Cluster

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Redis Cluster
- redis-cli (cluster management subcommands)
- Hash slot resharding and rebalancing
- CLUSTER NODES, CLUSTER COUNTKEYSINSLOT commands

## Sources Consulted
- Redis Cluster Specification — hash slot migration protocol, ASK/MOVED redirects: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER NODES command documentation: https://redis.io/commands/cluster-nodes/
- Redis CLUSTER COUNTKEYSINSLOT command documentation: https://redis.io/commands/cluster-countkeysinslot/
- Redis CLUSTER GETKEYSINSLOT command documentation: https://redis.io/commands/cluster-getkeysinslot/
- redis-cli --cluster subcommands (reshard, rebalance, check, fix, info): https://redis.io/docs/manual/scaling/

## Issues Found

1. **Misleading "atomically" claim (line 27):** The post stated "Redis does this atomically - keys remain accessible during migration." The overall slot migration is not atomic — it is an online, incremental process where keys are moved in batches via MIGRATE. Individual key moves are atomic, but the slot migration as a whole is not. Changed to: "Redis handles this online — keys remain accessible during migration through ASK redirects."

2. **Incorrect grep pattern for CLUSTER NODES output (line 134):** The post used `grep -E "migrating|importing"` to find slots in migration state. However, CLUSTER NODES output does not contain the literal words "migrating" or "importing." It uses the notation `[slot->-nodeID]` for migrating slots and `[slot-<-nodeID]` for importing slots. Changed the grep pattern to `grep -E "\[.*->-.*\]|\[.*-<-.*\]"`.

3. **Wrong command for counting keys in a slot (line 146):** The description said "Check how many keys remain in a migrating slot" but used `CLUSTER GETKEYSINSLOT 500 10`, which returns up to 10 key names, not a count. Changed to `CLUSTER COUNTKEYSINSLOT 500`, which returns the actual count of keys in the slot.

## Review Notes
- All redis-cli --cluster subcommand flags (--cluster-from, --cluster-to, --cluster-slots, --cluster-yes, --cluster-pipeline, --cluster-use-empty-masters) are correct and current.
- The hash slot formula `CRC16(key) % 16384` is correct.
- The ASK vs MOVED redirect explanation is accurate.
- The 5-step migration process description is accurate.
- The sample CLUSTER INFO output format is realistic and correctly structured.
