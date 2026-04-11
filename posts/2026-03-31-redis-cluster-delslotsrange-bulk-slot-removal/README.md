# How to Use CLUSTER DELSLOTSRANGE in Redis for Bulk Slot Removal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER DELSLOTSRANGE, Hash Slot, Maintenance

Description: Learn how to use CLUSTER DELSLOTSRANGE in Redis 7.0+ to remove contiguous ranges of hash slots from a node efficiently.

---

`CLUSTER DELSLOTSRANGE`, introduced in Redis 7.0, allows you to unassign a contiguous range of hash slots from the current node in a single command. It is the range-based counterpart to `CLUSTER DELSLOTS` and is useful for large-scale slot removal during cluster resharding or decommissioning.

## Syntax

```text
CLUSTER DELSLOTSRANGE start-slot end-slot [start-slot end-slot ...]
```

Run this command on the node that currently owns the slots.

## Comparison with CLUSTER DELSLOTS

```bash
# Old approach - list every slot individually
for slot in $(seq 5000 5460); do
  redis-cli -p 7001 CLUSTER DELSLOTS $slot
done

# New approach - specify the range
redis-cli -p 7001 CLUSTER DELSLOTSRANGE 5000 5460
```

The range-based command is atomic and significantly faster for large ranges.

## Safe Slot Removal Workflow

Never remove slots that still contain keys. Follow this pattern to safely remove a slot range:

```bash
# Step 1 - Mark slots as migrating
for slot in $(seq 5000 5460); do
  redis-cli -p 7001 CLUSTER SETSLOT $slot MIGRATING <target-node-id>
done

# Step 2 - Migrate all keys from each slot
for slot in $(seq 5000 5460); do
  while true; do
    keys=$(redis-cli -p 7001 CLUSTER GETKEYSINSLOT $slot 100)
    if [ -z "$keys" ]; then
      break
    fi
    for key in $keys; do
      redis-cli -p 7001 MIGRATE <target-host> <target-port> $key 0 5000
    done
  done
done

# Step 3 - Only now remove the slots
redis-cli -p 7001 CLUSTER DELSLOTSRANGE 5000 5460
```

## Removing Multiple Non-Contiguous Ranges

```bash
# Remove two separate ranges at once
redis-cli -p 7001 CLUSTER DELSLOTSRANGE 0 1000 8000 9000
```

## Verify After Removal

```bash
redis-cli -p 7001 CLUSTER INFO
# cluster_slots_assigned should decrease by the number of removed slots

redis-cli -p 7001 CLUSTER SHARDS
# The removed range should no longer appear under this node
```

## Error Cases

If you attempt to remove slots that are not assigned to any node, Redis returns an error:

```bash
redis-cli -p 7001 CLUSTER DELSLOTSRANGE 10000 10100
# (error) ERR Slot 10000 is already unassigned
```

## Availability Requirement

`CLUSTER DELSLOTSRANGE` requires Redis 7.0 or later. Check your version before using:

```bash
redis-cli INFO server | grep redis_version
```

## Summary

`CLUSTER DELSLOTSRANGE` provides an efficient way to unassign large contiguous ranges of hash slots from a Redis Cluster node in a single command. Always migrate data out of slots before removing them, and verify slot counts afterward with `CLUSTER INFO`. For Redis versions below 7.0, use the individual `CLUSTER DELSLOTS` command.
