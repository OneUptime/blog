# How Redis Hashes Work Internally (Hashtable and Listpack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, Hashtable, Listpack, Internal

Description: Learn how Redis hashes use listpack encoding for small hashes and a hashtable for large ones, and how this affects memory usage for object storage.

---

Redis hashes map string fields to string values, making them ideal for storing objects. Internally, Redis uses `listpack` for small hashes and a `hashtable` for larger ones - choosing the encoding that best balances memory and lookup speed.

## The Two Hash Encodings

```bash
HSET user:1 name "Alice" age 30 city "NYC"
OBJECT ENCODING user:1
# Returns: "listpack"

# Exceed the threshold
python3 -c "import redis; r=redis.Redis(); [r.hset('big_hash', f'field{i}', f'value{i}') for i in range(200)]"
OBJECT ENCODING big_hash
# Returns: "hashtable"
```

## Listpack Encoding

When a hash has few fields with small values, Redis stores it as a flat `listpack` - a contiguous byte array with no per-entry pointers. Fields and values are stored as consecutive pairs:

```text
[total_bytes][num_elements][field0][value0][field1][value1]...[0xFF]
```

This is extremely memory efficient but requires linear scan for field lookups - acceptable because small hashes are small.

```bash
CONFIG GET hash-max-listpack-entries
# Default: 128

CONFIG GET hash-max-listpack-value
# Default: 64 (max bytes per field or value)
```

## Hashtable Encoding

When a hash exceeds the listpack thresholds, Redis converts it to a proper hash table with separate chaining. Each bucket stores a linked list of entries, and the table resizes dynamically.

```text
Hashtable:
bucket["name"] -> "Alice"
bucket["age"]  -> "30"
bucket["city"] -> "NYC"
...
```

Field lookups become O(1) on average, essential for hashes with many fields.

## Memory Efficiency of Listpack

The memory difference between encodings is significant for small objects:

```python
import redis

r = redis.Redis()

# Hash with 3 fields (listpack)
r.hset("small_obj", mapping={"name": "Alice", "age": "30", "role": "admin"})
print("Small hash:", r.memory_usage("small_obj"), "bytes")

# Same data in a large hash (hashtable)
for i in range(150):
    r.hset("large_obj", f"field{i}", f"value{i}")
print("Large hash:", r.memory_usage("large_obj"), "bytes")
```

## Hashes vs Flat Keys for Object Storage

Storing user objects as hashes instead of separate string keys is a major Redis memory optimization:

```bash
# Wasteful: separate string keys (each has ~64 byte overhead)
SET user:1:name "Alice"
SET user:1:age "30"
SET user:1:city "NYC"

# Efficient: single hash (one object, listpack when small)
HSET user:1 name "Alice" age 30 city "NYC"
```

## Tuning the Thresholds

```bash
# Increase listpack limit for larger objects
CONFIG SET hash-max-listpack-entries 256
CONFIG SET hash-max-listpack-value 128

# Or reduce for memory-constrained environments
CONFIG SET hash-max-listpack-entries 64
```

Raising the threshold saves memory for hashes that stay under the limit but increases CPU time for linear scans in large listpack hashes.

## Checking Encoding at Runtime

```bash
# Verify encoding type
OBJECT ENCODING user:1

# Check memory
MEMORY USAGE user:1

# See full debug info
DEBUG OBJECT user:1
# Output: Value at:0x... refcount:1 encoding:listpack serializedlength:... lru:...
```

## When to Use Hashes

- **User profiles**: all user attributes in one hash
- **Session data**: store session fields with one key per session
- **Product catalogs**: attributes as fields, product ID as key
- **Configuration objects**: grouping related settings

```bash
# Increment a numeric field in place
HINCRBY user:1 login_count 1
HINCRBYFLOAT product:99 price 0.50
```

## Summary

Redis hashes use `listpack` encoding for small collections (default up to 128 fields, 64 bytes per value) and `hashtable` for larger ones. Listpack is extremely memory efficient but requires linear scans; hashtable provides O(1) field access at higher memory cost. Storing small objects as hashes rather than individual string keys can dramatically reduce Redis memory usage.
