# How to Invalidate Redis Cache on Database Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache Invalidation, Cache Consistency, Database, Best Practice

Description: Learn strategies for invalidating Redis cache entries reliably when the underlying database data changes, covering deletion, versioning, and tag-based approaches.

---

## The Cache Invalidation Challenge

Cache invalidation is famously described as one of the two hard problems in computer science. The core challenge is:

- Invalidate too aggressively: High cache miss rate, increased DB load
- Invalidate too conservatively: Stale data served to users
- Fail to invalidate: Incorrect data served indefinitely

## Strategy 1: Direct Key Deletion

The simplest approach - delete the specific cache key when the underlying record changes:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def update_product(product_id: int, updates: dict, db):
    # Update database first
    db.execute(
        "UPDATE products SET name = %(name)s, price = %(price)s WHERE id = %(id)s",
        {**updates, 'id': product_id}
    )
    db.commit()

    # Then invalidate specific cache key
    deleted = r.delete(f"product:{product_id}")
    print(f"Invalidated cache for product:{product_id} ({deleted} keys deleted)")

def delete_product(product_id: int, db):
    db.execute("DELETE FROM products WHERE id = %s", (product_id,))
    db.commit()

    r.delete(f"product:{product_id}")
    # Also invalidate list caches that might include this product
    r.delete("products:featured")
    r.delete("products:latest")
```

## Strategy 2: Versioned Cache Keys

Instead of deleting keys, increment a version counter. Old keys expire naturally:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_entity_version(entity: str, entity_id: str) -> int:
    version = r.get(f"version:{entity}:{entity_id}")
    return int(version) if version else 0

def bump_version(entity: str, entity_id: str) -> int:
    new_version = r.incr(f"version:{entity}:{entity_id}")
    r.expire(f"version:{entity}:{entity_id}", 86400)  # TTL on version key itself
    return new_version

def get_user_cached(user_id: int, db) -> dict | None:
    version = get_entity_version("user", str(user_id))
    cache_key = f"user:{user_id}:v{version}"

    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from DB
    row = db.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,)).fetchone()
    if not row:
        return None

    user = {'id': row[0], 'name': row[1], 'email': row[2]}
    r.setex(cache_key, 3600, json.dumps(user))
    return user

def update_user_versioned(user_id: int, updates: dict, db):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        (updates.get('name'), updates.get('email'), user_id)
    )
    db.commit()

    # Increment version - old cached keys will expire naturally
    new_version = bump_version("user", str(user_id))
    print(f"User {user_id} version bumped to {new_version}")
```

## Strategy 3: Tag-Based Invalidation

Group related cache keys with tags and invalidate entire groups at once:

```python
import redis
import json
from typing import List

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

TAG_TTL = 86400  # 24 hours

def set_with_tags(key: str, value, ttl: int, tags: List[str]):
    """Store a value in cache and register it under multiple tags."""
    pipe = r.pipeline()
    pipe.setex(key, ttl, json.dumps(value, default=str))
    for tag in tags:
        tag_key = f"tag:{tag}"
        pipe.sadd(tag_key, key)
        pipe.expire(tag_key, max(ttl, TAG_TTL))
    pipe.execute()

def invalidate_tag(tag: str) -> int:
    """Invalidate all cache keys associated with a tag."""
    tag_key = f"tag:{tag}"
    keys = r.smembers(tag_key)

    if not keys:
        return 0

    pipe = r.pipeline()
    for key in keys:
        pipe.delete(key)
    pipe.delete(tag_key)
    pipe.execute()

    print(f"Invalidated {len(keys)} keys for tag '{tag}'")
    return len(keys)

# Example: Cache user-related queries with tags
def cache_user_orders(user_id: int, orders: list):
    set_with_tags(
        f"user:{user_id}:orders",
        orders,
        ttl=300,
        tags=[f"user:{user_id}", "orders"]
    )

def cache_user_profile(user_id: int, profile: dict):
    set_with_tags(
        f"user:{user_id}:profile",
        profile,
        ttl=3600,
        tags=[f"user:{user_id}"]
    )

def on_user_updated(user_id: int):
    # Invalidate everything tagged for this user
    count = invalidate_tag(f"user:{user_id}")
    print(f"Cleared {count} cache entries for user {user_id}")

def on_order_created_or_updated(order_id: int, user_id: int):
    # Invalidate order-related caches for this user
    invalidate_tag(f"user:{user_id}")
    invalidate_tag("orders:recent")  # Clear recent orders list
```

## Strategy 4: Time-Based TTL as Safety Net

Even with explicit invalidation, always set a TTL as a fallback safety net:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# TTL constants by data sensitivity
TTL_MAP = {
    'session': 3600,          # 1 hour - user sessions
    'user_profile': 3600,     # 1 hour - rarely changes
    'product': 300,           # 5 minutes - may change
    'inventory': 60,          # 1 minute - frequently changes
    'price': 30,              # 30 seconds - may change often
    'exchange_rate': 10,      # 10 seconds - real-time data
    'analytics': 600,         # 10 minutes - aggregated data
}

def set_cache(key: str, value, data_type: str = 'product'):
    ttl = TTL_MAP.get(data_type, 300)
    r.setex(key, ttl, json.dumps(value, default=str))
```

## Strategy 5: Write-Through Cache

Always update cache on every write to keep it consistent:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_user_write_through(user_data: dict, db) -> dict:
    # Write to database
    result = db.execute(
        "INSERT INTO users (name, email, role) VALUES (%s, %s, %s) RETURNING id, name, email, role",
        (user_data['name'], user_data['email'], user_data.get('role', 'user'))
    ).fetchone()
    db.commit()

    user = {'id': result[0], 'name': result[1], 'email': result[2], 'role': result[3]}

    # Write to cache simultaneously
    r.setex(f"user:{user['id']}", 3600, json.dumps(user))

    return user

def update_user_write_through(user_id: int, updates: dict, db) -> dict:
    row = db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s RETURNING id, name, email, role",
        (updates.get('name'), updates.get('email'), user_id)
    ).fetchone()
    db.commit()

    user = {'id': row[0], 'name': row[1], 'email': row[2], 'role': row[3]}

    # Update cache with fresh data
    r.setex(f"user:{user['id']}", 3600, json.dumps(user))

    return user
```

## Handling Invalidation in Transactions

For consistency, invalidate cache only after the database transaction commits:

```python
import redis
import psycopg2
import json
from contextlib import contextmanager

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

@contextmanager
def db_transaction_with_cache_invalidation(pg):
    keys_to_invalidate = []

    def mark_for_invalidation(key: str):
        keys_to_invalidate.append(key)

    try:
        yield mark_for_invalidation
        pg.commit()
        # Only invalidate cache AFTER successful commit
        if keys_to_invalidate:
            r.delete(*keys_to_invalidate)
            print(f"Committed and invalidated: {keys_to_invalidate}")
    except Exception:
        pg.rollback()
        # Don't invalidate if transaction failed
        keys_to_invalidate.clear()
        raise

pg = psycopg2.connect("postgresql://user:password@localhost/mydb")

# Usage
with db_transaction_with_cache_invalidation(pg) as invalidate:
    with pg.cursor() as cur:
        cur.execute("UPDATE users SET name = 'Bob' WHERE id = 1")
        cur.execute("UPDATE orders SET status = 'shipped' WHERE user_id = 1")
    invalidate("user:1")
    invalidate("user:1:orders")
```

## Summary

Effective Redis cache invalidation uses a layered approach: direct key deletion for known affected keys, tag-based invalidation for bulk clearing of related entries, versioned keys for zero-downtime invalidation with natural TTL expiry of old versions, and write-through updates for latency-sensitive scenarios. Always set TTLs on all cache entries as a safety net regardless of explicit invalidation logic, and only invalidate after a database transaction successfully commits to avoid clearing cache for rolled-back changes.
