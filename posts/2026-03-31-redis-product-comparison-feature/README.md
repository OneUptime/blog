# How to Build a Product Comparison Feature with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Set, User Session

Description: Implement a product comparison feature with Redis Sets - let users add products to a comparison basket, enforce limits, and cache comparison views per session.

---

Product comparison lets shoppers evaluate multiple items side by side. Redis Sets store per-user comparison lists while Hashes cache the pre-computed comparison data for fast rendering.

## Data Model

```text
compare:{sessionId}          -> Set of product IDs being compared
compare:cache:{cacheKey}     -> String: cached comparison result (JSON)
```

## Adding and Removing Products from Comparison

```python
import redis
import hashlib
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_COMPARE = 4
COMPARE_TTL = 3600  # 1 hour session

def add_to_comparison(session_id, product_id):
    key = f"compare:{session_id}"
    current_count = r.scard(key)
    if current_count >= MAX_COMPARE:
        return {"error": f"Cannot compare more than {MAX_COMPARE} products"}

    pipe = r.pipeline()
    pipe.sadd(key, product_id)
    pipe.expire(key, COMPARE_TTL)
    added, _ = pipe.execute()
    return {"added": bool(added), "count": current_count + (1 if added else 0)}

def remove_from_comparison(session_id, product_id):
    r.srem(f"compare:{session_id}", product_id)

def clear_comparison(session_id):
    r.delete(f"compare:{session_id}")

def get_comparison_list(session_id):
    return list(r.smembers(f"compare:{session_id}"))

def is_in_comparison(session_id, product_id):
    return r.sismember(f"compare:{session_id}", product_id)
```

## Fetching Comparison Data

Fetch product details for all items in the comparison set:

```python
def get_comparison_data(session_id):
    product_ids = get_comparison_list(session_id)
    if not product_ids:
        return []

    # Check comparison cache
    cache_key = _comparison_cache_key(product_ids)
    cached = r.get(f"compare:cache:{cache_key}")
    if cached:
        return json.loads(cached)

    # Fetch each product's details
    pipe = r.pipeline()
    for pid in sorted(product_ids):
        pipe.hgetall(f"product:{pid}")
    products = [p for p in pipe.execute() if p]

    # Cache the result
    r.setex(f"compare:cache:{cache_key}", 300, json.dumps(products))
    return products

def _comparison_cache_key(product_ids):
    sorted_ids = ",".join(sorted(product_ids))
    return hashlib.md5(sorted_ids.encode()).hexdigest()
```

## Comparison Count Badge

Show users how many products are in their comparison tray:

```python
def get_comparison_count(session_id):
    return r.scard(f"compare:{session_id}")
```

## Popular Comparison Pairs

Track which products are frequently compared together:

```python
def record_comparison_view(product_ids):
    if len(product_ids) < 2:
        return
    sorted_ids = sorted(product_ids)
    for i in range(len(sorted_ids)):
        for j in range(i + 1, len(sorted_ids)):
            pair_key = f"{sorted_ids[i]}:{sorted_ids[j]}"
            r.zincrby("compare:popular_pairs", 1, pair_key)

def get_popular_pairs(limit=10):
    return r.zrevrange("compare:popular_pairs", 0, limit - 1, withscores=True)
```

## Example Usage

```bash
# Add products to comparison
SADD compare:session:abc prod:101 prod:202
EXPIRE compare:session:abc 3600

# Check count
SCARD compare:session:abc    # 2

# Is a product already in comparison?
SISMEMBER compare:session:abc prod:101   # 1 (yes)

# Remove one
SREM compare:session:abc prod:202
```

## Summary

Redis Sets naturally model comparison baskets - uniqueness is enforced automatically and SCARD gives instant counts. Caching comparison views by a hash of the product set IDs prevents repeated assembly of the same comparison. Tracking popular product pairs in a Sorted Set reveals which combinations customers compare most.
