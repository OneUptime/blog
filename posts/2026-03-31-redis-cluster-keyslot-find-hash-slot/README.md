# How to Use CLUSTER KEYSLOT in Redis to Find Key Hash Slots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER KEYSLOT, Hash Slot, Key Distribution

Description: Learn how to use CLUSTER KEYSLOT to determine which hash slot a key maps to, helping you understand and optimize key distribution in Redis Cluster.

---

In Redis Cluster, every key maps to one of 16,384 hash slots. The slot is determined by applying CRC16 to the key name (or its hash tag) and taking the result modulo 16,384. `CLUSTER KEYSLOT` lets you quickly find which slot a key would land in.

## Syntax

```text
CLUSTER KEYSLOT key
```

Returns an integer from 0 to 16383.

## Basic Usage

```bash
redis-cli CLUSTER KEYSLOT mykey
# (integer) 14687

redis-cli CLUSTER KEYSLOT user:1001
# (integer) 5712

redis-cli CLUSTER KEYSLOT order:5000
# (integer) 6689
```

## Understanding Hash Tags

Redis Cluster supports hash tags - a substring enclosed in `{}` that forces multiple keys to map to the same slot. This is useful for multi-key operations that must execute on the same node.

```bash
# These keys all share the hash tag {user:1001}
redis-cli CLUSTER KEYSLOT {user:1001}.profile
redis-cli CLUSTER KEYSLOT {user:1001}.settings
redis-cli CLUSTER KEYSLOT {user:1001}.session
# All return the same slot number
```

## Verifying Keys Are in the Same Slot

Before running a multi-key command like `MGET` or a Lua script, verify all keys land in the same slot:

```bash
redis-cli CLUSTER KEYSLOT {order:999}.details
redis-cli CLUSTER KEYSLOT {order:999}.items
redis-cli CLUSTER KEYSLOT {order:999}.payment
# All must return the same integer
```

## Finding Which Node Owns a Slot

Combine `CLUSTER KEYSLOT` with `CLUSTER SLOTS` to determine which node handles a key:

```bash
# Find the slot
SLOT=$(redis-cli CLUSTER KEYSLOT "product:catalogue")

# Find which node owns that slot
redis-cli CLUSTER SLOTS | grep -A5 "^$SLOT"
```

Or use `CLUSTER SHARDS` for a cleaner output in Redis 7.0+.

## Debugging Key Distribution

Use `CLUSTER KEYSLOT` to audit how your keys distribute across the cluster:

```bash
#!/bin/bash
# Check slot distribution for a set of keys
keys=("user:1" "user:2" "user:3" "product:1" "product:2")
for key in "${keys[@]}"; do
  slot=$(redis-cli CLUSTER KEYSLOT "$key")
  echo "$key -> slot $slot"
done
```

## Avoiding Cross-Slot Errors

If you receive a `CROSSSLOT` error, use `CLUSTER KEYSLOT` to diagnose which keys are in different slots:

```bash
redis-cli CLUSTER KEYSLOT key1
redis-cli CLUSTER KEYSLOT key2
# If they return different values, group them with a shared hash tag
```

## Summary

`CLUSTER KEYSLOT` is an essential diagnostic tool for Redis Cluster development. It reveals the hash slot for any key, helping you design hash tag strategies that co-locate related keys, avoid cross-slot errors, and understand how data distributes across your cluster nodes.
