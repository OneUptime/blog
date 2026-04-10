# How to Implement Negative Caching in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Performance, Strategy, API

Description: Learn how to use negative caching in Redis to cache not-found results and protect your database from repeated lookups of missing data.

---

Most caching tutorials focus on caching successful responses. But when users request resources that don't exist - deleted products, invalid usernames, bad API keys - your application still hits the database on every attempt. Negative caching stores these "not found" results in Redis so subsequent requests are served from cache instead.

## The Problem Negative Caching Solves

Consider a product lookup endpoint. If a bot scrapes thousands of non-existent product IDs, each request hits the database with no cache benefit:

```text
GET /products/99999  ->  DB query -> 404  (no cache entry stored)
GET /products/99999  ->  DB query -> 404  (same DB hit again)
GET /products/99999  ->  DB query -> 404  (and again...)
```

With negative caching, only the first request hits the database. All subsequent requests are served from Redis.

## Implement Negative Caching in Python

Use a sentinel value to distinguish "cached miss" from "cache not populated":

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

NEGATIVE_CACHE_SENTINEL = "__NULL__"
POSITIVE_TTL = 300       # 5 minutes for real data
NEGATIVE_TTL = 60        # 1 minute for "not found" results

def get_product(product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)

    if cached == NEGATIVE_CACHE_SENTINEL:
        # We know this product doesn't exist
        return None

    if cached is not None:
        return json.loads(cached)

    # Cache miss - query the database
    product = fetch_product_from_db(product_id)

    if product is None:
        # Store sentinel value with short TTL
        r.set(cache_key, NEGATIVE_CACHE_SENTINEL, ex=NEGATIVE_TTL)
        return None

    # Store real result with longer TTL
    r.set(cache_key, json.dumps(product), ex=POSITIVE_TTL)
    return product
```

## Use Shorter TTLs for Negative Results

Negative cache entries should expire faster than positive ones. A product that doesn't exist today might be added tomorrow. Keeping a "not found" result cached for too long causes inconsistency.

```python
# Good: short negative TTL, longer positive TTL
POSITIVE_TTL = 600   # 10 minutes
NEGATIVE_TTL = 30    # 30 seconds
```

## Implement in Node.js

```javascript
const redis = require('redis');
const client = redis.createClient();
await client.connect();

const NEGATIVE_SENTINEL = '__NULL__';

async function getUser(userId) {
    const cacheKey = `user:${userId}`;
    const cached = await client.get(cacheKey);

    if (cached === NEGATIVE_SENTINEL) return null;
    if (cached) return JSON.parse(cached);

    const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (!user) {
        await client.set(cacheKey, NEGATIVE_SENTINEL, { EX: 30 });
        return null;
    }

    await client.set(cacheKey, JSON.stringify(user), { EX: 300 });
    return user;
}
```

## Invalidate Negative Cache on Creation

When a resource is created, remove its negative cache entry so the next request fetches the real data:

```python
def create_product(product_data: dict) -> dict:
    product = db_create_product(product_data)
    # Remove any negative cache entry for this ID
    r.delete(f"product:{product['id']}")
    return product
```

## Monitor Negative Cache Effectiveness

Track the ratio of sentinel hits to understand your traffic patterns:

```bash
# Check how many negative cache entries exist
redis-cli keys "product:*" | xargs -I{} redis-cli get {} | grep -c "__NULL__"
```

## Summary

Negative caching protects your database from repeated lookups of non-existent resources by storing a sentinel value in Redis when a query returns no results. Use a shorter TTL for negative entries than for positive ones, and invalidate negative entries when resources are created. This pattern is especially valuable when facing bots, scrapers, or retry storms targeting invalid IDs.
