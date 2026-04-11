# How to Debug Redis with OBJECT Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Object, Memory, Troubleshooting

Description: Use Redis OBJECT commands to inspect key encoding, idle time, frequency, and reference counts to identify memory inefficiencies and optimize storage.

---

The Redis `OBJECT` family of commands exposes internal metadata about how Redis stores individual keys. This information is invaluable for diagnosing memory inefficiencies, verifying encoding optimizations, and understanding access patterns at the key level.

## OBJECT ENCODING

Shows how Redis internally encodes a value. Encoding affects both memory use and performance:

```bash
redis-cli OBJECT ENCODING mykey
```

Common encodings and when they apply:

| Type | Encoding | When Used |
|---|---|---|
| String | `int` | Value is an integer |
| String | `embstr` | String <= 44 bytes |
| String | `raw` | String > 44 bytes |
| List | `listpack` | Small lists within `list-max-listpack-size` limit (default ~8 KB) |
| List | `quicklist` | Larger lists |
| Hash | `listpack` | <= 128 entries, each <= 64 bytes |
| Hash | `hashtable` | Larger hashes |
| Set | `intset` | All members are integers, <= 512 entries |
| Set | `listpack` | <= 128 entries, each <= 64 bytes |
| Set | `hashtable` | Larger sets |
| ZSet | `listpack` | <= 128 entries, each <= 64 bytes |
| ZSet | `skiplist` | Larger sorted sets |

```bash
# Check encoding for different key types
redis-cli SET small_int 42
redis-cli OBJECT ENCODING small_int      # int

redis-cli SET small_str "hello"
redis-cli OBJECT ENCODING small_str      # embstr

redis-cli HSET small_hash f1 v1 f2 v2
redis-cli OBJECT ENCODING small_hash     # listpack
```

## Verifying Encoding Optimization

Ensure your hashes stay in `listpack` encoding for memory efficiency:

```python
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Check current encoding
encoding = client.object_encoding("myhash")
print(f"Encoding: {encoding}")

# If it's hashtable, check the threshold config
max_entries = client.config_get("hash-max-listpack-entries")
max_value = client.config_get("hash-max-listpack-value")
print(f"Max entries: {max_entries}, Max value size: {max_value}")

# Check how many fields are in the hash
count = client.hlen("myhash")
print(f"Field count: {count}")
```

## OBJECT IDLETIME

Returns the number of seconds since a key was last accessed. Useful for finding stale keys:

```bash
redis-cli OBJECT IDLETIME user:42:session
# 14832  (idle for ~4 hours)
```

Find all keys idle for more than 1 hour:

```bash
redis-cli --scan --pattern "user:*" | while read key; do
  idle=$(redis-cli OBJECT IDLETIME "$key")
  if [ "$idle" -gt 3600 ]; then
    echo "$key idle for $idle seconds"
  fi
done
```

Note: `OBJECT IDLETIME` is not available when LFU eviction policy is active.

## OBJECT FREQ

When using `allkeys-lfu` or `volatile-lfu` eviction policy, FREQ returns the access frequency counter:

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu

redis-cli SET hot_key "frequently accessed"
# Access it many times
for i in $(seq 1 100); do redis-cli GET hot_key > /dev/null; done

redis-cli OBJECT FREQ hot_key
# 7  (logarithmic counter, higher = more frequent)
```

## OBJECT REFCOUNT

Returns the reference count for a key. Useful for debugging but typically always 1 for regular keys:

```bash
redis-cli OBJECT REFCOUNT mykey
# 1
```

## OBJECT HELP

List all available OBJECT subcommands:

```bash
redis-cli OBJECT HELP
```

## Bulk Encoding Analysis Script

Analyze encoding distribution across your keyspace:

```python
import redis
from collections import Counter

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

encoding_counts = Counter()
scanned = 0

cursor = 0
while True:
    cursor, keys = client.scan(cursor, count=1000)
    for key in keys:
        try:
            enc = client.object_encoding(key)
            encoding_counts[enc] += 1
        except Exception:
            pass
    scanned += len(keys)
    if cursor == 0:
        break

print(f"Scanned {scanned} keys")
for enc, count in encoding_counts.most_common():
    pct = count / scanned * 100
    print(f"  {enc}: {count} ({pct:.1f}%)")
```

## Summary

Redis OBJECT commands reveal how keys are stored internally, enabling targeted memory optimization. Check ENCODING to verify hash and list compression is active, use IDLETIME to find stale keys that can be purged, and use FREQ with LFU eviction to understand hot/cold access patterns. Running bulk encoding analysis helps identify data structures that have silently crossed encoding thresholds.
