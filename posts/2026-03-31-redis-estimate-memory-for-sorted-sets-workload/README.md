# How to Estimate Redis Memory for Sorted Sets Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Sorted Set, DevOps

Description: Learn how to estimate Redis memory for sorted set workloads by understanding listpack vs skiplist encoding and the cost of maintaining both a hash and skiplist internally.

---

Sorted sets (ZSETs) are Redis's most memory-intensive data structure because each element is stored twice internally: once in a hash table (for O(1) score lookup by member) and once in a skip list (for O(log N) range queries).

## Two Encodings for Sorted Sets

### Listpack Encoding (Compact)

Small sorted sets use listpack encoding when:
- Number of members <= 128 (default `zset-max-listpack-entries`)
- All member strings are <= 64 bytes (default `zset-max-listpack-value`)

```bash
redis-cli CONFIG GET zset-max-listpack-entries
# zset-max-listpack-entries: 128

redis-cli CONFIG GET zset-max-listpack-value
# zset-max-listpack-value: 64
```

Listpack memory per element:

```text
Base overhead:    ~70 bytes per sorted set key
Per element:      ~29 bytes overhead + member_size bytes (listpack entry with score)
```

### Skiplist + Hashtable Encoding

Once above thresholds, Redis uses a skiplist + hashtable combo:

```text
Base overhead:        ~160 bytes per sorted set
Per element cost:
  - skiplist node:    ~56 bytes + pointer overhead
  - hashtable entry: ~64 bytes
  - robj for member: ~16 bytes + member_size bytes
  Total per element:  ~136 bytes + member_size
```

## Memory Estimation Formula

```python
def estimate_zset_memory(
    num_zsets: int,
    members_per_zset: int,
    avg_member_size_bytes: int,
    listpack_entries_threshold: int = 128,
    listpack_value_threshold: int = 64
) -> dict:
    exceeds_listpack = (
        members_per_zset > listpack_entries_threshold
        or avg_member_size_bytes > listpack_value_threshold
    )

    if not exceeds_listpack:
        per_zset = 70 + members_per_zset * (29 + avg_member_size_bytes)
        encoding = "listpack"
    else:
        per_zset = 160 + members_per_zset * (136 + avg_member_size_bytes)
        encoding = "skiplist+hashtable"

    total_mb = (per_zset * num_zsets) / 1024 / 1024
    return {
        "encoding": encoding,
        "bytes_per_zset": per_zset,
        "total_mb": round(total_mb, 1),
        "total_gb": round(total_mb / 1024, 3),
    }

# 50,000 user leaderboards, 100 members each (10 bytes avg username)
print(estimate_zset_memory(50_000, 100, 10))
# {'encoding': 'listpack', 'bytes_per_zset': 3970, 'total_mb': 189.3}

# 50,000 leaderboards, 500 members each (10 bytes avg)
print(estimate_zset_memory(50_000, 500, 10))
# {'encoding': 'skiplist+hashtable', 'bytes_per_zset': 73160, 'total_mb': 3488.5}
```

## Real-World Measurement

```bash
# Create a sorted set and measure memory
for i in $(seq 1 200); do
  redis-cli ZADD leaderboard $((RANDOM)) "player:${i}"
done

redis-cli OBJECT ENCODING leaderboard
# skiplist (exceeds 128 default)

redis-cli MEMORY USAGE leaderboard
# Check actual bytes

# Compare with listpack version (50 members)
for i in $(seq 1 50); do
  redis-cli ZADD small_leaderboard $((RANDOM)) "player:${i}"
done
redis-cli OBJECT ENCODING small_leaderboard
# listpack
redis-cli MEMORY USAGE small_leaderboard
```

## Optimizing Sorted Set Memory

For large leaderboards that exceed listpack thresholds, consider sharding:

```python
def get_leaderboard_shard(key: str, member: str, shards: int = 10) -> str:
    """Route a member to a shard to keep each shard within listpack limits."""
    shard_id = hash(member) % shards
    return f"{key}:shard:{shard_id}"

def zadd_sharded(r, key: str, member: str, score: float, shards: int = 10):
    shard_key = get_leaderboard_shard(key, member, shards)
    r.zadd(shard_key, {member: score})
```

Each shard stays within 128 members, keeping listpack encoding and reducing memory by ~4x.

## Summary

Sorted set memory is heavily influenced by encoding: listpack encoding costs roughly 29 bytes per element overhead, while skiplist+hashtable encoding costs ~136 bytes per element. For workloads where members exceed 128 or member strings exceed 64 bytes, consider sharding sorted sets or increasing thresholds carefully. Always measure with `MEMORY USAGE` on representative data before provisioning.
