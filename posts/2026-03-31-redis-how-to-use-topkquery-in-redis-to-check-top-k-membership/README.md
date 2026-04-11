# How to Use TOPK.QUERY in Redis to Check Top-K Membership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Top-K, Heavy Hitter, Membership Query

Description: Learn how to use TOPK.QUERY in Redis to check whether specific items are currently in the Top-K most frequent items list.

---

## What Is TOPK.QUERY?

`TOPK.QUERY` checks whether one or more items are currently in the Top-K list of a Redis Top-K structure. It returns 1 (true) for each item that is in the current Top-K, and 0 (false) for items that are not.

This is useful for quickly determining if a specific item is trending or currently among the most frequent elements, without retrieving the full list.

## Syntax

```text
TOPK.QUERY key item [item ...]
```

Returns an array of integers: 1 if the item is in Top-K, 0 if it is not.

## Basic Usage

```bash
# Set up Top-K
TOPK.RESERVE trending 5
TOPK.ADD trending "redis" "python" "docker" "redis" "kubernetes"
TOPK.ADD trending "redis" "python" "redis" "python" "docker"

# Check if specific items are in Top-5
TOPK.QUERY trending "redis"
# Returns: 1) (integer) 1   (yes, redis is in top 5)

TOPK.QUERY trending "java"
# Returns: 1) (integer) 0   (no, java is not in top 5)

# Check multiple items at once
TOPK.QUERY trending "redis" "python" "java" "docker"
# 1) (integer) 1   - redis: YES
# 2) (integer) 1   - python: YES
# 3) (integer) 0   - java: NO
# 4) (integer) 1   - docker: YES
```

## Trending Content Check

Use TOPK.QUERY to decide how to display content:

```bash
TOPK.RESERVE articles:trending 10

# Add article view events
TOPK.ADD articles:trending "article:1" "article:2" "article:1" "article:3"
TOPK.ADD articles:trending "article:1" "article:2" "article:4" "article:1"

# Before rendering a page, check if an article is trending
TOPK.QUERY articles:trending "article:1"
# Returns: 1 - show trending badge

TOPK.QUERY articles:trending "article:99"
# Returns: 0 - no trending badge
```

## Python Example: Content Recommendation

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def is_trending(key: str, item: str) -> bool:
    """Check if a single item is in the Top-K list."""
    result = r.execute_command("TOPK.QUERY", key, item)
    return result[0] == 1

def which_are_trending(key: str, items: list) -> dict:
    """Check multiple items and return dict of {item: is_trending}."""
    if not items:
        return {}
    results = r.execute_command("TOPK.QUERY", key, *items)
    return {item: bool(result) for item, result in zip(items, results)}

# Setup
r.execute_command("TOPK.RESERVE", "products:trending", 5)
products = ["laptop", "headphones", "mouse", "keyboard", "monitor"]
for _ in range(50):
    r.execute_command("TOPK.ADD", "products:trending", "laptop")
    r.execute_command("TOPK.ADD", "products:trending", "headphones")

r.execute_command("TOPK.ADD", "products:trending", "mouse", "mouse", "mouse")

# Check which products to show as trending
catalog_products = ["laptop", "headphones", "tablet", "mouse", "cable"]
trending_status = which_are_trending("products:trending", catalog_products)

for product, trending in trending_status.items():
    badge = " [TRENDING]" if trending else ""
    print(f"{product}{badge}")
```

## Feature Flag Based on Trending Status

```python
def render_product_page(product_id: str) -> dict:
    """Render product page with trending indicator if applicable."""
    is_hot = is_trending("products:trending", product_id)

    return {
        "product_id": product_id,
        "show_trending_badge": is_hot,
        "show_hot_deal_banner": is_hot,
        "priority_placement": is_hot
    }

page = render_product_page("laptop")
print(page)
# {'product_id': 'laptop', 'show_trending_badge': True, ...}
```

## QUERY vs LIST for Different Use Cases

| Operation | Use Case |
|-----------|----------|
| TOPK.QUERY | Check if specific items are trending (O(n) where n = items queried) |
| TOPK.LIST | Get the full ranked list of all top items (O(K)) |

```bash
# Use QUERY when you already know the items to check
TOPK.QUERY trending "item:1" "item:2" "item:5"

# Use LIST when you need to discover what's trending
TOPK.LIST trending
```

## Batch Checking for API Responses

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/api/products/trending-check", methods=["POST"])
def check_trending():
    product_ids = request.json.get("product_ids", [])
    if not product_ids:
        return jsonify({"error": "No product IDs provided"}), 400

    results = r.execute_command("TOPK.QUERY", "products:topk", *product_ids)
    trending_map = {pid: bool(result) for pid, result in zip(product_ids, results)}

    return jsonify({"trending": trending_map})
```

## Summary

`TOPK.QUERY` provides O(n) membership testing (where n is the number of items queried) for Redis Top-K structures, returning 1 for items currently in the Top-K and 0 for those that are not. It is ideal for adding trending indicators to UI components, implementing personalization logic, and making routing decisions based on item popularity. Query multiple items in a single call for efficiency, and use `TOPK.LIST` when you need to discover all top items rather than check specific ones.
