# How to Configure zset-max-listpack-entries for Memory Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, Memory, Listpack

Description: Configure zset-max-listpack-entries and zset-max-listpack-value to keep Redis sorted sets in compact listpack encoding and reduce memory by up to 4x.

---

Redis sorted sets (ZSETs) use `listpack` encoding when small and `skiplist` encoding when large. The `zset-max-listpack-entries` setting controls the transition point. Listpack uses dramatically less memory than skiplist.

## The Two ZSET Encodings

```bash
# Small sorted set: listpack
ZADD leaderboard 100 "alice" 85 "bob"
OBJECT ENCODING leaderboard  # "listpack"

# After exceeding threshold: skiplist
# (add many members to trigger)
OBJECT ENCODING leaderboard  # "ziplist" on older Redis, "skiplist" on large
```

Memory comparison per element:

```text
Encoding    Bytes per (score, member) pair
listpack    ~28-36 bytes
skiplist    ~100-128 bytes (skiplist node + dict entry)
```

## Default Configuration

```bash
redis-cli CONFIG GET zset-max-listpack-entries  # 128
redis-cli CONFIG GET zset-max-listpack-value    # 64 (max member length)
```

Encoding switches to skiplist when:
- Member count > `zset-max-listpack-entries`, OR
- Any member's byte length > `zset-max-listpack-value`

## Measuring the Impact

```python
import redis

r = redis.Redis(decode_responses=True)

def test_zset_memory(n, member_template="user:{i}"):
    r.delete("test_zset")
    members = {member_template.format(i=i): float(i) for i in range(n)}
    r.zadd("test_zset", members)
    mem = r.memory_usage("test_zset")
    enc = r.object("encoding", "test_zset")
    per_member = mem / n
    print(f"Members: {n:5d}  Encoding: {enc:12s}  "
          f"Total: {mem:8d} bytes  Per member: {per_member:.0f}")

r.config_set("zset-max-listpack-entries", 128)
for n in [50, 128, 129, 500, 1000]:
    test_zset_memory(n)
```

Output (approximate):

```text
Members:    50  Encoding: listpack      Total:    2100 bytes  Per member: 42
Members:   128  Encoding: listpack      Total:    5376 bytes  Per member: 42
Members:   129  Encoding: skiplist      Total:   15480 bytes  Per member: 120
Members:   500  Encoding: skiplist      Total:   60000 bytes  Per member: 120
Members:  1000  Encoding: skiplist      Total:  120000 bytes  Per member: 120
```

The jump from 128 to 129 members shows ~3x memory increase.

## Raising the Threshold

```bash
# Allow up to 512 members in listpack encoding
redis-cli CONFIG SET zset-max-listpack-entries 512
redis-cli CONFIG SET zset-max-listpack-value 128
```

In `redis.conf`:

```text
zset-max-listpack-entries 512
zset-max-listpack-value 128
```

## Performance Trade-off

Listpack is O(n) for range queries because it is a linear scan. Skiplist is O(log n):

```text
ZRANGE operation    Members   listpack    skiplist
                     100       0.04ms     0.05ms
                     500       0.18ms     0.08ms
                    1000       0.36ms     0.09ms
```

Listpack is faster for very small sorted sets (under ~150 members) due to cache locality. Beyond that, skiplist wins for range queries.

## Use Case: Leaderboards with Capped Size

```python
def add_to_leaderboard(r, key, user_id, score, max_size=500):
    pipe = r.pipeline(transaction=False)
    pipe.zadd(key, {user_id: score})
    pipe.zremrangebyrank(key, 0, -(max_size + 1))  # trim to max_size
    pipe.execute()

# Config optimized for 500-member leaderboards
r.config_set("zset-max-listpack-entries", 512)

add_to_leaderboard(r, "top500", "user:42", 9850)
print(r.object("encoding", "top500"))  # listpack until 513 members
```

## Checking Which ZSETs Have Converted to Skiplist

```bash
redis-cli --scan --pattern "leaderboard:*" | while read key; do
  enc=$(redis-cli OBJECT ENCODING "$key")
  if [ "$enc" = "skiplist" ]; then
    size=$(redis-cli ZCARD "$key")
    echo "skiplist: $key ($size members)"
  fi
done
```

## Summary

`zset-max-listpack-entries` is one of the most impactful Redis memory tuning knobs. Keeping sorted sets in listpack encoding uses 3x less memory than skiplist. Raise the threshold to cover your typical sorted set size (common values: 256-512). The trade-off is O(n) vs O(log n) range query performance - only relevant when sets regularly exceed ~300 members.
