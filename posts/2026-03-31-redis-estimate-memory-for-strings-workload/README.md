# How to Estimate Redis Memory for Strings Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Performance, DevOps

Description: Learn how to accurately estimate Redis memory consumption for string key-value workloads by understanding object overhead, encoding thresholds, and key size impact.

---

Redis strings are the most common data type. Accurately estimating their memory consumption prevents under-provisioning and helps you right-size your instance before deploying to production.

## How Redis Stores String Values

Redis does not store just the raw bytes. Every key-value pair has overhead:

```text
Per key entry overhead breakdown:
  - dictEntry (hash table entry):  ~64 bytes
  - redisObject (value object):    ~16 bytes
  - SDS key string:                key_length + 9 bytes (header + null)
  - SDS value string:              value_length + 9 bytes (header + null)
  - Pointer alignment/fragmentation: ~10-20 bytes

Minimum per string key: ~110-120 bytes (even for 1-byte values)
```

## Memory Per String: The Formula

```text
memory_per_key = 64 (dictEntry)
               + 16 (redisObject for key)
               + 16 (redisObject for value)
               + key_size + 9
               + value_size + 9
               + ~20 (alignment/misc)
               = ~134 + key_size + value_size bytes
```

## Practical Examples

### Session Tokens

```text
Key:   "session:a9f3bc7e-1234-5678-abcd-ef0123456789" (44 bytes)
Value: JSON session data, ~200 bytes

Estimated per key: 134 + 44 + 200 = 378 bytes
1 million sessions: 378 MB
```

### Short String Cache

```text
Key:   "user:12345" (10 bytes)
Value: "alice" (5 bytes)

Estimated per key: 134 + 10 + 5 = 149 bytes
10 million entries: 1.49 GB
```

## Verifying with MEMORY USAGE

Always validate your estimates against actual Redis data:

```bash
# Check memory for a specific key
redis-cli MEMORY USAGE "session:a9f3bc7e-1234-5678-abcd-ef0123456789"

# Sample 100 keys and average
redis-cli --scan --pattern "session:*" | head -100 | \
  xargs -I{} redis-cli MEMORY USAGE {} | \
  awk '{sum+=$1; count++} END {print "avg:", sum/count, "bytes"}'
```

## Encoding Thresholds That Affect Memory

Redis uses integer encoding for values that are valid integers (saves ~9 bytes per value):

```bash
redis-cli SET counter 42
redis-cli OBJECT ENCODING counter
# int
```

Strings up to 44 bytes use the more compact embstr encoding (single allocation). Strings over 44 bytes use raw encoding (separate allocation):

```bash
redis-cli SET short_str "hello"
redis-cli OBJECT ENCODING short_str
# embstr

redis-cli SET long_str "$(python3 -c 'print("a"*45)')"
redis-cli OBJECT ENCODING long_str
# raw
```

## Memory Estimation Script

```python
import redis
import json

r = redis.Redis()

def estimate_string_workload(
    num_keys: int,
    avg_key_size_bytes: int,
    avg_value_size_bytes: int,
    fragmentation_ratio: float = 1.1
) -> dict:
    per_key_bytes = 134 + avg_key_size_bytes + avg_value_size_bytes
    total_bytes = per_key_bytes * num_keys * fragmentation_ratio

    return {
        "num_keys": num_keys,
        "bytes_per_key": per_key_bytes,
        "total_mb": round(total_bytes / 1024 / 1024, 1),
        "total_gb": round(total_bytes / 1024 / 1024 / 1024, 3),
    }

# Example: 5 million session keys
result = estimate_string_workload(
    num_keys=5_000_000,
    avg_key_size_bytes=40,
    avg_value_size_bytes=250
)
print(json.dumps(result, indent=2))
# {"num_keys": 5000000, "bytes_per_key": 424, "total_mb": 2224.0, "total_gb": 2.172}
```

## Summary

Redis string memory consumption is dominated by per-key overhead of roughly 134 bytes plus key and value sizes. Short keys and values are most memory-efficient per byte of payload, but no key costs less than about 110-120 bytes regardless of content. Always verify estimates using `MEMORY USAGE` on real data and add 10-20% for fragmentation when sizing your instance.
