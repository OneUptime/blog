# Why You Should Not Use SORT on Large Datasets in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sort, Anti-Pattern

Description: Learn why the Redis SORT command is O(N+M log M) and blocks your server on large datasets, and how to use sorted sets for pre-sorted, instant-access data.

---

The Redis SORT command sorts a list, set, or sorted set at query time. For small datasets it is fine. For large datasets - thousands of elements or more - it is an O(N+M log M) operation that blocks the entire Redis server while sorting, causing latency spikes across your application.

## Why SORT Is Dangerous at Scale

```bash
# SORT on a 100K element list
RPUSH big:list 99999 3 5 1 2 ... (100000 items)
SORT big:list  # O(N log N) - blocks Redis for the duration

# Result: all other commands wait while Redis sorts 100K elements
```

The problem compounds with the `BY` and `GET` options, which add external key lookups for each element:

```bash
# Each element triggers additional GET calls - extremely slow for large sets
SORT products BY product:*:price GET product:*:name LIMIT 0 20
```

## The Right Approach: Pre-Sort with Sorted Sets

Sorted sets maintain order at write time. ZRANGE reads are O(log N + M) and do not block:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Insert with score (sort key)
def add_product(product_id: str, price: float, name: str):
    # Sorted set: score = sort key (price)
    r.zadd("products:by_price", {product_id: price})
    # Store product details separately
    r.hset(f"product:{product_id}", mapping={"name": name, "price": price})

# Read sorted - O(log N + M), non-blocking
def get_cheapest_products(n: int = 20) -> list:
    product_ids = r.zrange("products:by_price", 0, n - 1)
    pipe = r.pipeline(transaction=False)
    for pid in product_ids:
        pipe.hgetall(f"product:{pid}")
    details = pipe.execute()
    return [{"id": pid, **d} for pid, d in zip(product_ids, details)]

def get_most_expensive_products(n: int = 20) -> list:
    product_ids = r.zrange("products:by_price", 0, n - 1, desc=True)
    pipe = r.pipeline(transaction=False)
    for pid in product_ids:
        pipe.hgetall(f"product:{pid}")
    details = pipe.execute()
    return [{"id": pid, **d} for pid, d in zip(product_ids, details)]
```

## Price Range Queries

```python
def get_products_in_price_range(min_price: float, max_price: float) -> list:
    product_ids = r.zrange("products:by_price", min_price, max_price, byscore=True)
    pipe = r.pipeline(transaction=False)
    for pid in product_ids:
        pipe.hgetall(f"product:{pid}")
    return [d for d in pipe.execute() if d]
```

## Leaderboard with Sorted Set

For game scores, sorted sets replace SORT entirely:

```python
def record_score(player_id: str, score: int):
    r.zadd("leaderboard", {player_id: score})

def get_top_players(n: int = 10) -> list:
    return r.zrange("leaderboard", 0, n - 1, desc=True, withscores=True)

def get_player_rank(player_id: str) -> int | None:
    rank = r.zrevrank("leaderboard", player_id)
    return rank + 1 if rank is not None else None
```

## When SORT Is Acceptable

```text
Acceptable:
- Datasets under 1,000 elements
- One-time admin scripts on a dedicated replica
- Sorting a small result set (use LIMIT)

Avoid:
- Production queries on datasets > 1,000 elements
- Application code called in hot paths
- Sets with BY/GET lookups on large datasets
```

## Migrating from SORT to Sorted Sets

```python
def migrate_list_to_sorted_set(source_list: str, dest_zset: str,
                                 score_fetcher):
    """
    Migrate a plain list to a sorted set with scores from a fetcher function.
    """
    items = r.lrange(source_list, 0, -1)
    if not items:
        return

    pipe = r.pipeline(transaction=False)
    for item in items:
        score = score_fetcher(item)
        pipe.zadd(dest_zset, {item: score})
    pipe.execute()
```

## Summary

Redis SORT is an O(N log N) blocking operation that halts all other commands while it completes. For any dataset over a thousand elements in a hot code path, replace SORT with sorted sets - which maintain order at write time and deliver sorted reads in O(log N + M) with no blocking. This is one of the highest-impact architectural changes you can make in a Redis-heavy application.
