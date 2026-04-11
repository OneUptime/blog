# How to Use CLUSTER ADDSLOTS in Redis to Assign Hash Slots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER ADDSLOTS, Hash Slot, Sharding

Description: Learn how to use CLUSTER ADDSLOTS in Redis to manually assign hash slots to a node when building or resharding a cluster.

---

Redis Cluster distributes data across 16,384 hash slots. Each key maps to one slot, and each slot is owned by exactly one primary node. The `CLUSTER ADDSLOTS` command assigns one or more hash slots to the node you run it against. This is primarily used during cluster initialization or manual resharding.

## Syntax

```text
CLUSTER ADDSLOTS slot [slot ...]
```

You run this command directly on the node that should own the slots.

## When to Use CLUSTER ADDSLOTS

- Setting up a new Redis Cluster manually without redis-cli's `--cluster create` helper
- Assigning previously unbound slots after removing a node
- Recovering from a partial cluster setup

## Basic Example - Three-Node Cluster Setup

Suppose you have three primary nodes and want to distribute the 16,384 slots evenly:

```bash
# Node 1 (port 7001) - slots 0-5460
redis-cli -p 7001 CLUSTER ADDSLOTS $(seq 0 5460 | tr '\n' ' ')

# Node 2 (port 7002) - slots 5461-10922
redis-cli -p 7002 CLUSTER ADDSLOTS $(seq 5461 10922 | tr '\n' ' ')

# Node 3 (port 7003) - slots 10923-16383
redis-cli -p 7003 CLUSTER ADDSLOTS $(seq 10923 16383 | tr '\n' ' ')
```

## Verifying Slot Assignment

After assigning slots, confirm they are correctly registered:

```bash
redis-cli -p 7001 CLUSTER INFO
# cluster_state: ok
# cluster_slots_assigned: 16384

redis-cli -p 7001 CLUSTER SLOTS
```

> **Note:** `CLUSTER SLOTS` is deprecated as of Redis 7.0.0. Use `CLUSTER SHARDS` instead for Redis 7.0+.

## Important Restrictions

`CLUSTER ADDSLOTS` will return an error if:
- The slot is already assigned to any node in the cluster (including the current node)

If a slot is currently in the `importing` state on the node, running `CLUSTER ADDSLOTS` for that slot will clear the importing state and assign the slot normally.

```bash
# This will fail if slot 100 is already assigned elsewhere
redis-cli -p 7001 CLUSTER ADDSLOTS 100
# (error) ERR Slot 100 is already busy
```

## ADDSLOTS vs ADDSLOTSRANGE

For assigning large contiguous ranges, use `CLUSTER ADDSLOTSRANGE` (available in Redis 7.0+) instead, which is more concise:

```bash
# Equivalent to assigning slots 0 through 5460
redis-cli -p 7001 CLUSTER ADDSLOTSRANGE 0 5460
```

## Practical Tip - Check Unassigned Slots

Before assigning slots, verify which ones are unclaimed:

```bash
redis-cli -p 7001 CLUSTER SLOTS | head -20
```

Slots not listed in any node's range are unassigned and can be added freely.

## Summary

`CLUSTER ADDSLOTS` is the low-level command for assigning hash slots to a Redis Cluster node. It is most useful during manual cluster setup or recovery scenarios. For bulk assignments of contiguous ranges, prefer `CLUSTER ADDSLOTSRANGE`. Always verify slot coverage with `CLUSTER INFO` to ensure all 16,384 slots are assigned before putting the cluster into production.
