# How to Estimate Redis Memory for Hashes Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Hash, DevOps

Description: Learn how to estimate Redis memory for hash workloads by understanding ziplist vs hashtable encoding thresholds and calculating per-field storage costs.

---

Redis hashes are one of the most memory-efficient data structures for storing objects with multiple fields. But memory consumption varies significantly depending on whether Redis uses ziplist or hashtable encoding.

## Two Encoding Modes for Hashes

Redis stores small hashes using a compact ziplist (or listpack in Redis 7+) encoding. Once a hash exceeds configured thresholds, it converts to a full hashtable.

Check current thresholds:

```bash
redis-cli CONFIG GET hash-max-listpack-entries
# hash-max-listpack-entries: 128

redis-cli CONFIG GET hash-max-listpack-value
# hash-max-listpack-value: 64
```

A hash stays in ziplist/listpack encoding if:
- Number of fields <= 128 (default)
- All field names and values are <= 64 bytes (default)

## Memory: Ziplist/Listpack Encoding

In compact encoding, fields are stored sequentially with minimal overhead:

```text
Overhead per hash object: ~70 bytes (redisObject + SDS key + ziplist header)
Per field overhead:        ~11 bytes (prevlen + encoding + len headers)
Field name + value:        actual bytes

Example: Hash with 5 fields averaging 10 bytes each:
  = 70 + (5 * (11 + 10 + 10))
  = 70 + 155
  = 225 bytes total
```

Verify with:

```bash
redis-cli HSET user:42 name "Alice" email "alice@example.com" plan "pro"
redis-cli MEMORY USAGE user:42
redis-cli OBJECT ENCODING user:42
# listpack
```

## Memory: Hashtable Encoding

Once a hash exceeds the listpack thresholds, Redis converts it to a full hashtable, which uses significantly more memory:

```text
Base hash object overhead: ~120 bytes
Per field cost:            ~64 bytes (dictEntry + allocator) + ~20 (key SDS) + ~20 (val SDS)
                           + field_name_size + field_value_size
                           = ~104 bytes + field data
```

## Side-by-Side Comparison

```bash
# Small hash (listpack) - 3 fields of 8 bytes each
redis-cli HSET small:hash f1 v1111111 f2 v2222222 f3 v3333333
redis-cli MEMORY USAGE small:hash
# ~150 bytes

# Large hash (hashtable) - 200 fields
for i in $(seq 1 200); do redis-cli HSET large:hash "field${i}" "value${i}"; done
redis-cli OBJECT ENCODING large:hash
# hashtable
redis-cli MEMORY USAGE large:hash
# ~25,000 bytes (compared to ~3,000 bytes if listpack)
```

## Memory Estimation by Encoding

```python
def estimate_hash_memory(
    num_hashes: int,
    num_fields: int,
    avg_field_name_bytes: int,
    avg_field_value_bytes: int,
    listpack_threshold: int = 128
) -> dict:
    if num_fields <= listpack_threshold:
        # Listpack encoding
        per_hash = 70 + num_fields * (11 + avg_field_name_bytes + avg_field_value_bytes)
        encoding = "listpack"
    else:
        # Hashtable encoding
        per_hash = 120 + num_fields * (104 + avg_field_name_bytes + avg_field_value_bytes)
        encoding = "hashtable"

    total_mb = (per_hash * num_hashes) / 1024 / 1024
    return {
        "encoding": encoding,
        "bytes_per_hash": per_hash,
        "total_mb": round(total_mb, 1),
        "num_hashes": num_hashes
    }

# 1M user hashes, 10 fields each
print(estimate_hash_memory(1_000_000, 10, 8, 20))
# {'encoding': 'listpack', 'bytes_per_hash': 460, 'total_mb': 438.7, 'num_hashes': 1000000}
```

## Tips for Keeping Hashes in Listpack

```bash
# Increase listpack threshold to keep more hashes compact
redis-cli CONFIG SET hash-max-listpack-entries 256
redis-cli CONFIG SET hash-max-listpack-value 128
```

Keeping hashes in listpack encoding can reduce memory by 5-10x compared to hashtable encoding for the same data.

## Summary

Redis hash memory depends critically on encoding: listpack encoding is compact and efficient for small hashes, while hashtable encoding uses roughly 5-10x more memory per field. Size your hashes to stay under the listpack thresholds (default 128 fields, 64 bytes per field) whenever possible. Use `MEMORY USAGE` on sample keys to validate your estimates before provisioning.
