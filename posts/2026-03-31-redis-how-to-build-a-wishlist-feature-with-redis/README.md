# How to Build a Wishlist Feature with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Wishlist, E-Commerce, Set, Sorted Set

Description: Learn how to build a product wishlist feature in Redis with add, remove, share, and popularity tracking using Sets and Sorted Sets.

---

## Wishlist Design with Redis Sets

A wishlist is a set of product IDs associated with a user. Redis Sets provide O(1) add, remove, and membership check operations. Sorted Sets add ordering by date added or custom priority.

## Basic Wishlist with Sets

```bash
# Add items to wishlist
SADD wishlist:user:42 product:1001 product:1005 product:2003

# Remove item
SREM wishlist:user:42 product:1001

# Check if item is in wishlist
SISMEMBER wishlist:user:42 product:1005

# Count items
SCARD wishlist:user:42

# Get all items
SMEMBERS wishlist:user:42
```

## Python Wishlist with Timestamps (Sorted Set)

Using a Sorted Set allows ordering by date added and easy pagination:

```python
from redis import Redis
import time

r = Redis(decode_responses=True)
WISHLIST_TTL = 365 * 86400  # 1 year

def add_to_wishlist(user_id: int, product_id: str) -> bool:
    key = f"wishlist:{user_id}"
    added = r.zadd(key, {product_id: time.time()}, nx=True)
    r.expire(key, WISHLIST_TTL)
    # Track product popularity
    r.zincrby("wishlist:popular", 1, product_id)
    return bool(added)

def remove_from_wishlist(user_id: int, product_id: str):
    key = f"wishlist:{user_id}"
    r.zrem(key, product_id)
    r.zincrby("wishlist:popular", -1, product_id)

def is_in_wishlist(user_id: int, product_id: str) -> bool:
    return r.zscore(f"wishlist:{user_id}", product_id) is not None

def get_wishlist(user_id: int, page: int = 0, page_size: int = 20) -> list:
    key = f"wishlist:{user_id}"
    start = page * page_size
    # Newest first
    items = r.zrange(key, start, start + page_size - 1, desc=True, withscores=True)
    return [
        {"product_id": pid, "added_at": int(score)}
        for pid, score in items
    ]

def get_wishlist_count(user_id: int) -> int:
    return r.zcard(f"wishlist:{user_id}")
```

## Most Wished Products

```python
def get_most_wished(limit: int = 20) -> list:
    items = r.zrange("wishlist:popular", 0, limit - 1, desc=True, withscores=True)
    return [
        {"product_id": pid, "wishlist_count": int(count)}
        for pid, count in items
    ]
```

## Shared Wishlists

Allow users to create named, shareable wishlists:

```python
import uuid

def create_named_wishlist(user_id: int, name: str) -> str:
    wishlist_id = str(uuid.uuid4())[:12]
    r.hset(f"wishlist:meta:{wishlist_id}", mapping={
        "owner_id": user_id,
        "name": name,
        "created_at": int(time.time()),
        "public": "true"
    })
    return wishlist_id

def add_to_named_wishlist(wishlist_id: str, product_id: str):
    r.zadd(f"wishlist:named:{wishlist_id}", {product_id: time.time()})

def get_named_wishlist(wishlist_id: str) -> dict:
    meta = r.hgetall(f"wishlist:meta:{wishlist_id}")
    items = r.zrange(f"wishlist:named:{wishlist_id}", 0, -1, desc=True, withscores=True)
    return {
        "meta": meta,
        "items": [{"product_id": pid, "added_at": int(score)} for pid, score in items]
    }
```

## Price Drop Notification

Track price at time of adding to wishlist and notify on drops:

```python
def add_with_price_tracking(user_id: int, product_id: str, current_price: float):
    pipe = r.pipeline()
    pipe.zadd(f"wishlist:{user_id}", {product_id: time.time()}, nx=True)
    pipe.hset(f"wishlist:prices:{user_id}", product_id, current_price)
    pipe.execute()

def check_price_drops(user_id: int, current_prices: dict) -> list:
    drops = []
    for product_id, new_price in current_prices.items():
        old_price = r.hget(f"wishlist:prices:{user_id}", product_id)
        if old_price and float(old_price) > new_price:
            drops.append({
                "product_id": product_id,
                "old_price": float(old_price),
                "new_price": new_price,
                "savings": round(float(old_price) - new_price, 2)
            })
    return drops
```

## Finding Common Wishlist Items

```python
def common_wishlist_items(user_id_a: int, user_id_b: int) -> set:
    key_a = f"wishlist:{user_id_a}"
    key_b = f"wishlist:{user_id_b}"
    # Convert sorted set to set for intersection
    items_a = set(r.zrange(key_a, 0, -1))
    items_b = set(r.zrange(key_b, 0, -1))
    return items_a & items_b
```

## Summary

Redis Sorted Sets with timestamp scores provide a wishlist implementation with O(log n) add/remove and efficient pagination sorted by date. Tracking wishlist counts in a global Sorted Set enables popular product rankings. Price tracking with Hash fields enables price drop notifications when items on wishlists go on sale.
