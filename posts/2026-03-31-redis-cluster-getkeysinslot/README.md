# How to Use CLUSTER GETKEYSINSLOT in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, CLUSTER GETKEYSINSLOT, Operation, Data Management

Description: Learn how to use CLUSTER GETKEYSINSLOT in Redis to list keys assigned to a specific hash slot, useful for debugging slot assignments, validating key distribution, and manual slot migration.

---

## Overview

`CLUSTER GETKEYSINSLOT` returns up to a specified count of key names stored in the given hash slot on the current node. This is used during manual slot migration, debugging key distribution, and verifying that hash tags are working correctly in cluster mode.

## Syntax

```redis
CLUSTER GETKEYSINSLOT slot count
```

- `slot`: An integer from 0 to 16383
- `count`: Maximum number of keys to return

Returns an array of key names.

## Basic Usage

### Get up to 10 keys in slot 0

```redis
CLUSTER GETKEYSINSLOT 0 10
```

```text
1) "key:abc"
2) "key:def"
3) "{user}:profile:1"
```

### Get all keys in a slot (use a large count)

```redis
CLUSTER GETKEYSINSLOT 5460 1000
```

### Check how many keys are in a slot

```redis
CLUSTER COUNTKEYSINSLOT 5460
```

```text
(integer) 247
```

Use `CLUSTER COUNTKEYSINSLOT` first to see how many keys exist before fetching them.

## Finding Which Slot a Key Belongs To

```redis
CLUSTER KEYSLOT mykey
```

```text
(integer) 14687
```

Then retrieve other keys in the same slot:

```redis
CLUSTER GETKEYSINSLOT 14687 20
```

## Practical Use Cases

### Verify hash tag co-location

Hash tags `{tag}` force related keys to the same slot. Verify they are co-located:

```redis
# These should all be in the same slot
CLUSTER KEYSLOT {order:1001}:details
CLUSTER KEYSLOT {order:1001}:items
CLUSTER KEYSLOT {order:1001}:status
```

```text
(integer) 241
(integer) 241
(integer) 241
```

Then list all keys in that slot:

```redis
CLUSTER GETKEYSINSLOT 241 100
```

```text
1) "{order:1001}:details"
2) "{order:1001}:items"
3) "{order:1001}:status"
4) "{order:1002}:details"
...
```

### Manual slot migration debugging

During manual slot migration, verify that keys have moved:

```redis
# Before migration: check keys in slot on source node
CLUSTER GETKEYSINSLOT 1000 100

# After migration: same command on source should return empty
CLUSTER GETKEYSINSLOT 1000 100
```

```text
(empty array)
```

```redis
# On destination node:
CLUSTER GETKEYSINSLOT 1000 100
```

```text
1) "key1"
2) "key2"
...
```

### Audit keys in a problematic slot

If a slot is in `MIGRATING` or `IMPORTING` state:

```redis
CLUSTER GETKEYSINSLOT 7500 50
```

This shows which keys remain in the slot and need to be migrated.

## Iterating All Keys in a Slot

For slots with many keys, use a loop:

```bash
#!/bin/bash
SLOT=5000
BATCH=100
redis-cli -p 7001 CLUSTER COUNTKEYSINSLOT $SLOT

# Iterate keys in batches (GETKEYSINSLOT always returns from the beginning)
# Use MIGRATE in batches or SCAN with slot filtering for complete iteration
redis-cli -p 7001 CLUSTER GETKEYSINSLOT $SLOT $BATCH
```

Note: `CLUSTER GETKEYSINSLOT` always returns from the beginning of the slot's key list. To iterate all keys in a large slot, use the count as the total slot size from `CLUSTER COUNTKEYSINSLOT`.

## Slot Distribution Analysis

```bash
#!/bin/bash
# Show top 10 most populated slots
for slot in $(seq 0 16383); do
  count=$(redis-cli -p 7001 CLUSTER COUNTKEYSINSLOT $slot)
  if [ $count -gt 0 ]; then
    echo "$count $slot"
  fi
done | sort -rn | head -n 10
```

## Summary

`CLUSTER GETKEYSINSLOT slot count` returns up to `count` key names stored in the specified hash slot on the current node. Use it to verify that hash tags are co-locating keys correctly, debug slot migration progress, audit keys in a specific slot, and analyze key distribution across slots. Pair it with `CLUSTER COUNTKEYSINSLOT` to check how many keys exist in a slot before listing them. Keys that belong to slots not owned by the current node will not appear in the output.
