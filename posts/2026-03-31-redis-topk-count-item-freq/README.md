# How to Use TOPK.COUNT in Redis to Get Top-K Item Counts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Top-K, Probabilistic Data Structure

Description: Learn how to use TOPK.COUNT in Redis to retrieve the estimated frequency count for specific items tracked in a Top-K structure.

---

`TOPK.COUNT` retrieves the estimated frequency counts for one or more items in a Redis Top-K structure. While `TOPK.LIST` shows you which items are in the top K, `TOPK.COUNT` lets you query the frequency of any specific item - whether or not it is currently ranked in the top K.

## Basic Syntax

```text
TOPK.COUNT key item [item ...]
```

Returns an array of estimated counts. The count is an approximation - the Top-K structure uses probabilistic algorithms, so counts may be slightly under-estimated but will never be higher than the real count.

## Basic Example

```bash
# Setup
127.0.0.1:6379> TOPK.RESERVE trending:pages 5
OK
127.0.0.1:6379> TOPK.INCRBY trending:pages "/home" 500 "/products" 300 "/about" 100 "/contact" 50
1) (nil)
2) (nil)
3) (nil)
4) (nil)

# Query counts for specific items
127.0.0.1:6379> TOPK.COUNT trending:pages "/home" "/products" "/about"
1) (integer) 500
2) (integer) 300
3) (integer) 100
```

## Querying Items Not in Top K

```bash
# "/contact" has 50 views - may or may not be in top 5
127.0.0.1:6379> TOPK.COUNT trending:pages "/contact" "/nonexistent"
1) (integer) 50
2) (integer) 0
```

Items not tracked at all return 0.

## Python Example: Building a Frequency Dashboard

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Setup a Top-10 structure for API endpoint tracking
r.execute_command("TOPK.RESERVE", "api:endpoints", 10)

# Simulate API traffic
traffic = {
    "/api/users":    1200,
    "/api/orders":    800,
    "/api/products":  600,
    "/api/auth":      400,
    "/api/search":    350,
    "/api/cart":      200,
    "/api/checkout":  150,
    "/api/profile":   100,
}

args = []
for endpoint, count in traffic.items():
    args.extend([endpoint, count])
r.execute_command("TOPK.INCRBY", "api:endpoints", *args)

# Query specific endpoint counts
endpoints_to_check = ["/api/users", "/api/orders", "/api/unknown"]
counts = r.execute_command("TOPK.COUNT", "api:endpoints", *endpoints_to_check)

print("Endpoint Frequencies:")
for endpoint, count in zip(endpoints_to_check, counts):
    print(f"  {endpoint}: {count:,} requests")
```

## Comparing Items Side by Side

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def compare_item_frequencies(key: str, items: list) -> list:
    """Return items sorted by their estimated frequency, descending."""
    counts = r.execute_command("TOPK.COUNT", key, *items)
    paired = list(zip(items, counts))
    return sorted(paired, key=lambda x: x[1], reverse=True)

r.execute_command("TOPK.RESERVE", "product:clicks", 5)
r.execute_command("TOPK.INCRBY", "product:clicks",
                  "Laptop", 980, "Mouse", 750, "Keyboard", 650,
                  "Monitor", 400, "Webcam", 200)

ranking = compare_item_frequencies(
    "product:clicks",
    ["Laptop", "Mouse", "Keyboard", "Monitor", "Webcam"]
)
for rank, (item, count) in enumerate(ranking, start=1):
    print(f"  #{rank}: {item} - {count} clicks")
```

## TOPK.COUNT vs TOPK.LIST

| Command | What It Returns |
|---|---|
| `TOPK.LIST` | The current top K item names (ranked list) |
| `TOPK.LIST WITHCOUNT` | Top K items with their counts |
| `TOPK.COUNT` | Estimated count for any specified item(s) |

Use `TOPK.COUNT` when you need to query specific items by name, especially items that might have fallen out of the top K but whose frequency you still want to verify.

## Summary

`TOPK.COUNT` provides estimated frequency lookups for individual items in a Redis Top-K structure. It's useful for spot-checking item frequencies, building comparison dashboards, and verifying how close an item is to entering or re-entering the top K. Since the counts are probabilistic estimates, they will never exceed the actual count but may be slightly lower, providing a reliable lower bound on actual frequencies.
