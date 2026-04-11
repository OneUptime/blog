# How to Estimate Redis Memory for Sets Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Set, DevOps

Description: Learn how to estimate Redis memory for set workloads by understanding intset vs hashtable encoding and calculating per-member storage costs accurately.

---

Redis sets support fast membership testing, intersection, and union operations. Memory consumption varies dramatically based on whether elements are small integers or arbitrary strings, due to encoding differences.

## Three Encodings for Sets

### Intset Encoding (Very Efficient)

When all set members are integers AND the set has fewer than 512 members (default), Redis uses a compact `intset` - a sorted array of integers:

```bash
redis-cli SADD int_set 1 2 3 100 500 9999
redis-cli OBJECT ENCODING int_set
# intset
```

Memory cost for intset:

```text
Base overhead:  ~16 bytes
Per 64-bit int: ~8 bytes

500 integer members: 16 + (500 * 8) = ~4,016 bytes
```

### Hashtable Encoding (General)

When members are strings or count exceeds the listpack threshold, Redis uses a full hashtable:

```text
Base overhead:  ~120 bytes
Per member:     ~64 bytes (dictEntry) + ~16 bytes (robj) + member_size + ~10 bytes
                = ~90 bytes + member_size
```

```bash
redis-cli SADD str_set "member_one" "member_two" "member_three"
redis-cli OBJECT ENCODING str_set
# listpack (for small sets) or hashtable (for large sets)
```

## Memory Estimation by Encoding

```python
def estimate_set_memory(
    num_sets: int,
    members_per_set: int,
    avg_member_size_bytes: int,
    all_integers: bool = False,
    intset_threshold: int = 512,
    listpack_threshold: int = 128
) -> dict:
    if all_integers and members_per_set <= intset_threshold:
        # Intset encoding
        per_set = 16 + (members_per_set * 8)
        encoding = "intset"
    elif members_per_set <= listpack_threshold:
        # Listpack encoding (small string sets)
        per_set = 70 + members_per_set * (11 + avg_member_size_bytes)
        encoding = "listpack"
    else:
        # Hashtable encoding
        per_set = 120 + members_per_set * (90 + avg_member_size_bytes)
        encoding = "hashtable"

    total_mb = (per_set * num_sets) / 1024 / 1024
    return {
        "encoding": encoding,
        "bytes_per_set": per_set,
        "total_mb": round(total_mb, 1),
        "total_gb": round(total_mb / 1024, 3),
    }

# 100,000 user permission sets, 20 string permissions each (15 bytes avg)
print(estimate_set_memory(100_000, 20, 15))
# {'encoding': 'listpack', 'bytes_per_set': 590, 'total_mb': 56.3}

# 100,000 user ID sets, 500 integer members each
print(estimate_set_memory(100_000, 500, 0, all_integers=True))
# {'encoding': 'intset', 'bytes_per_set': 4016, 'total_mb': 383.0}

# 100,000 tag sets, 300 string tags each (10 bytes avg)
print(estimate_set_memory(100_000, 300, 10))
# {'encoding': 'hashtable', 'bytes_per_set': 30120, 'total_mb': 2872.5}
```

## Practical Measurement

```bash
# Create test sets and measure
redis-cli SADD test:intset $(seq 1 500 | tr '\n' ' ')
redis-cli MEMORY USAGE test:intset
redis-cli OBJECT ENCODING test:intset

redis-cli SADD test:strset $(for i in $(seq 1 50); do echo -n "user:${i} "; done)
redis-cli MEMORY USAGE test:strset
redis-cli OBJECT ENCODING test:strset
```

## Tips for Memory Efficiency

1. Use integer member IDs instead of string UUIDs when possible - intset is 10x more compact than hashtable
2. Keep sets under the listpack threshold (128 members) for compact encoding
3. For large sets of string members, consider storing them as a sorted set with score 0 if ordering is needed, or a hash if you need field values

```bash
# Increase intset threshold to keep integer sets compact longer
redis-cli CONFIG SET set-max-intset-entries 1024

# Increase listpack threshold for small string sets
redis-cli CONFIG SET set-max-listpack-entries 256
```

## Summary

Redis set memory varies by a factor of 10x depending on encoding. Integer-only sets in intset encoding use just 8 bytes per member, while hashtable encoding for string members costs ~90 bytes per member plus the string itself. Design your member types and set sizes to stay within compact encoding thresholds, and use `MEMORY USAGE` to validate estimates before production deployment.
