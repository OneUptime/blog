# How to Use Redis Top-K for Finding Most Popular Items

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Top-K, Probabilistic, Heavy Hitter, Analytics

Description: Learn how to use the Redis Top-K probabilistic data structure to track the most frequently occurring items in a stream with minimal memory.

---

## What Is Redis Top-K

Redis Top-K maintains an approximate list of the K most frequent items in a data stream using constant memory, regardless of stream size. It uses the HeavyKeeper algorithm, which accurately identifies heavy hitters (items appearing far more than average) with a small probability of false inclusion.

This is ideal for real-time leaderboards, trending products, popular search terms, or most-used API endpoints when you only care about the top N items.

## Creating a Top-K Structure

```bash
# Track the top 10 most popular products
# TOPK.RESERVE key k width depth decay
TOPK.RESERVE topk:products 10 2000 7 0.925

# Simpler creation (Redis Stack default parameters)
TOPK.RESERVE topk:searches 20
```

Parameters:
- `k`: Number of top items to track
- `width`: Number of counters per hash function (higher = better accuracy)
- `depth`: Number of hash functions (higher = lower false positive rate)
- `decay`: Exponential decay factor (0.9-0.95 recommended)

## Adding Items

```bash
# Increment item counts
TOPK.ADD topk:products product:42 product:17 product:99 product:42

# TOPK.ADD returns which items were dropped from the top-K list (if any)
```

## Querying the Top-K List

```bash
# Get all items currently in the top-K
TOPK.LIST topk:products

# Get items WITH their approximate counts
TOPK.LIST topk:products WITHCOUNT

# Check if specific items are in the top-K
TOPK.QUERY topk:products product:42 product:99
```

## Python Implementation

```python
from redis import Redis

r = Redis(decode_responses=True)

def init_topk(key: str, k: int = 10):
    """Initialize a Top-K structure."""
    try:
        r.topk().info(key)
    except Exception:
        r.topk().reserve(key, k, 8, 7, 0.9)

def add_events(key: str, *items: str) -> list:
    """Add items to the Top-K structure. Returns dropped items."""
    return r.topk().add(key, *items)

def get_top_items(key: str) -> list:
    """Get current top-K items."""
    return r.topk().list(key)

def get_top_items_with_counts(key: str) -> dict:
    """Get top-K items with their approximate counts."""
    result = r.topk().list(key, withcount=True)
    return dict(zip(result[::2], result[1::2]))

def is_top_item(key: str, *items: str) -> dict:
    """Check if items are in the current top-K list."""
    results = r.topk().query(key, *items)
    return dict(zip(items, [bool(r) for r in results]))
```

## Tracking Trending Products

```python
from fastapi import FastAPI
import random

app = FastAPI()
TOPK_KEY = "topk:products:trending"

@app.on_event("startup")
def startup():
    init_topk(TOPK_KEY, k=20)

@app.post("/products/{product_id}/view")
def track_product_view(product_id: int):
    dropped = add_events(TOPK_KEY, f"product:{product_id}")
    return {"product_id": product_id, "dropped": dropped}

@app.get("/products/trending")
def trending_products():
    top_items = get_top_items_with_counts(TOPK_KEY)
    return {
        "trending": [
            {"product_id": k.replace("product:", ""), "views": v}
            for k, v in top_items.items()
        ]
    }
```

## Tracking Trending Search Queries

```python
TOPK_SEARCHES = "topk:searches"

def init_search_tracking():
    init_topk(TOPK_SEARCHES, k=50)

def track_search(query: str):
    # Normalize the query
    normalized = query.lower().strip()
    add_events(TOPK_SEARCHES, normalized)

def get_trending_searches(n: int = 10) -> list:
    items = get_top_items_with_counts(TOPK_SEARCHES)
    # Sort by count descending and take top N
    sorted_items = sorted(items.items(), key=lambda x: x[1], reverse=True)
    return [{"query": q, "count": c} for q, c in sorted_items[:n]]

# Usage
track_search("Redis tutorial")
track_search("Redis caching")
track_search("Redis tutorial")
print(get_trending_searches(5))
```

## Periodic Reset for Time-Window Trending

```python
import time

def time_windowed_topk(item: str, window_minutes: int = 60):
    window_key = f"topk:trending:{int(time.time() // (window_minutes * 60))}"
    try:
        r.topk().info(window_key)
    except Exception:
        r.topk().reserve(window_key, 20, 8, 7, 0.9)
        r.expire(window_key, window_minutes * 60 * 2)
    r.topk().add(window_key, item)

def get_current_trending() -> list:
    window_key = f"topk:trending:{int(time.time() // 3600)}"
    try:
        return r.topk().list(window_key)
    except Exception:
        return []
```

## Summary

Redis Top-K provides memory-efficient identification of heavy hitter items in high-volume streams using the HeavyKeeper algorithm. `TOPK.ADD` automatically maintains the top-K list as new items arrive, evicting items that fall below the threshold. Combining time-windowed Top-K keys with TTL expiry gives you accurate real-time trending detection.
