# How to Use OBJECT REFCOUNT in Redis to Check Key References

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Optimization, Command, Internal, Debugging

Description: Learn how to use OBJECT REFCOUNT in Redis to check how many internal references point to a key's value object, revealing Redis's integer sharing and memory optimization behavior.

---

## What Is OBJECT REFCOUNT

`OBJECT REFCOUNT` returns the number of internal references that Redis maintains for a key's value object. This is primarily useful for understanding Redis's internal memory optimizations, particularly integer sharing, where Redis reuses the same object for commonly used integer values.

```text
OBJECT REFCOUNT key
```

Returns the reference count as an integer, or a null reply if the key does not exist.

## Basic Usage

```bash
SET mykey "hello"
OBJECT REFCOUNT mykey
# (integer) 1

SET counter 42
OBJECT REFCOUNT counter
# (integer) 2147483647  <- shared integer!

SET other_counter 42
OBJECT REFCOUNT other_counter
# (integer) 2147483647  <- same shared object!
```

## Integer Sharing in Redis

Redis pre-creates and shares integer objects for values in the range 0 to 9999 (the `REDIS_SHARED_INTEGERS` range). When you store any of these values, multiple keys share the same internal object - so the refcount appears as a very large number (INT_MAX = 2147483647).

```bash
# Shared integers (0-9999)
SET a 0
OBJECT REFCOUNT a
# (integer) 2147483647  <- shared

SET b 5000
OBJECT REFCOUNT b
# (integer) 2147483647  <- shared

SET c 10000
OBJECT REFCOUNT c
# (integer) 1  <- not shared (above 9999)

SET d 100000
OBJECT REFCOUNT d
# (integer) 1  <- not shared
```

## Non-Integer Values

For strings, lists, hashes, and other types, the refcount is typically 1:

```bash
SET greeting "hello world"
OBJECT REFCOUNT greeting
# (integer) 1

LPUSH mylist "a" "b" "c"
OBJECT REFCOUNT mylist
# (integer) 1

HSET myhash field1 value1
OBJECT REFCOUNT myhash
# (integer) 1
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Test integer sharing
test_cases = [
    ('shared:0', '0'),
    ('shared:100', '100'),
    ('shared:9999', '9999'),
    ('not_shared:10000', '10000'),
    ('not_shared:99999', '99999'),
    ('string:val', 'hello'),
    ('float:val', '3.14'),
]

print("OBJECT REFCOUNT results:")
for key, value in test_cases:
    client.set(key, value)
    refcount = client.object_refcount(key)
    shared = refcount == 2147483647
    print(f"  {key} = {value!r}: refcount={refcount} {'(SHARED INTEGER)' if shared else ''}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

const testCases = [
  ['int:0', '0'],
  ['int:1000', '1000'],
  ['int:9999', '9999'],
  ['int:10000', '10000'],
  ['str:hello', 'hello'],
];

for (const [key, value] of testCases) {
  await client.set(key, value);
  const refcount = await client.objectRefCount(key);
  const isShared = refcount === 2147483647;
  console.log(`${key} = "${value}": refcount=${refcount}${isShared ? ' [SHARED]' : ''}`);
}
```

## When Is OBJECT REFCOUNT Useful

**1. Understanding memory behavior**

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def analyze_integer_sharing():
    """Demonstrate how integer sharing saves memory."""
    # Store 1000 keys all with value "100"
    for i in range(1000):
        client.set(f'key:{i}', '100')

    # All share the same object!
    sample_refcount = client.object_refcount('key:0')
    print(f"All 1000 keys pointing to '100' share refcount: {sample_refcount}")
    print("Memory for 1000 keys storing '100' is same as 1 key")

analyze_integer_sharing()
```

**2. Verifying encoding and internal state**

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def inspect_key(key):
    if not client.exists(key):
        return None
    return {
        'type': client.type(key),
        'encoding': client.object_encoding(key),
        'refcount': client.object_refcount(key),
        'idletime': client.object_idletime(key),
    }

client.set('test:int', '42')
client.set('test:str', 'hello world')
client.lpush('test:list', 'a', 'b', 'c')

for key in ['test:int', 'test:str', 'test:list']:
    print(f"{key}: {inspect_key(key)}")
```

## OBJECT REFCOUNT in Context of OBJECT Subcommands

`OBJECT` has several subcommands for inspecting internal Redis state:

```bash
# Reference count
OBJECT REFCOUNT key

# Internal encoding
OBJECT ENCODING key
# Returns: embstr, raw, int, listpack, skiplist, etc.

# Seconds since last access (LRU)
OBJECT IDLETIME key

# LFU access frequency (requires LFU policy)
OBJECT FREQ key

# Help
OBJECT HELP
```

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def full_object_info(key):
    if not client.exists(key):
        return {'exists': False}

    info = {
        'exists': True,
        'type': client.type(key),
        'encoding': client.object_encoding(key),
        'refcount': client.object_refcount(key),
        'idletime_seconds': client.object_idletime(key),
    }

    # LFU frequency if enabled
    try:
        info['lfu_freq'] = client.object_freq(key)
    except redis.ResponseError:
        info['lfu_freq'] = 'N/A (LFU policy not enabled)'

    return info

client.set('demo', '42')
print(full_object_info('demo'))
```

## Memory Optimization Insight

Understanding integer sharing helps you make better data modeling decisions:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Memory efficient: store as integer (shared)
for user_id in range(10000):
    # Status values 0-9999 will use shared integers
    client.hset(f'user:{user_id}', 'status', '1')  # Shared!

# Less efficient: store as non-shared string
# client.hset(f'user:{user_id}', 'status', 'active')  # Not shared

print("Storing status as shared integer '1' vs string 'active'")
print("With 10,000 users, integer approach saves significant memory")
```

## Summary

`OBJECT REFCOUNT` returns the internal reference count for a key's value object in Redis. The most practical insight it provides is identifying Redis's integer sharing optimization - integers in the range 0-9999 return a refcount of INT_MAX (2147483647) because Redis pre-creates and shares these objects across all keys using them. For non-shared values like strings or large integers, the refcount is typically 1. Use this command alongside `OBJECT ENCODING` and `OBJECT IDLETIME` for a complete picture of a key's internal state.
