# How to Handle Redis Memory Overhead per Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Key, Optimization

Description: Understand and reduce the per-key memory overhead in Redis, including dict entry, SDS string, and object header costs that often exceed the value size.

---

Every Redis key carries overhead beyond the value data itself. For small values, this overhead can be 5-10x the actual data. Understanding and reducing per-key overhead is one of the most impactful memory optimizations in Redis.

## Per-Key Memory Breakdown

```text
Component              Size       Notes
-----------            -----      ------
Redis object header    16 bytes   type, encoding, LRU, refcount
SDS key string         ~40 bytes  + key length rounded up
Dict entry             24 bytes   key, value, next pointers
jemalloc padding       8-32 bytes alignment to bin size
--------------------------------
Total overhead:        ~88-112 bytes minimum per key
```

For a key like `user:42` (7 bytes) with value `Alice` (5 bytes):

```bash
SET user:42 Alice
MEMORY USAGE user:42
# Result: ~56 bytes (embstr co-location optimization)
```

But for a longer key + value:

```bash
SET "user:profile:1234567890" "some_value_here_with_more_data"
MEMORY USAGE "user:profile:1234567890"
# Result: ~104 bytes (key + value + overhead)
```

## Measuring Actual Overhead

```python
import redis

r = redis.Redis()

def measure_overhead(key_length, value_length):
    key = "k" * key_length
    value = "v" * value_length
    r.set(key, value)
    total = r.memory_usage(key) or 0
    data = key_length + value_length
    overhead = total - data
    r.delete(key)
    return total, data, overhead

print(f"{'Key len':>8} {'Val len':>8} {'Total':>8} {'Data':>8} {'Overhead':>8} {'OH%':>6}")
for kl in [5, 10, 20, 50]:
    for vl in [5, 20, 100]:
        total, data, oh = measure_overhead(kl, vl)
        pct = 100 * oh / total if total > 0 else 0
        print(f"{kl:8d} {vl:8d} {total:8d} {data:8d} {oh:8d} {pct:6.0f}%")
```

## Strategies to Reduce Per-Key Overhead

### Strategy 1: Use Hashes Instead of Flat Keys

Instead of one key per attribute:

```bash
# Bad: 88+ bytes overhead per key
SET user:1:name "Alice"
SET user:1:age "30"
SET user:1:city "NYC"
# Total: 3 keys x ~100 bytes overhead = ~300 bytes overhead alone
```

Use a single hash:

```bash
# Good: 1 key overhead, all attributes in listpack
HSET user:1 name Alice age 30 city NYC
MEMORY USAGE user:1
# ~120 bytes total including overhead
```

### Strategy 2: Shorter Key Names

```text
Before: "user:profile:settings:notifications:email"  (43 bytes)
After:  "ups:e:42"                                   (8 bytes)
Savings: 35 bytes per key x 1M keys = 33 MB
```

Use a key naming convention that balances readability and length:

```python
# Namespace mapping
NS = {
    "user_profile": "up",
    "session":      "s",
    "product":      "p",
    "cache":        "c",
}

def make_key(namespace, id):
    return f"{NS[namespace]}:{id}"

key = make_key("user_profile", 42)  # "up:42"
```

### Strategy 3: Pack Multiple Values into One Key

Instead of `counter:pageviews:article:42` for each article:

```bash
# Pack into a hash
HINCRBY "counters:articles" "42:views" 1
# Many counters share one hash overhead
```

### Strategy 4: Use Integer Values

Redis stores integers as int encoding (no SDS string for the value):

```bash
SET article_views:42 1000
OBJECT ENCODING article_views:42  # "int" - no string allocation for value
```

## Analyzing Key Overhead Distribution

```python
import redis

r = redis.Redis(decode_responses=True)

def analyze_overhead(r, pattern="*", sample_size=500):
    cursor = 0
    results = []

    while len(results) < sample_size:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            mem = r.memory_usage(key, samples=1) or 0
            key_bytes = len(key.encode())
            results.append((key, mem, key_bytes))
        if cursor == 0:
            break

    results.sort(key=lambda x: x[1], reverse=True)
    total_mem = sum(m for _, m, _ in results)
    total_key_bytes = sum(kb for _, _, kb in results)
    avg_overhead = (total_mem - total_key_bytes) / len(results)

    print(f"Sample size: {len(results)}")
    print(f"Avg memory per key: {total_mem / len(results):.0f} bytes")
    print(f"Avg key name size: {total_key_bytes / len(results):.0f} bytes")
    print(f"Avg overhead per key: {avg_overhead:.0f} bytes")
    print("\nTop 10 largest keys:")
    for key, mem, _ in results[:10]:
        print(f"  {mem:7d} bytes  {key[:60]}")

analyze_overhead(r)
```

## Setting maxmemory Based on Per-Key Cost

```python
def calculate_maxmemory(
    expected_keys, avg_key_bytes, avg_value_bytes, overhead_per_key=100
):
    data = expected_keys * (avg_key_bytes + avg_value_bytes + overhead_per_key)
    headroom = data * 1.3
    return int(headroom / 1024 / 1024)  # MB

mb = calculate_maxmemory(
    expected_keys=2_000_000,
    avg_key_bytes=12,
    avg_value_bytes=50
)
print(f"Recommended maxmemory: {mb}mb")
```

## Summary

Redis per-key overhead is ~88-112 bytes before any data is stored. For small values, overhead dominates total memory. Reduce it by aggregating related data into hashes (eliminating individual key overhead), shortening key names, and using integer values where possible. The hash-per-entity pattern typically reduces memory 3-5x for workloads with many small attributes per entity.
