# How to Calculate Memory Usage for Redis Data Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Data Type, Optimization

Description: Calculate exact and estimated memory usage for Redis strings, hashes, lists, sets, and sorted sets using MEMORY USAGE and internal encoding knowledge.

---

Understanding how much memory each Redis data type consumes helps you predict costs, set appropriate limits, and choose the right encoding. Redis stores more than just your data - each key carries overhead.

## The MEMORY USAGE Command

The most direct way to measure memory is `MEMORY USAGE`:

```bash
SET mykey "hello world"
MEMORY USAGE mykey
# (integer) 56

HSET user:1 name Alice age 30 city NYC
MEMORY USAGE user:1
# (integer) 128

# In Python
r.memory_usage("mykey")            # returns bytes
r.memory_usage("user:1", samples=0)  # samples=0 = exact
```

`MEMORY USAGE` includes:
- Key string allocation
- Value payload
- Object metadata
- jemalloc bookkeeping overhead

## Per-Type Overhead Breakdown

### Strings

```text
Encoding         Threshold           Bytes overhead
int              value fits int64    ~40 bytes
embstr           <= 44 bytes         ~56 bytes (object + value in one alloc)
raw              > 44 bytes          ~72 bytes + string length
```

```python
# Approximate string memory
def estimate_string_memory(key, value):
    key_bytes = len(key.encode())
    val_bytes = len(value.encode())
    # Key: ~56 bytes base + key length
    # Value: ~64 bytes base + value length (rounded to next jemalloc bin)
    return 56 + key_bytes + 64 + val_bytes
```

### Hashes

The internal encoding switches based on size:

```bash
# Check encoding
OBJECT ENCODING user:1
# "listpack" (if fields <= hash-max-listpack-entries AND values <= 64 bytes)
# "hashtable" (if exceeds thresholds)
```

```text
Encoding    Memory per entry (approx)
listpack    ~20-40 bytes per field-value pair
hashtable   ~64 bytes per field-value pair + bucket overhead
```

### Lists

```bash
OBJECT ENCODING mylist
# "listpack" or "quicklist"
```

```text
Encoding    Memory per element
listpack    ~16 bytes + element size
quicklist   ~36 bytes + element size (nodes limited to 8 KB by default)
```

### Sets

```text
Encoding    Condition                 Memory per element
listpack    <= 128 members, int/str  ~16 bytes
intset      all integers, <= 512     4-8 bytes (packed array)
hashtable   exceeds threshold        ~64 bytes
```

### Sorted Sets (ZSETs)

```text
Encoding    Condition                Memory per element
listpack    <= 128 members           ~32 bytes (score + member)
skiplist    > 128 members            ~96-128 bytes (skiplist node)
```

## Bulk Memory Estimation Script

```python
import redis

r = redis.Redis(decode_responses=True)

def estimate_total_memory(r, pattern="*", sample_size=100):
    cursor = 0
    sampled_keys = []
    total_matching = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=50)
        total_matching += len(keys)
        if len(sampled_keys) < sample_size:
            sampled_keys.extend(keys[:sample_size - len(sampled_keys)])
        if cursor == 0:
            break

    if not sampled_keys:
        return 0

    total_sample_bytes = sum(
        r.memory_usage(k, samples=1) or 0
        for k in sampled_keys
    )
    avg_bytes = total_sample_bytes / len(sampled_keys)
    return int(avg_bytes * total_matching)

estimated = estimate_total_memory(r, "user:*")
print(f"Estimated memory for user:* keys: {estimated / 1024 / 1024:.1f} MB")
```

## Comparing Encoding Memory Impact

```python
import redis

r = redis.Redis()

# Listpack hash (under threshold)
r.delete("small_hash")
r.hset("small_hash", mapping={f"f{i}": f"v{i}" for i in range(10)})
small_mem = r.memory_usage("small_hash")

# Hashtable hash (over threshold)
r.delete("large_hash")
r.hset("large_hash", mapping={f"field_{i}": f"value_{i}" for i in range(200)})
large_mem = r.memory_usage("large_hash")

per_entry_small = small_mem / 10
per_entry_large = large_mem / 200
print(f"Listpack: {per_entry_small:.0f} bytes/entry")
print(f"Hashtable: {per_entry_large:.0f} bytes/entry")
```

## Summary

Redis memory usage per key includes the key name, value payload, encoding metadata, and jemalloc allocation overhead. Use `MEMORY USAGE` for exact per-key measurements and `OBJECT ENCODING` to confirm which internal encoding is active. The most impactful optimization is keeping collections under the listpack thresholds - listpack uses 2-3x less memory than hashtable or skiplist encodings.
