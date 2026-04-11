# How to Use CLUSTER DELSLOTS in Redis to Remove Hash Slots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER DELSLOTS, Hash Slot, Resharding

Description: Learn how to use CLUSTER DELSLOTS to unassign hash slots from a Redis Cluster node during manual resharding or cluster maintenance.

---

The `CLUSTER DELSLOTS` command removes the association between one or more hash slots and the node you run it on. Unlike a full resharding operation, `CLUSTER DELSLOTS` only clears the slot assignment without migrating data - it is a low-level maintenance command used in specific recovery and manual resharding scenarios.

## Syntax

```text
CLUSTER DELSLOTS slot [slot ...]
```

Run this command on the node that currently owns the slots you want to unassign.

## When to Use CLUSTER DELSLOTS

- Manually resharding a cluster without the redis-cli resharding tool
- Correcting a misconfigured cluster during initial setup
- Clearing slots from a node before decommissioning it (after migrating all data)

## Basic Example

Unassign slot 100 from the node on port 7001:

```bash
redis-cli -p 7001 CLUSTER DELSLOTS 100
```

Remove multiple slots at once:

```bash
redis-cli -p 7001 CLUSTER DELSLOTS 100 101 102 103 104
```

## Warning - Data Loss Risk

Removing a slot that still contains keys will make those keys unreachable. Always migrate data before deleting slots in a production cluster:

```bash
# Step 1 - Migrate keys from slot 100 to target node
redis-cli -p 7001 CLUSTER SETSLOT 100 MIGRATING <target-node-id>
redis-cli -p 7001 CLUSTER GETKEYSINSLOT 100 100
# Migrate each key...

# Step 2 - Only then remove the slot
redis-cli -p 7001 CLUSTER DELSLOTS 100
```

## Removing a Range of Slots

For a large range, use a shell loop:

```bash
for slot in $(seq 5000 5100); do
  redis-cli -p 7001 CLUSTER DELSLOTS $slot
done
```

Or use `CLUSTER DELSLOTSRANGE` (Redis 7.0+) for a cleaner approach:

```bash
redis-cli -p 7001 CLUSTER DELSLOTSRANGE 5000 5100
```

## Verifying Slot Removal

After running `CLUSTER DELSLOTS`, confirm the slots are no longer assigned to the node:

```bash
redis-cli -p 7001 CLUSTER SHARDS
redis-cli -p 7001 CLUSTER INFO
# cluster_slots_assigned should decrease
```

Note: `CLUSTER SLOTS` was deprecated in Redis 7.0.0. Use `CLUSTER SHARDS` instead for checking slot assignments.

## Error Cases

- Running `CLUSTER DELSLOTS` on a slot that is already unbound (not assigned to any node) returns an error
- Specifying the same slot more than once in a single command also returns an error

```bash
redis-cli -p 7001 CLUSTER DELSLOTS 9999
# (error) ERR Slot 9999 is already unbound
```

## Summary

`CLUSTER DELSLOTS` unassigns hash slots from a Redis Cluster node. It is a low-level tool for manual cluster management and should always be used with caution - unassigning a slot that still holds data makes those keys inaccessible. Always migrate data first, and prefer the higher-level `redis-cli --cluster reshard` for routine resharding operations.
