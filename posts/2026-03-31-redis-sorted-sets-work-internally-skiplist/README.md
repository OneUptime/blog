# How Redis Sorted Sets Work Internally (Skiplist and Listpack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, Skiplist, Listpack, Internal

Description: Learn how Redis sorted sets use listpack for small collections and a skiplist plus hashtable for large ones, enabling O(log n) range queries.

---

Redis sorted sets combine fast membership testing with ordered range queries. Small sorted sets use a compact `listpack`, while larger ones use a `skiplist` paired with a `hashtable` to support both O(log n) score-range queries and O(1) score lookups.

## The Two Sorted Set Encodings

```bash
ZADD leaderboard 100 alice 200 bob 150 charlie
OBJECT ENCODING leaderboard
# Returns: "listpack"

# Exceed the threshold to trigger skiplist
python3 -c "import redis; r=redis.Redis(); [r.zadd('big_lb', {f'user{i}': i}) for i in range(200)]"
OBJECT ENCODING big_lb
# Returns: "skiplist"
```

## Listpack Encoding

For small sorted sets, Redis stores entries in a flat `listpack` as consecutive pairs: `(member, score)`. The listpack is kept sorted by score, so range queries scan linearly - acceptable for small sets.

```bash
CONFIG GET zset-max-listpack-entries
# Default: 128 entries
CONFIG GET zset-max-listpack-value
# Default: 64 bytes per element
```

## Skiplist + Hashtable Encoding

When the sorted set exceeds listpack thresholds, Redis uses two structures simultaneously:

1. **Skiplist** - for O(log n) score-ordered range queries (`ZRANGE`, `ZRANGEBYSCORE`)
2. **Hashtable** - for O(1) member-to-score lookups (`ZSCORE`, `ZADD` updates)

```text
Skiplist structure (simplified):
Level 3:  [head] ---------> [alice:100] ---------> [tail]
Level 2:  [head] ---------> [alice:100] -> [bob:150] -> [tail]
Level 1:  [head] -> [zara:50] -> [alice:100] -> [bob:150] -> [charlie:200] -> [tail]
```

Each node has a random number of forward pointers. On average, a skiplist needs O(log n) hops to find any element, giving the same asymptotic complexity as a balanced BST with simpler implementation.

## Why Both Structures?

The dual structure allows efficient operations in both directions:

```bash
# Uses skiplist for score range - O(log N + M)
ZRANGEBYSCORE leaderboard 100 200

# Uses hashtable for direct score lookup - O(1)
ZSCORE leaderboard alice

# Uses both: update requires finding existing score (hashtable) + reposition (skiplist)
ZADD leaderboard 250 alice
```

## Encoding Thresholds

```bash
# Change listpack limits
CONFIG SET zset-max-listpack-entries 64  # element count threshold
CONFIG SET zset-max-listpack-value 32   # per-element byte threshold
```

Lowering these thresholds causes earlier conversion to skiplist, which uses more memory per set but improves CPU performance for range queries on mid-sized sets.

## Practical Performance Impact

```python
import redis, time

r = redis.Redis()

# Populate sorted set
for i in range(10000):
    r.zadd("scores", {f"user_{i}": i * 1.5})

# O(log N) range query on skiplist
start = time.time()
results = r.zrangebyscore("scores", 5000, 6000)
print(f"Range query: {(time.time()-start)*1000:.2f}ms, got {len(results)} results")
```

## Memory Layout Comparison

```bash
# Check serialized length of both encoding types
DEBUG OBJECT leaderboard          # shows encoding + serialized length
MEMORY USAGE leaderboard          # actual memory in bytes
```

## When to Use Sorted Sets

- **Leaderboards**: `ZADD` scores, `ZRANGE` top-N with `REV`
- **Time-ordered feeds**: score = Unix timestamp
- **Priority queues**: score = priority, `ZPOPMIN` for dequeue
- **Rate limiting**: score = timestamp, count members in window

```bash
# Sliding window rate limit
ZADD rate:user:123 1710000000 req1
ZREMRANGEBYSCORE rate:user:123 -inf 1709999970  # remove old
ZCARD rate:user:123  # current count in window
```

## Summary

Redis sorted sets use `listpack` for small collections and a combined `skiplist` + `hashtable` for larger ones. The skiplist enables O(log n) score-range queries while the hashtable enables O(1) score lookups. Tune `zset-max-listpack-entries` and `zset-max-listpack-value` to control when this transition occurs, balancing memory efficiency against performance needs.
