# How to Implement Faceted Navigation with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Faceted Navigation, Search, Set, Sorted Set, E-Commerce

Description: Build fast faceted navigation (filtering by category, price, brand, etc.) using Redis sets and sorted sets to power real-time search facets at scale.

---

## What Is Faceted Navigation?

Faceted navigation lets users filter search results by multiple attributes simultaneously - for example, filtering products by brand AND price range AND category. The challenge is computing the count of matching items for each facet value efficiently.

Redis sets and sorted sets are ideal for this because set intersection, union, and difference operations are extremely fast in memory.

## Data Model

For each facet value, maintain a Redis Set of matching item IDs:

```text
facet:brand:nike       -> {product:101, product:205, product:312}
facet:brand:adidas     -> {product:102, product:203, product:401}
facet:category:shoes   -> {product:101, product:102, product:205}
facet:size:42          -> {product:101, product:203, product:312}
```

For price ranges, use a Sorted Set with price as the score:

```text
facet:price  -> { product:101: 89.99, product:102: 129.99, product:205: 59.99 }
```

## Indexing Products

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

def index_product(product: dict):
    product_id = f"product:{product['id']}"

    # Store product data
    r.set(product_id, json.dumps(product))

    # Index each facet
    r.sadd(f"facet:brand:{product['brand'].lower()}", product_id)
    r.sadd(f"facet:category:{product['category'].lower()}", product_id)

    for size in product.get('sizes', []):
        r.sadd(f"facet:size:{size}", product_id)

    # Index price as sorted set for range queries
    r.zadd('facet:price', {product_id: float(product['price'])})

# Example usage
products = [
    {"id": 101, "brand": "Nike", "category": "shoes", "sizes": [40, 41, 42], "price": 89.99},
    {"id": 102, "brand": "Adidas", "category": "shoes", "sizes": [41, 42, 43], "price": 129.99},
    {"id": 205, "brand": "Nike", "category": "shoes", "sizes": [38, 39, 40], "price": 59.99},
]

for p in products:
    index_product(p)
```

## Querying with Multiple Facets

Use SINTERSTORE to intersect multiple facet sets and get matching IDs:

```python
import uuid

def search_with_facets(filters: dict, price_min=None, price_max=None):
    """
    filters = {
        'brand': ['nike'],
        'category': ['shoes'],
        'size': ['42']
    }
    """
    temp_keys = []
    facet_keys = []

    # Collect set keys for each filter
    for facet, values in filters.items():
        if len(values) == 1:
            facet_keys.append(f"facet:{facet}:{values[0]}")
        else:
            # Union multiple values of the same facet first
            union_key = f"temp:union:{uuid.uuid4().hex}"
            temp_keys.append(union_key)
            r.sunionstore(union_key, *[f"facet:{facet}:{v}" for v in values])
            r.expire(union_key, 60)
            facet_keys.append(union_key)

    # Apply price range filter
    if price_min is not None or price_max is not None:
        lo = price_min if price_min is not None else '-inf'
        hi = price_max if price_max is not None else '+inf'
        price_ids = r.zrangebyscore('facet:price', lo, hi)
        price_key = f"temp:price:{uuid.uuid4().hex}"
        temp_keys.append(price_key)
        if price_ids:
            r.sadd(price_key, *[pid.decode() for pid in price_ids])
            r.expire(price_key, 60)
            facet_keys.append(price_key)
        else:
            # Price range matched nothing - clean up and return empty
            for key in temp_keys:
                r.delete(key)
            return []

    if not facet_keys:
        return []

    # Intersect all facet sets
    if len(facet_keys) == 1:
        result_ids = r.smembers(facet_keys[0])
    else:
        result_key = f"temp:result:{uuid.uuid4().hex}"
        temp_keys.append(result_key)
        r.sinterstore(result_key, *facet_keys)
        r.expire(result_key, 60)
        result_ids = r.smembers(result_key)

    # Fetch product data
    results = []
    for pid in result_ids:
        data = r.get(pid.decode() if isinstance(pid, bytes) else pid)
        if data:
            results.append(json.loads(data))

    # Cleanup temp keys
    for key in temp_keys:
        r.delete(key)

    return results

# Search for Nike or Adidas shoes in size 42 under $120
results = search_with_facets(
    filters={'brand': ['nike', 'adidas'], 'category': ['shoes'], 'size': ['42']},
    price_max=120.0
)
```

## Computing Facet Counts

Show the count of results for each facet value given the current filter selection:

```python
def get_facet_counts(base_result_key: str, facet: str, values: list) -> dict:
    """
    Count how many results match each value of a facet.
    base_result_key is a temp set containing current result IDs.
    """
    counts = {}
    for value in values:
        intersection_key = f"temp:count:{uuid.uuid4().hex}"
        r.sinterstore(intersection_key, base_result_key, f"facet:{facet}:{value}")
        counts[value] = r.scard(intersection_key)
        r.delete(intersection_key)
    return counts

# Example: count shoes by brand in the current result set
brand_counts = get_facet_counts('my_results', 'brand', ['nike', 'adidas', 'puma'])
# Returns: {'nike': 2, 'adidas': 1, 'puma': 0}
```

## Caching Facet Results

Cache popular facet combinations to avoid recomputing:

```python
import hashlib

def get_cached_facet_results(filters: dict, price_min=None, price_max=None):
    cache_input = str(sorted((k, sorted(str(x) for x in v)) for k, v in filters.items())) + f":{price_min}:{price_max}"
    cache_key = f"facet_cache:{hashlib.md5(cache_input.encode()).hexdigest()}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    results = search_with_facets(filters, price_min, price_max)
    r.setex(cache_key, 300, json.dumps(results))
    return results
```

## Summary

Redis sets make faceted navigation fast and scalable by pre-indexing each facet value as a set of item IDs. Multiple filters are resolved through set intersection (AND logic), while multiple values within the same facet are resolved through union (OR logic). Price and numeric ranges are handled using sorted sets with ZRANGEBYSCORE. Cache popular facet combinations for additional performance gains.
