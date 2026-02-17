# How to Fix 'CROSSSLOT' Errors in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Troubleshooting, Hash Tags, Multi-Key Operations

Description: Resolve Redis Cluster CROSSSLOT errors by understanding hash slots, using hash tags for key grouping, and redesigning multi-key operations for cluster compatibility.

---

The "CROSSSLOT Keys in request don't hash to the same slot" error occurs in Redis Cluster when you try to run a multi-key command where the keys belong to different hash slots. Redis Cluster distributes keys across 16384 slots on different nodes, and multi-key operations only work when all keys are on the same slot.

## Understanding the Error

```python
# Error message:
# redis.exceptions.ResponseError: CROSSSLOT Keys in request don't hash to the same slot

from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# This fails - keys hash to different slots
rc.mget('user:1', 'user:2', 'user:3')  # CROSSSLOT error!

# This also fails
rc.mset({'key1': 'a', 'key2': 'b', 'key3': 'c'})  # CROSSSLOT error!
```

## How Hash Slots Work

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# Check which slot a key maps to
def show_slots(*keys):
    for key in keys:
        slot = rc.cluster_keyslot(key)
        print(f"'{key}' -> slot {slot}")

show_slots('user:1', 'user:2', 'user:3')
# 'user:1' -> slot 5474
# 'user:2' -> slot 5765
# 'user:3' -> slot 9852

# Different slots = cannot use multi-key commands together
```

## Solution 1: Hash Tags

Hash tags force keys to the same slot by using the text between `{` and `}` for hashing:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# With hash tags, only the text in {} is hashed
def show_hash_tag_slots():
    keys = ['{user:1}:profile', '{user:1}:settings', '{user:1}:orders']

    for key in keys:
        slot = rc.cluster_keyslot(key)
        print(f"'{key}' -> slot {slot}")

show_hash_tag_slots()
# '{user:1}:profile' -> slot 5474
# '{user:1}:settings' -> slot 5474
# '{user:1}:orders' -> slot 5474

# Now multi-key operations work!
rc.mset({
    '{user:1}:profile': '{"name": "Alice"}',
    '{user:1}:settings': '{"theme": "dark"}',
    '{user:1}:orders': '[]'
})

# MGET works too
values = rc.mget('{user:1}:profile', '{user:1}:settings')
print(values)
```

## Hash Tag Patterns

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# Pattern 1: Entity-based grouping
# All data for one user on same slot
user_keys = {
    '{user:123}:profile': '{}',
    '{user:123}:settings': '{}',
    '{user:123}:notifications': '[]',
}
rc.mset(user_keys)

# Pattern 2: Session-based grouping
# Session and related data together
session_keys = {
    '{session:abc}:data': '{}',
    '{session:abc}:user': 'user:123',
    '{session:abc}:expires': '3600',
}
rc.mset(session_keys)

# Pattern 3: Transaction grouping
# Related operations in same transaction
order_keys = {
    '{order:500}:items': '[]',
    '{order:500}:total': '0',
    '{order:500}:status': 'pending',
}
rc.mset(order_keys)

# Pattern 4: Aggregate keys
# Keys that need atomic operations together
rc.sadd('{tags}:python', 'post:1', 'post:5', 'post:10')
rc.sadd('{tags}:redis', 'post:2', 'post:5', 'post:8')
# Can now use SINTER, SUNION, SDIFF
intersection = rc.sinter('{tags}:python', '{tags}:redis')
```

## Solution 2: Pipeline Individual Operations

If keys cannot be on the same slot, execute operations individually with pipelining:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# Instead of MGET across slots, pipeline individual GETs
def safe_mget(keys):
    """MGET alternative that works across slots"""
    pipe = rc.pipeline()

    for key in keys:
        pipe.get(key)

    return pipe.execute()

# Works even with keys on different slots
keys = ['user:1', 'user:2', 'user:3']
values = safe_mget(keys)
print(dict(zip(keys, values)))

# Same for MSET
def safe_mset(mapping):
    """MSET alternative that works across slots"""
    pipe = rc.pipeline()

    for key, value in mapping.items():
        pipe.set(key, value)

    return pipe.execute()

safe_mset({
    'user:1': 'Alice',
    'user:2': 'Bob',
    'user:3': 'Charlie'
})
```

## Solution 3: Lua Scripts with Hash Tags

Lua scripts require all keys on the same slot:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# Script to transfer between accounts
transfer_script = rc.register_script("""
local from_key = KEYS[1]
local to_key = KEYS[2]
local amount = tonumber(ARGV[1])

local from_balance = tonumber(redis.call('GET', from_key) or 0)
if from_balance < amount then
    return {0, 'Insufficient funds'}
end

redis.call('DECRBY', from_key, amount)
redis.call('INCRBY', to_key, amount)
return {1, 'OK'}
""")

# Use hash tags so keys are on same slot
rc.set('{accounts}:alice', 1000)
rc.set('{accounts}:bob', 500)

# Now the script works
result = transfer_script(
    keys=['{accounts}:alice', '{accounts}:bob'],
    args=[200]
)
print(f"Transfer result: {result}")
```

## Solution 4: Redesign Data Model

Sometimes you need to restructure how data is organized:

```python
from redis.cluster import RedisCluster
import json

rc = RedisCluster(host='localhost', port=7000)

# BEFORE: Separate keys that need joint operations
# rc.set('product:1:stock', 100)
# rc.set('product:2:stock', 50)
# rc.mget('product:1:stock', 'product:2:stock')  # CROSSSLOT!

# AFTER Option 1: Use a hash instead
rc.hset('product_stock', mapping={
    '1': 100,
    '2': 50,
    '3': 75
})
# Get multiple at once
stocks = rc.hmget('product_stock', '1', '2', '3')

# AFTER Option 2: Store related data in one key
order_data = {
    'items': [
        {'product_id': 1, 'quantity': 2},
        {'product_id': 2, 'quantity': 1}
    ],
    'total': 149.97,
    'status': 'pending'
}
rc.set('order:500', json.dumps(order_data))

# AFTER Option 3: Use hash tags for entity groups
# If operations are always within one entity, hash tags work
rc.set('{cart:user123}:items', '[]')
rc.set('{cart:user123}:total', '0')
rc.set('{cart:user123}:count', '0')
```

## Commands Affected by CROSSSLOT

| Command | Requires Same Slot |
|---------|-------------------|
| MGET | Yes |
| MSET | Yes |
| DEL (multiple keys) | Yes |
| RENAME | Yes |
| COPY | Yes |
| SINTER, SUNION, SDIFF | Yes |
| ZINTER, ZUNION, ZDIFF | Yes |
| PFMERGE | Yes |
| EVAL (with multiple KEYS) | Yes |
| WATCH (multiple keys) | Yes |

## Checking Slot Distribution

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

def analyze_keys(pattern, sample_size=100):
    """Analyze slot distribution of keys matching pattern"""
    slot_counts = {}

    cursor = 0
    count = 0

    while count < sample_size:
        cursor, keys = rc.scan(cursor, match=pattern, count=100)

        for key in keys:
            slot = rc.cluster_keyslot(key.decode() if isinstance(key, bytes) else key)
            slot_counts[slot] = slot_counts.get(slot, 0) + 1
            count += 1
            if count >= sample_size:
                break

        if cursor == 0:
            break

    print(f"Keys analyzed: {count}")
    print(f"Unique slots: {len(slot_counts)}")
    print(f"Slots with most keys:")
    for slot, c in sorted(slot_counts.items(), key=lambda x: -x[1])[:5]:
        print(f"  Slot {slot}: {c} keys")

# Check your key distribution
analyze_keys('user:*')
```

## Summary

| Solution | When to Use |
|----------|-------------|
| Hash tags | Keys that always need to be accessed together |
| Pipeline individual ops | One-time bulk operations |
| Lua scripts + hash tags | Atomic multi-key operations |
| Redesign data model | Long-term scalability |

Key points:
- CROSSSLOT is a fundamental cluster limitation, not a bug
- Hash tags `{...}` control which slot keys go to
- Design your key schema with clustering in mind from the start
- Use hashes to group related fields under one key
- Pipeline individual operations as a workaround
- Test your key patterns before production deployment
