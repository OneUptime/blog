# How to Use ZRANGESTORE in Redis to Store Sorted Set Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZRANGESTORE, Range Queries, Caching

Description: Learn how to use ZRANGESTORE in Redis to extract a range from a sorted set and store the result in a new key for caching and further operations.

---

## What Is ZRANGESTORE

`ZRANGESTORE` combines the retrieval power of `ZRANGE` with automatic storage of the result into a destination key. It supports index-based, score-based, and lexicographic ranges with optional reversal and pagination.

It is useful for caching computed subsets, creating snapshots of range results, and chaining sorted set operations.

## Syntax

```text
ZRANGESTORE dst src min max [BYSCORE|BYLEX] [REV] [LIMIT offset count]
```

- `dst` - the destination key where results are stored
- `src` - the source sorted set
- `min`, `max` - range bounds
- `BYSCORE` - interpret bounds as scores
- `BYLEX` - interpret bounds as lexicographic values
- `REV` - reverse iteration direction
- `LIMIT offset count` - pagination (only with `BYSCORE` or `BYLEX`)

Returns the number of elements stored in the destination.

## Basic Usage

### Store Index Range

```bash
redis-cli ZADD source 10 "alice" 20 "bob" 30 "charlie" 40 "dave" 50 "eve"

# Store elements at indices 1-3 in 'snapshot'
redis-cli ZRANGESTORE snapshot source 1 3
```

```text
(integer) 3
```

```bash
redis-cli ZRANGE snapshot 0 -1 WITHSCORES
```

```text
1) "bob"
2) "20"
3) "charlie"
4) "30"
5) "dave"
6) "40"
```

### Store Score Range

```bash
redis-cli ZRANGESTORE score_range source 20 40 BYSCORE
```

```text
(integer) 3
```

### Store Reversed Range

```bash
redis-cli ZRANGESTORE top3 source 0 2 REV
```

```text
(integer) 3
```

```bash
redis-cli ZRANGE top3 0 -1 WITHSCORES
```

```text
1) "charlie"
2) "30"
3) "dave"
4) "40"
5) "eve"
6) "50"
```

### Store Top N by Score

```bash
# Store top 3 highest scores
redis-cli ZRANGESTORE top3_by_score source +inf -inf BYSCORE REV LIMIT 0 3
```

```text
(integer) 3
```

## Practical Examples

### Cache Top Leaderboard Entries

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('leaderboard:global', {
    'player:alice': 9800, 'player:bob': 8500, 'player:charlie': 9500,
    'player:dave': 7200, 'player:eve': 9100, 'player:frank': 8800
})

def cache_top_players(n=3, ttl=60):
    """Cache top N players for fast access."""
    cache_key = f'leaderboard:top{n}'
    count = r.zrangestore(cache_key, 'leaderboard:global', 0, n-1, desc=True)
    r.expire(cache_key, ttl)
    return count

count = cache_top_players(3)
print(f"Cached {count} players")

top3 = r.zrange('leaderboard:top3', 0, -1, withscores=True, desc=True)
print(f"Top 3: {top3}")
```

### Paginated Result Caching

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('products', {f'prod:{i}': i * 5.0 for i in range(1, 51)})

def get_page(page, page_size=10):
    cache_key = f'products:page:{page}'

    # Return from cache if available
    if r.exists(cache_key):
        return r.zrange(cache_key, 0, -1, withscores=True)

    # Compute and cache
    offset = page * page_size
    r.zrangestore(cache_key, 'products', 0, '+inf',
                   byscore=True, offset=offset, num=page_size)
    r.expire(cache_key, 300)  # Cache for 5 minutes
    return r.zrange(cache_key, 0, -1, withscores=True)

page0 = get_page(0)
print(f"Page 0 items: {len(page0)}")  # 10
```

### User-Specific Score Snapshots

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('events', {
    'event:1': 1000, 'event:2': 2000, 'event:3': 3000,
    'event:4': 4000, 'event:5': 5000
})

def snapshot_recent_events(user_id, cutoff_score, max_count=100):
    """Take a user-specific snapshot of recent events."""
    snapshot_key = f'snapshot:user:{user_id}:events'
    count = r.zrangestore(snapshot_key, 'events', cutoff_score, '+inf', byscore=True)
    r.expire(snapshot_key, 3600)
    return count

count = snapshot_recent_events('user:42', cutoff_score=2500)
print(f"Snapshotted {count} events")

events = r.zrange('snapshot:user:42:events', 0, -1, withscores=True)
print(f"Events: {events}")
```

### Creating Sub-Sorted-Sets for Further Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Global product catalog with scores as popularity
r.zadd('catalog:all', {'prod:a': 95, 'prod:b': 72, 'prod:c': 88,
                        'prod:d': 45, 'prod:e': 60, 'prod:f': 81})

# Store only highly popular products (score > 70) for feature promotion
r.zrangestore('catalog:popular', 'catalog:all', 70, '+inf', byscore=True)

# Further intersection with in-stock items
r.zadd('inventory:in_stock', {'prod:a': 1, 'prod:c': 1, 'prod:f': 1})
r.zinterstore('catalog:popular_in_stock', ['catalog:popular', 'inventory:in_stock'], aggregate='MIN')

result = r.zrange('catalog:popular_in_stock', 0, -1, withscores=True)
print(f"Popular in-stock products: {result}")
```

## Summary

`ZRANGESTORE` extends the `ZRANGE` API with automatic persistence of the range result into a destination key, enabling range caching, snapshot creation, and chained sorted set operations. The destination key contains the selected members with their original scores, allowing further queries like `ZINTERSTORE` or `ZRANGEBYSCORE` on the cached subset. Use it to avoid repeated expensive range scans on large sorted sets.
