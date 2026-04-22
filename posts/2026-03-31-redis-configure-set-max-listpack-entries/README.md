# How to Configure set-max-listpack-entries for Memory Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, Memory, Listpack

Description: Configure set-max-listpack-entries and set-max-intset-entries to keep Redis sets in compact listpack or intset encoding and reduce memory usage.

---

Redis sets use three possible encodings: `intset` (packed integers), `listpack` (compact mixed elements), or `hashtable` (full hash table). Tuning the encoding thresholds keeps sets memory-efficient.

## The Three Set Encodings

```bash
# Integer-only set with few members: intset
SADD ports 80 443 8080
OBJECT ENCODING ports  # "intset"

# Small mixed set: listpack (Redis 7.2+)
SADD tags "redis" "cache" "backend"
OBJECT ENCODING tags   # "listpack"

# Large set: hashtable (exceeds set-max-intset-entries default of 512)
SADD large_set $(seq 1 600)
OBJECT ENCODING large_set  # "hashtable"
```

Memory per element:

```text
Encoding    Bytes/element (approx)
intset      4-8 bytes
listpack    20-30 bytes
hashtable   60-80 bytes
```

## Configuration Settings

```bash
# Max members for listpack encoding (non-integer sets)
redis-cli CONFIG GET set-max-listpack-entries  # default: 128
redis-cli CONFIG GET set-max-listpack-value    # default: 64 (max element size)

# Max members for intset encoding (integer-only sets)
redis-cli CONFIG GET set-max-intset-entries    # default: 512
```

In `redis.conf`:

```text
set-max-listpack-entries 128
set-max-listpack-value 64
set-max-intset-entries 512
```

## When Redis Switches Encoding

```python
import redis

r = redis.Redis()

# Integer set stays as intset up to set-max-intset-entries
for n in [100, 512, 513]:
    r.delete("test_set")
    r.sadd("test_set", *range(n))
    enc = r.object_encoding("test_set")
    mem = r.memory_usage("test_set")
    print(f"Members: {n:5d}  Encoding: {enc:12s}  Memory: {mem:7d} bytes")

# Mixed set uses listpack up to set-max-listpack-entries
for n in [50, 128, 129]:
    r.delete("test_set")
    r.sadd("test_set", *[f"tag:{i}" for i in range(n)])
    enc = r.object_encoding("test_set")
    mem = r.memory_usage("test_set")
    print(f"Members: {n:5d}  Encoding: {enc:12s}  Memory: {mem:7d} bytes")
```

## Memory Savings Example

Tags stored per article (average 8 tags per article, 500,000 articles):

```text
Without optimization (hashtable, all sets):
  8 members x 70 bytes = 560 bytes per article
  500,000 articles x 560 bytes = 280 MB

With listpack (set-max-listpack-entries 128):
  8 members x 25 bytes = 200 bytes per article
  500,000 articles x 200 bytes = 100 MB

Savings: 180 MB (64%)
```

## Raising set-max-intset-entries

If your sets contain only integers (user IDs, product IDs, port numbers), intset is extremely efficient. Raise the limit:

```bash
redis-cli CONFIG SET set-max-intset-entries 4096
```

```python
# Before: 1024 integer members -> hashtable
# After: 1024 integer members -> intset

r.config_set("set-max-intset-entries", 4096)
r.delete("user_ids")
r.sadd("user_ids", *range(1024))
print(r.object_encoding("user_ids"))  # "intset"
print(r.memory_usage("user_ids"))     # ~4 KB vs ~65 KB hashtable
```

## Adding One Non-Integer Converts intset to listpack

```bash
SADD user_ids 100 200 300
OBJECT ENCODING user_ids  # intset

SADD user_ids "admin"
OBJECT ENCODING user_ids  # listpack (immediate conversion, Redis 7.2+)
```

intset only works when every member is an integer. Adding one string forces conversion - to `listpack` if the set is small enough (under `set-max-listpack-entries`), or to `hashtable` otherwise.

## Scanning for Over-Threshold Sets

```bash
redis-cli --scan --pattern "tags:*" | while read key; do
  enc=$(redis-cli OBJECT ENCODING "$key")
  len=$(redis-cli SCARD "$key")
  if [ "$enc" = "hashtable" ]; then
    echo "hashtable: $key ($len members)"
  fi
done
```

## Summary

Keep Redis sets in `intset` or `listpack` encoding to use 2-4x less memory than `hashtable`. Raise `set-max-intset-entries` to 512-4096 for integer-only sets, and `set-max-listpack-entries` to 128-512 for small string sets. Audit encoding with `OBJECT ENCODING` and verify that typical production sets stay under your configured thresholds.
