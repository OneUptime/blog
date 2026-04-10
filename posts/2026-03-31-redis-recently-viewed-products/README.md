# How to Build a Recently Viewed Products Feature with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, List, User Session

Description: Track recently viewed products per user with Redis Lists - maintain ordered history, cap list size automatically, and render personalized product carousels in milliseconds.

---

"Recently viewed" sections help users navigate back to products they were considering. Redis Lists are the ideal data structure: fast prepend, automatic size capping with LTRIM, and O(N) retrieval.

## Data Model

```text
viewed:{userId}  -> List of product IDs (most recent first, capped at 20)
```

## Recording a Product View

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_HISTORY = 20

def record_product_view(user_id, product_id):
    key = f"viewed:{user_id}"
    pipe = r.pipeline()
    # Remove any existing occurrence to avoid duplicates
    pipe.lrem(key, 0, product_id)
    # Add to front of list
    pipe.lpush(key, product_id)
    # Keep only the most recent MAX_HISTORY items
    pipe.ltrim(key, 0, MAX_HISTORY - 1)
    pipe.execute()
```

## Retrieving Recently Viewed Products

```python
def get_recently_viewed(user_id, limit=10):
    return r.lrange(f"viewed:{user_id}", 0, limit - 1)

def get_recently_viewed_with_details(user_id, limit=10):
    product_ids = get_recently_viewed(user_id, limit)
    if not product_ids:
        return []
    # Batch fetch product details
    pipe = r.pipeline()
    for pid in product_ids:
        pipe.hgetall(f"product:{pid}")
    results = pipe.execute()
    return [p for p in results if p]
```

## Removing a Specific Item

```python
def remove_from_viewed(user_id, product_id):
    r.lrem(f"viewed:{user_id}", 0, product_id)

def clear_viewed_history(user_id):
    r.delete(f"viewed:{user_id}")
```

## Anonymous User Tracking

For guest users, use a session ID instead of a user ID:

```python
def record_guest_view(session_id, product_id, ttl=86400 * 7):
    key = f"viewed:guest:{session_id}"
    pipe = r.pipeline()
    pipe.lrem(key, 0, product_id)
    pipe.lpush(key, product_id)
    pipe.ltrim(key, 0, MAX_HISTORY - 1)
    pipe.expire(key, ttl)  # Expire after 7 days
    pipe.execute()
```

## Merging Guest History on Login

When an anonymous user logs in, merge their guest history into their account:

```python
def merge_guest_to_user(session_id, user_id):
    guest_key = f"viewed:guest:{session_id}"
    user_key = f"viewed:{user_id}"

    guest_history = r.lrange(guest_key, 0, -1)
    if not guest_history:
        return

    # Add guest items to the user list (in reverse order to preserve recency)
    pipe = r.pipeline()
    for product_id in reversed(guest_history):
        pipe.lrem(user_key, 0, product_id)
        pipe.lpush(user_key, product_id)
    pipe.ltrim(user_key, 0, MAX_HISTORY - 1)
    pipe.delete(guest_key)
    pipe.execute()
```

## Trending by View Count

Track global view counts alongside per-user history:

```python
def record_view_with_global_count(user_id, product_id):
    record_product_view(user_id, product_id)
    r.zincrby("product:view_counts", 1, product_id)

def get_trending_products(limit=10):
    return r.zrevrange("product:view_counts", 0, limit - 1, withscores=True)
```

## Example Usage

```bash
# User views products
LREM viewed:user:1 0 prod:101
LPUSH viewed:user:1 prod:101
LTRIM viewed:user:1 0 19

LREM viewed:user:1 0 prod:202
LPUSH viewed:user:1 prod:202
LTRIM viewed:user:1 0 19

# Get recently viewed
LRANGE viewed:user:1 0 4   # [prod:202, prod:101]
```

## Summary

Redis Lists provide an ordered, size-capped recently viewed history with O(1) prepend and O(N) retrieval. The LREM/LPUSH/LTRIM pattern deduplicates and caps the list in a single pipeline. Combine with a global view-count Sorted Set to surface trending products across all users.
