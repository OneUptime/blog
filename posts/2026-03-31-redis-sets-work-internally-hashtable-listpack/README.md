# How Redis Sets Work Internally (Hashtable and Listpack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, Hashtable, Listpack, Internal

Description: Discover how Redis sets use listpack encoding for small sets and a hashtable for larger ones, and how to tune these thresholds for memory efficiency.

---

Redis sets provide O(1) add, remove, and membership testing with no duplicate elements. Internally, Redis uses `listpack` encoding for small sets and a `hashtable` for larger ones - automatically switching when thresholds are exceeded.

## The Two Set Encodings

```bash
SADD colors red green blue
OBJECT ENCODING colors
# Returns: "listpack"

# Trigger hashtable by exceeding the threshold
python3 -c "import redis; r=redis.Redis(); [r.sadd('bigset', f'item{i}') for i in range(200)]"
OBJECT ENCODING bigset
# Returns: "hashtable"
```

## Listpack Encoding for Small Sets

When a set has few small-value members, Redis stores it as a `listpack` - a flat, packed byte array. This is extremely memory efficient because there is no per-element pointer overhead.

```bash
# Thresholds that trigger the switch from listpack to hashtable
CONFIG GET set-max-listpack-entries
# Default: 128 (max elements)

CONFIG GET set-max-listpack-value
# Default: 64 (max bytes per element)
```

## Hashtable Encoding for Large Sets

When a set exceeds the listpack thresholds, Redis converts it to a standard hash table with chaining. The hash table doubles in size when load factor exceeds 1.0, and halves when load factor drops below 0.1 (with lazy resizing).

```text
Hashtable structure:
[bucket 0] -> [entry: "item5"] -> [entry: "item99"] -> NULL
[bucket 1] -> [entry: "item12"] -> NULL
[bucket 2] -> NULL
...
```

## Integer Set Encoding

There is actually a third encoding for sets where all members are integers: `intset`. An intset is a sorted array of integers, providing compact storage and binary search O(log n) membership.

```bash
SADD scores 10 20 30 40 50
OBJECT ENCODING scores
# Returns: "intset"

# Adding a non-integer degrades to listpack/hashtable
SADD scores "not_a_number"
OBJECT ENCODING scores
# Returns: "listpack" (if small) or "hashtable"
```

```bash
# Intset size threshold
CONFIG GET set-max-intset-entries
# Default: 512
```

## Encoding Transitions in Practice

```bash
# Start with intset
SADD primes 2 3 5 7 11 13
OBJECT ENCODING primes   # "intset"

# Add a string - becomes listpack
SADD primes "two"
OBJECT ENCODING primes   # "listpack"

# Add 129+ members - becomes hashtable
# (after listpack threshold exceeded)
```

## Tuning Set Thresholds

```bash
# For memory savings with small sets, keep default or slightly raise
CONFIG SET set-max-listpack-entries 128

# For all-integer sets, raise intset limit to defer hashtable
CONFIG SET set-max-intset-entries 1024
```

## Memory Comparison

```python
import redis

r = redis.Redis()

# Create listpack-encoded set (small)
for i in range(10):
    r.sadd("small_set", f"item_{i}")
print("Small set memory:", r.memory_usage("small_set"))

# Create hashtable-encoded set (large)
for i in range(500):
    r.sadd("large_set", f"item_{i}")
print("Large set memory:", r.memory_usage("large_set"))
```

## When to Use Sets

- **Unique visitor tracking**: `SADD visitors:2024-01-01 user_id`
- **Tag systems**: `SADD tags:post:123 python redis backend`
- **Friend lists**: intersect two user sets with `SINTER`
- **Access control lists**: membership check with `SISMEMBER`

```bash
# Find common friends
SINTER friends:alice friends:bob
```

## Summary

Redis sets use three internal encodings: `intset` for all-integer small sets, `listpack` for mixed small sets, and `hashtable` for large sets. Automatic encoding promotion happens when element count or size thresholds are exceeded. Tune `set-max-listpack-entries`, `set-max-listpack-value`, and `set-max-intset-entries` to balance memory efficiency against CPU overhead for your workload.
