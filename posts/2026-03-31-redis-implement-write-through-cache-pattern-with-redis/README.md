# How to Implement Write-Through Cache Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Write-Through, Cache Patterns, Database

Description: Learn how to implement the write-through cache pattern with Redis, ensuring cache and database stay in sync on every write operation.

---

## What is the Write-Through Pattern?

In the write-through cache pattern, every write to the cache is immediately and synchronously written to the underlying data store (database) as well. The application writes to the cache, which in turn writes to the database before returning success to the caller.

```text
Application
    |
    v
  Redis (cache) ----> Database
    |                    |
    +-------- success ----+
```

This guarantees that the cache and database are always in sync, with no risk of stale data after a write.

## When to Use Write-Through

- Data consistency is critical and you cannot tolerate stale reads
- Read-heavy workloads where you want every written item to be immediately cacheable
- User profile data, product catalog, configuration settings

## Trade-offs

| Aspect | Write-Through |
|--------|---------------|
| Consistency | Strong - cache always matches DB |
| Write latency | Higher - waits for both cache and DB |
| Cache hit rate | High - data is always in cache after write |
| Cold start | Needs warming or lazy population |

## Python Implementation

```python
import redis
import json
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user(user_id: int) -> Optional[dict]:
    """Read from cache first, fallback to DB."""
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    # Cache miss - read from DB
    user = db_get_user(user_id)
    if user:
        r.setex(key, 3600, json.dumps(user))
    return user

def update_user(user_id: int, data: dict) -> dict:
    """Write-through: update DB first, then cache."""
    # 1. Write to database
    updated = db_update_user(user_id, data)

    # 2. Write to cache immediately
    key = f"user:{user_id}"
    r.setex(key, 3600, json.dumps(updated))

    return updated

def create_user(data: dict) -> dict:
    """Write-through: create in DB and cache."""
    # 1. Insert into database
    user = db_create_user(data)

    # 2. Populate cache immediately
    key = f"user:{user['id']}"
    r.setex(key, 3600, json.dumps(user))

    return user

def delete_user(user_id: int) -> None:
    """Delete from both DB and cache."""
    db_delete_user(user_id)
    r.delete(f"user:{user_id}")

# Stub database functions
def db_get_user(user_id: int) -> Optional[dict]:
    # SELECT * FROM users WHERE id = user_id
    pass

def db_update_user(user_id: int, data: dict) -> dict:
    # UPDATE users SET ... WHERE id = user_id RETURNING *
    pass

def db_create_user(data: dict) -> dict:
    # INSERT INTO users ... RETURNING *
    pass

def db_delete_user(user_id: int) -> None:
    # DELETE FROM users WHERE id = user_id
    pass
```

## Node.js Implementation

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
await client.connect();

async function getProduct(productId) {
  const key = `product:${productId}`;
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (product) {
    await client.setEx(key, 3600, JSON.stringify(product));
  }
  return product;
}

async function updateProduct(productId, updates) {
  // Step 1 - write to database
  const updated = await db.query(
    'UPDATE products SET name = $2, price = $3 WHERE id = $1 RETURNING *',
    [productId, updates.name, updates.price]
  );

  // Step 2 - write to cache (write-through)
  const key = `product:${productId}`;
  await client.setEx(key, 3600, JSON.stringify(updated.rows[0]));

  return updated.rows[0];
}

async function createProduct(data) {
  const inserted = await db.query(
    'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
    [data.name, data.price]
  );
  const product = inserted.rows[0];

  // Immediately populate cache
  await client.setEx(`product:${product.id}`, 3600, JSON.stringify(product));
  return product;
}
```

## Atomic Write-Through with Transactions

To ensure the cache and DB are updated together, use transactions carefully. Note: Redis and relational DB transactions are separate, so you must handle partial failures:

```python
import redis
import json

def update_user_atomic(user_id: int, data: dict) -> dict:
    """Attempt atomic write-through with rollback on failure."""
    key = f"user:{user_id}"

    try:
        # 1. Write to database
        updated = db_update_user(user_id, data)

        # 2. Write to Redis (use pipeline for efficiency)
        pipe = r.pipeline()
        pipe.setex(key, 3600, json.dumps(updated))
        pipe.execute()

        return updated

    except Exception as e:
        # On failure - ensure cache is invalidated (not stale)
        r.delete(key)
        raise e
```

## Handling DB Write Failures

If the database write fails, the cache should not be updated. If the cache write fails after a successful DB write, the cache should be invalidated so the next read falls through to the DB:

```python
def safe_write_through(user_id: int, data: dict) -> dict:
    key = f"user:{user_id}"

    # Step 1 - write to DB
    try:
        updated = db_update_user(user_id, data)
    except Exception as db_err:
        # DB failed - do not touch cache
        raise db_err

    # Step 2 - write to cache
    try:
        r.setex(key, 3600, json.dumps(updated))
    except Exception:
        # Cache write failed - invalidate so reads go to DB
        r.delete(key)

    return updated
```

## Comparison with Other Patterns

```text
Write-Through:  write -> DB -> cache -> return
Write-Behind:   write -> cache -> return, async DB flush
Cache-Aside:    write -> DB only, cache populated on next read
```

## Summary

The write-through pattern ensures the cache is always populated with fresh data after every write by updating both the database and cache synchronously. This keeps read latency low (cache hit on the next request) at the cost of slightly higher write latency. Always handle DB and cache write failures carefully - if the DB write fails, skip the cache; if the cache write fails, invalidate the cache key so the next read goes to the database.
