# How to Use CLUSTER ADDSLOTSRANGE in Redis for Bulk Slot Assignment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER ADDSLOTSRANGE, Hash Slot, Sharding

Description: Learn how to use CLUSTER ADDSLOTSRANGE in Redis 7.0+ to efficiently assign contiguous ranges of hash slots to a node in a single command.

---

Introduced in Redis 7.0, `CLUSTER ADDSLOTSRANGE` is a more efficient alternative to `CLUSTER ADDSLOTS` for assigning large contiguous ranges of hash slots to a node. Instead of listing every individual slot, you provide start and end slot numbers.

## Syntax

```text
CLUSTER ADDSLOTSRANGE start-slot end-slot [start-slot end-slot ...]
```

You can specify multiple ranges in a single command.

## Comparison with CLUSTER ADDSLOTS

With `CLUSTER ADDSLOTS`, assigning 5,000 slots required listing all 5,000 slot numbers. With `CLUSTER ADDSLOTSRANGE`, you specify only the range boundaries:

```bash
# Old way - ADDSLOTS requires every slot number
redis-cli -p 7001 CLUSTER ADDSLOTS $(seq 0 5460 | tr '\n' ' ')

# New way - ADDSLOTSRANGE with just the range
redis-cli -p 7001 CLUSTER ADDSLOTSRANGE 0 5460
```

The `ADDSLOTSRANGE` approach is faster, uses less bandwidth, and is much easier to script.

## Setting Up a Three-Node Cluster

A standard three-node cluster setup with `CLUSTER ADDSLOTSRANGE`:

```bash
# Node 1 - first third of slots
redis-cli -p 7001 CLUSTER ADDSLOTSRANGE 0 5460

# Node 2 - second third
redis-cli -p 7002 CLUSTER ADDSLOTSRANGE 5461 10922

# Node 3 - final third
redis-cli -p 7003 CLUSTER ADDSLOTSRANGE 10923 16383
```

## Assigning Multiple Non-Contiguous Ranges

You can assign multiple ranges in a single call:

```bash
# Assign two separate ranges to one node
redis-cli -p 7001 CLUSTER ADDSLOTSRANGE 0 2000 8000 9000
```

This assigns slots 0-2000 and 8000-9000 to node 7001 in one command.

## Verifying the Assignment

```bash
redis-cli -p 7001 CLUSTER INFO
# cluster_slots_assigned: 5461

redis-cli -p 7001 CLUSTER SLOTS
# Lists all slots and their owning nodes
```

## Error Conditions

`CLUSTER ADDSLOTSRANGE` returns an error if any slot in the specified range is already assigned:

```bash
redis-cli -p 7001 CLUSTER ADDSLOTSRANGE 0 100
# (error) ERR Slot 0 is already busy
```

Check slot ownership before assigning ranges to avoid conflicts.

## Availability

`CLUSTER ADDSLOTSRANGE` requires Redis 7.0 or later. For older versions, fall back to `CLUSTER ADDSLOTS`.

```bash
redis-cli -p 7001 INFO server | grep redis_version
```

## Summary

`CLUSTER ADDSLOTSRANGE` simplifies bulk hash slot assignment in Redis Cluster by letting you specify slot ranges instead of individual slot numbers. It is the preferred way to assign large contiguous ranges in Redis 7.0+ and is especially useful during initial cluster setup. Always verify the resulting slot distribution with `CLUSTER INFO` to confirm all 16,384 slots are covered.
