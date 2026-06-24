# How to Configure hash-max-listpack-entries for Memory Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, Memory, Listpack

Description: Configure hash-max-listpack-entries and hash-max-listpack-value to keep Redis hashes in memory-efficient listpack encoding and reduce memory by up to 5x.

---

Redis hashes use one of two internal encodings: `listpack` (compact, memory-efficient) or `hashtable` (fast, but uses more memory). The `hash-max-listpack-entries` setting controls when Redis switches between them.

## The Two Hash Encodings

```bash
# Small hash: listpack
HSET user:1 name Alice age 30
OBJECT ENCODING user:1  # "listpack"

# Add more fields to cross the threshold
HSET user:1 f1 v1 f2 v2 ... f600 v600
OBJECT ENCODING user:1  # "hashtable"
```

Memory comparison:

```text
Encoding     Fields   Memory
listpack       10     ~280 bytes
hashtable      10     ~700 bytes
Ratio: listpack uses ~2.5x less memory
```

## Default Thresholds

```bash
redis-cli CONFIG GET hash-max-listpack-entries
# 512 (max fields before switching to hashtable)

redis-cli CONFIG GET hash-max-listpack-value
# 64 (max field or value size in bytes)
```

If either threshold is exceeded, Redis converts the hash to hashtable encoding permanently (until the hash shrinks below the threshold on a restart - conversions are one-way at runtime).

## Adjusting the Thresholds

```bash
# Allow larger hashes to stay as listpack
redis-cli CONFIG SET hash-max-listpack-entries 1024
redis-cli CONFIG SET hash-max-listpack-value 128
```

In `redis.conf`:

```text
hash-max-listpack-entries 1024
hash-max-listpack-value 128
```

## Measuring the Impact

Before and after comparison:

```python
import redis

r = redis.Redis()

def create_test_hash(key, num_fields):
    r.delete(key)
    fields = {f"field_{i}": f"value_{i}" for i in range(num_fields)}
    r.hset(key, mapping=fields)
    mem = r.memory_usage(key)
    enc = r.object_encoding(key)
    return mem, enc

# Default threshold = 512 fields
for n in [100, 300, 512, 513, 700]:
    mem, enc = create_test_hash("test_hash", n)
    per_field = mem / n
    print(f"Fields: {n:4d}  Encoding: {enc:12s}  Memory: {mem:6d}  Per field: {per_field:.0f}")
```

Output (approximate):

```text
Fields:  100  Encoding: listpack     Memory:   2850  Per field: 29
Fields:  300  Encoding: listpack     Memory:   8650  Per field: 29
Fields:  512  Encoding: listpack     Memory:  14850  Per field: 29
Fields:  513  Encoding: hashtable    Memory:  37450  Per field: 73
Fields:  700  Encoding: hashtable    Memory:  51100  Per field: 73
```

The jump at 513 fields is dramatic - 2.5x more memory per field.

## Practical Recommendations

For user profiles, configuration objects, and small documents:

```text
If most hashes have < 1000 fields and values < 256 bytes:
  hash-max-listpack-entries 1024
  hash-max-listpack-value   256

If performance is critical and hashes are frequently updated:
  hash-max-listpack-entries 256  (lower than default, less CPU for writes)
  hash-max-listpack-value   64
```

## Performance Trade-off

Listpack is a compact array - lookup is O(n). Hashtable is O(1). For hashes with many fields, listpack gets slower:

```text
Fields   HGET latency (listpack)   HGET latency (hashtable)
10       0.05 ms                   0.06 ms
100      0.12 ms                   0.07 ms
500      0.45 ms                   0.07 ms
```

Only raise the threshold if your hashes stay small (under ~300 fields) and you do not access individual fields in hot paths with many fields.

## Verifying Active Hashes Use Listpack

```bash
# Scan for hashes using hashtable encoding
redis-cli --scan --pattern "user:*" | while read key; do
  enc=$(redis-cli OBJECT ENCODING "$key")
  if [ "$enc" = "hashtable" ]; then
    fields=$(redis-cli HLEN "$key")
    echo "hashtable: $key ($fields fields)"
  fi
done
```

## Summary

Setting `hash-max-listpack-entries` to a value that covers your typical hash size keeps hashes in listpack encoding, reducing memory by ~2.5x compared to hashtable. The default of 512 works well for most use cases - if your hashes stay under 700-1000 fields, raising the threshold to 1024 provides additional memory savings with minimal performance impact for typical access patterns.
