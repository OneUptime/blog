# How to Implement Database Query Result Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Query Caching, Database Performance, Caching Patterns, Python

Description: Learn how to implement database query result caching with Redis, including cache key generation, serialization, TTL strategies, and cache warming.

---

## Query Result Caching Overview

Query result caching stores the output of database queries in Redis so subsequent identical queries are served from memory. Unlike row-level caching, query result caching works at the query level and is particularly effective for:
- Expensive aggregation queries
- Paginated result sets
- Search results
- Dashboard metrics

## Cache Key Generation

A cache key must uniquely identify a query including its parameters:

```python
import hashlib
import json

def make_cache_key(query: str, params: tuple = (), prefix: str = "query") -> str:
    """Generate a consistent cache key for a SQL query and its parameters."""
    key_data = json.dumps({'query': query, 'params': list(params)}, sort_keys=True)
    key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:16]
    return f"{prefix}:{key_hash}"

# Examples
key1 = make_cache_key("SELECT * FROM users WHERE role = %s", ("admin",))
key2 = make_cache_key("SELECT COUNT(*) FROM orders WHERE status = %s", ("pending",))
print(key1)  # query:a3f8b2c1d4e5f6a7
print(key2)  # query:b7e9d2a1c3f4e5d8
```

## Basic Query Caching Decorator

```python
import redis
import psycopg2
import json
import hashlib
import functools
from typing import Callable

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
pg = psycopg2.connect("postgresql://user:password@localhost/mydb")

def cache_query(ttl: int = 300, prefix: str = "query"):
    """Decorator that caches database query results in Redis."""
    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name + args
            key_data = json.dumps({
                'fn': fn.__name__,
                'args': list(str(a) for a in args),
                'kwargs': {k: str(v) for k, v in sorted(kwargs.items())}
            })
            cache_key = f"{prefix}:{fn.__name__}:{hashlib.sha256(key_data.encode()).hexdigest()[:12]}"

            # Try cache
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)

            # Execute query
            result = fn(*args, **kwargs)

            # Store in cache
            r.setex(cache_key, ttl, json.dumps(result, default=str))
            return result

        wrapper.invalidate = lambda *args, **kwargs: r.delete(
            f"{prefix}:{fn.__name__}:{hashlib.sha256(json.dumps({'fn': fn.__name__, 'args': list(str(a) for a in args), 'kwargs': {k: str(v) for k, v in sorted(kwargs.items())}}).encode()).hexdigest()[:12]}"
        )
        return wrapper
    return decorator

@cache_query(ttl=600, prefix="analytics")
def get_daily_order_stats(date: str) -> dict:
    with pg.cursor() as cur:
        cur.execute("""
            SELECT
                COUNT(*) as total_orders,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM orders
            WHERE DATE(created_at) = %s AND status = 'completed'
        """, (date,))
        row = cur.fetchone()
    return {
        'date': date,
        'total_orders': row[0],
        'total_revenue': float(row[1] or 0),
        'avg_order_value': float(row[2] or 0),
        'unique_customers': row[3]
    }

# Usage
stats = get_daily_order_stats("2024-04-01")
print(stats)
```

## Paginated Query Caching

```python
def get_products_page(category: str, page: int, per_page: int = 20, sort: str = "created_at_desc") -> dict:
    cache_key = f"products:{category}:page:{page}:per:{per_page}:sort:{sort}"

    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    offset = (page - 1) * per_page
    sort_col, sort_dir = sort.rsplit('_', 1)
    sort_sql = f"{sort_col} {'DESC' if sort_dir == 'desc' else 'ASC'}"

    with pg.cursor() as cur:
        # Get page data
        cur.execute(f"""
            SELECT id, name, price, sku, thumbnail_url, created_at
            FROM products
            WHERE category = %s AND active = true
            ORDER BY {sort_sql}
            LIMIT %s OFFSET %s
        """, (category, per_page, offset))
        rows = cur.fetchall()

        # Get total count
        cur.execute("SELECT COUNT(*) FROM products WHERE category = %s AND active = true", (category,))
        total = cur.fetchone()[0]

    result = {
        'items': [
            {'id': row[0], 'name': row[1], 'price': float(row[2]), 'sku': row[3],
             'thumbnail_url': row[4], 'created_at': str(row[5])}
            for row in rows
        ],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }

    r.setex(cache_key, 120, json.dumps(result))  # 2 minute TTL
    return result
```

## Tag-Based Cache Invalidation

Group related cache keys with tags for bulk invalidation:

```python
def cache_with_tags(key: str, value, ttl: int, tags: list):
    pipe = r.pipeline()
    pipe.setex(key, ttl, json.dumps(value, default=str))
    for tag in tags:
        pipe.sadd(f"cachetag:{tag}", key)
        pipe.expire(f"cachetag:{tag}", ttl + 60)  # Slightly longer than cached data
    pipe.execute()

def invalidate_by_tag(tag: str):
    tag_key = f"cachetag:{tag}"
    keys = r.smembers(tag_key)
    if keys:
        pipe = r.pipeline()
        for key in keys:
            pipe.delete(key)
        pipe.delete(tag_key)
        pipe.execute()
        print(f"Invalidated {len(keys)} keys tagged with '{tag}'")

# Cache query result with tags
def get_user_products(user_id: int) -> list:
    cache_key = f"user_products:{user_id}"

    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    with pg.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, p.price
            FROM products p
            JOIN user_products up ON up.product_id = p.id
            WHERE up.user_id = %s
        """, (user_id,))
        rows = cur.fetchall()

    products = [{'id': row[0], 'name': row[1], 'price': float(row[2])} for row in rows]

    # Tag with both user and product tags
    cache_with_tags(
        cache_key, products, 3600,
        tags=[f"user:{user_id}", "products:all"]
    )
    return products

# When a product changes, invalidate all queries that touched it
def on_product_changed():
    invalidate_by_tag("products:all")

# When a user changes, invalidate their specific queries
def on_user_changed(user_id: int):
    invalidate_by_tag(f"user:{user_id}")
```

## Cache Warming

Pre-populate cache before traffic hits:

```python
def warm_cache_for_top_categories():
    """Pre-populate cache for the most queried categories."""
    with pg.cursor() as cur:
        cur.execute("""
            SELECT category, COUNT(*) as hits
            FROM query_log
            WHERE created_at > NOW() - INTERVAL '1 day'
            GROUP BY category
            ORDER BY hits DESC
            LIMIT 20
        """)
        top_categories = [row[0] for row in cur.fetchall()]

    warmed = 0
    for category in top_categories:
        for page in range(1, 4):  # Warm first 3 pages
            result = get_products_page(category, page)
            if not result['items']:
                break
            warmed += 1

    print(f"Cache warmed: {warmed} query result pages")

# Run before deployment or on schedule
warm_cache_for_top_categories()
```

## Monitoring Cache Effectiveness

```python
def get_query_cache_metrics() -> dict:
    info = r.info('stats')
    hits = info.get('keyspace_hits', 0)
    misses = info.get('keyspace_misses', 0)
    total = hits + misses

    # Count cached queries
    cached_queries = sum(1 for _ in r.scan_iter("query:*"))
    analytics_queries = sum(1 for _ in r.scan_iter("analytics:*"))

    return {
        'hit_rate': hits / total if total > 0 else 0,
        'hits': hits,
        'misses': misses,
        'cached_query_keys': cached_queries,
        'cached_analytics_keys': analytics_queries
    }

metrics = get_query_cache_metrics()
print(f"Query cache hit rate: {metrics['hit_rate']:.1%}")
print(f"Total cached query keys: {metrics['cached_query_keys']}")
```

## Summary

Implementing database query result caching with Redis requires generating consistent cache keys from query text and parameters, choosing appropriate TTLs based on data staleness tolerance, and implementing targeted invalidation strategies. Use the @cache_query decorator for simple function-level caching, tag-based invalidation for bulk cache management when related entities change, and cache warming for predictable high-traffic scenarios. Monitor hit rates to validate TTL settings and identify queries where caching is not effective.
