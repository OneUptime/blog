# How to Use CLUSTER GETKEYSINSLOT in Redis to List Slot Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Hash Slot, Key, Operation

Description: Learn how to use CLUSTER GETKEYSINSLOT in Redis to retrieve keys stored in a specific hash slot, useful for slot migration and debugging.

---

## What Is CLUSTER GETKEYSINSLOT?

`CLUSTER GETKEYSINSLOT` returns a list of keys stored in a specific hash slot on the current node. It is primarily used during slot migration operations to identify which keys need to be moved, and for debugging to verify that keys are distributed across slots as expected.

## Basic Syntax

```text
CLUSTER GETKEYSINSLOT slot count
```

Parameters:
- `slot` - the hash slot number (0 to 16383)
- `count` - maximum number of keys to return

## Basic Usage

```bash
# Get up to 10 keys in slot 0
CLUSTER GETKEYSINSLOT 0 10
# Returns a list of key names stored in slot 0

# Get up to 100 keys in slot 7638
CLUSTER GETKEYSINSLOT 7638 100
```

## Finding Which Slot a Key Belongs To

Before using `CLUSTER GETKEYSINSLOT`, you can use `CLUSTER KEYSLOT` to find which slot a key maps to:

```bash
# Find slot for a key
CLUSTER KEYSLOT user:1000
# Returns: 1649

# Then get other keys in that slot
CLUSTER GETKEYSINSLOT 1649 20
```

## Counting Keys in a Slot

To check how many keys are in a slot without listing them, use `CLUSTER COUNTKEYSINSLOT`:

```bash
CLUSTER COUNTKEYSINSLOT 1649
# Returns: 42
```

## Paginating Through All Keys in a Slot

If a slot contains many keys, retrieve them in batches:

```bash
# Get first 100 keys
CLUSTER GETKEYSINSLOT 1649 100

# The cursor-like approach: use SCAN within the slot context
# Or get all via large count
CLUSTER GETKEYSINSLOT 1649 10000
```

## Use Case: Slot Migration Verification

During a slot migration (moving a slot from one node to another), you can use this command to verify all keys have been migrated:

```bash
# Before migration: count keys in slot on source
redis-cli -h source-node -p 6379 CLUSTER COUNTKEYSINSLOT 1649
# Returns: 42

# After migration: count on destination
redis-cli -h dest-node -p 6379 CLUSTER COUNTKEYSINSLOT 1649
# Returns: 42 (all keys migrated)

# Verify source has 0 keys in slot now
redis-cli -h source-node -p 6379 CLUSTER COUNTKEYSINSLOT 1649
# Returns: 0
```

## Use Case: Manual Key Migration

```bash
# Get keys to migrate
KEYS_IN_SLOT=$(redis-cli -h source -p 6379 CLUSTER GETKEYSINSLOT 1649 100)

# Migrate each key
for key in $KEYS_IN_SLOT; do
  redis-cli -h source -p 6379 MIGRATE dest-host 6379 $key 0 5000
done
```

## Python Example

```python
import redis

r = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)

# Populate some keys
for i in range(100):
    r.set(f'key:{i}', f'value:{i}')

# Find which slot 'key:1' maps to
slot = r.cluster('keyslot', 'key:1')
print(f"key:1 is in slot: {slot}")

# Get all keys in that slot
keys = r.cluster('getkeysinslot', slot, 50)
print(f"Keys in slot {slot}: {keys[:5]}...")
print(f"Total returned: {len(keys)}")

# Count keys in a specific slot
count = r.cluster('countkeysinslot', slot)
print(f"Total keys in slot {slot}: {count}")
```

## Checking All Slots on a Node

```python
import redis

def find_populated_slots(host, port, sample_count=10):
    """Find all slots with keys on a node."""
    r = redis.Redis(host=host, port=port, decode_responses=True)
    populated = {}

    for slot in range(16384):
        count = r.cluster('countkeysinslot', slot)
        if count > 0:
            populated[slot] = count

    return populated

# Note: iterating all 16384 slots is slow - use sparingly
```

## Summary

`CLUSTER GETKEYSINSLOT` is a key tool for Redis Cluster operations, particularly during slot migration and debugging. Paired with `CLUSTER KEYSLOT` to find the slot for a given key and `CLUSTER COUNTKEYSINSLOT` to check slot occupancy, it gives you full visibility into how data is distributed across hash slots. Always run it against the specific node that owns the slot, as each node only holds keys for the slots it is responsible for.
