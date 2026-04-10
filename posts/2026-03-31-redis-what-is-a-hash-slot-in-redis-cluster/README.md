# What Is a Hash Slot in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Hash Slot

Description: A clear explanation of what hash slots are in Redis Cluster, how keys are mapped to slots, and how slots are distributed across nodes.

---

Redis Cluster uses a concept called hash slots to distribute data across multiple nodes. There are 16384 hash slots in total, and each key in the cluster belongs to exactly one slot. Understanding hash slots is fundamental to understanding how Redis Cluster works.

## What Is a Hash Slot?

A hash slot is a partition unit in Redis Cluster. The cluster divides the key space into 16384 buckets (slots numbered 0-16383). Each master node owns a range of these slots.

For example, in a 3-node cluster:
- Node A: slots 0-5460
- Node B: slots 5461-10922
- Node C: slots 10923-16383

## How Keys Are Mapped to Slots

Redis computes the slot for a key using CRC16:

```text
slot = CRC16(key) mod 16384
```

You can compute the slot for any key:

```bash
redis-cli CLUSTER KEYSLOT mykey
# Example output: 14687
```

## Hash Tags for Grouping Keys

By default, the entire key is used for slot computation. But sometimes you want multiple keys to land on the same slot (for MULTI/EXEC or Lua scripts). Use hash tags - curly braces - to force specific parts of the key to determine the slot:

```bash
# Without hash tags, the full key is hashed - these likely land in different slots
redis-cli CLUSTER KEYSLOT "user:123:profile"    # hashes full key
redis-cli CLUSTER KEYSLOT "user:123:settings"   # hashes full key

# With hash tags, only the part inside {} is hashed - these go to the same slot
redis-cli CLUSTER KEYSLOT "{user:123}:profile"  # hashes "user:123"
redis-cli CLUSTER KEYSLOT "{user:123}:settings"  # hashes "user:123"
```

Keys with the same content inside `{}` go to the same slot:

```bash
redis-cli SET {user:123}:profile "data"
redis-cli SET {user:123}:settings "prefs"
# Both go to the same node
```

## Viewing Slot Distribution

See which slots each node owns:

```bash
redis-cli CLUSTER INFO
redis-cli CLUSTER NODES
redis-cli --cluster check <node-ip>:6379
```

## Slot Assignment During Cluster Setup

When you create a cluster, slots are assigned to nodes:

```bash
redis-cli --cluster create node1:6379 node2:6379 node3:6379 node4:6379 node5:6379 node6:6379 --cluster-replicas 1
```

You can also assign slots manually:

```bash
redis-cli -h node1 CLUSTER ADDSLOTS 0 1 2 3 4 5
```

## Finding Keys in a Slot

List keys in a specific slot (useful for debugging):

```bash
redis-cli -h <node-ip> CLUSTER GETKEYSINSLOT 14687 10
```

## Why 16384?

The number 16384 (2^14) was chosen as a balance between:
- Enough slots to support 1000+ nodes
- Small enough that each node's slot bitmap fits in a 2KB gossip message

## Summary

Redis Cluster maps every key to one of 16384 hash slots using CRC16. Each master node owns a range of slots. Hash tags let you control which part of the key determines the slot, enabling co-location of related keys on the same node. Understanding slots is essential for designing efficient multi-key operations in a clustered environment.
