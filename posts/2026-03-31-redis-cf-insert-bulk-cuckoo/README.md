# How to Use CF.INSERT and CF.INSERTNX in Redis for Bulk Cuckoo Filter Adds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, Probabilistic Data Structure

Description: Learn how to use CF.INSERT and CF.INSERTNX in Redis to bulk-add items to Cuckoo filters with optional auto-creation and no-duplicate semantics.

---

`CF.INSERT` and `CF.INSERTNX` are batch insertion commands for Redis Cuckoo filters. They allow you to add multiple items in a single round-trip, with options for auto-creating the filter and controlling duplicate behavior. This makes them more efficient than calling `CF.ADD` repeatedly.

## CF.INSERT - Bulk Insert with Auto-Create

```text
CF.INSERT key [CAPACITY capacity] [NOCREATE] ITEMS item [item ...]
```

```bash
# Insert multiple items, auto-creating the filter if it doesn't exist
127.0.0.1:6379> CF.INSERT product:seen CAPACITY 100000 ITEMS "SKU-001" "SKU-002" "SKU-003"
1) (integer) 1
2) (integer) 1
3) (integer) 1
```

Each returned value: `1` = successfully inserted. Since Cuckoo filters allow duplicates, `CF.INSERT` always returns `1` for each item (unless the filter is full, in which case `-1` is returned).

## CF.INSERTNX - Insert Only If Not Existing

`CF.INSERTNX` skips items that are already likely in the filter, returning `0` for them instead of re-inserting:

```bash
127.0.0.1:6379> CF.INSERTNX product:seen CAPACITY 100000 ITEMS "SKU-001" "SKU-004"
1) (integer) 0
2) (integer) 1
```

- `SKU-001` was already present - returns `0`, not re-inserted
- `SKU-004` is new - returns `1`, inserted

## Using NOCREATE

Prevent auto-creation if the filter does not exist:

```bash
127.0.0.1:6379> CF.INSERT nonexistent:filter NOCREATE ITEMS "item1"
(error) ERR not found
```

## Python Example: Batch Processing with CF.INSERT

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def bulk_add_to_cuckoo(key: str, items: list,
                        capacity: int = 100000) -> dict:
    """Add a batch of items to a Cuckoo filter and return results."""
    args = ["CF.INSERT", key, "CAPACITY", capacity, "ITEMS"] + items
    results = r.execute_command(*args)
    return {item: bool(result) for item, result in zip(items, results)}

# Batch insert product IDs
products = [f"PROD-{i:04d}" for i in range(1, 11)]
outcome = bulk_add_to_cuckoo("product:catalog", products)

newly_added = [k for k, v in outcome.items() if v]
print(f"Newly added: {newly_added}")
```

## Python Example: Deduplication with CF.INSERTNX

```python
import redis
from typing import List, Tuple

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def insert_unique(key: str, items: List[str],
                  capacity: int = 500000) -> Tuple[List[str], List[str]]:
    """
    Insert items only if not already present.
    Returns (new_items, duplicate_items).
    """
    args = ["CF.INSERTNX", key, "CAPACITY", capacity, "ITEMS"] + items
    results = r.execute_command(*args)
    new_items = [item for item, r_ in zip(items, results) if r_ == 1]
    duplicates = [item for item, r_ in zip(items, results) if r_ == 0]
    return new_items, duplicates

events = ["evt:001", "evt:002", "evt:001", "evt:003", "evt:002"]
new, dupes = insert_unique("events:processed", events)
print(f"New events: {new}")
print(f"Likely duplicates: {dupes}")
```

## CF.INSERT vs CF.ADD

| Feature | CF.ADD | CF.INSERT |
|---|---|---|
| Batch support | No (one item) | Yes (multiple items) |
| Auto-create filter | Yes (default capacity) | Yes (with CAPACITY param) |
| Custom capacity | No | Yes |
| NX variant | CF.ADDNX | CF.INSERTNX |

## Performance Comparison

```python
import time
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
items = [f"item:{i}" for i in range(1000)]

# Slow: individual CF.ADD calls
start = time.time()
for item in items:
    r.execute_command("CF.ADD", "test:single", item)
print(f"Individual adds: {time.time() - start:.3f}s")

# Fast: single CF.INSERT call
start = time.time()
r.execute_command("CF.INSERT", "test:bulk", "CAPACITY", 10000, "ITEMS", *items)
print(f"Bulk insert: {time.time() - start:.3f}s")
```

## Summary

`CF.INSERT` and `CF.INSERTNX` enable efficient batch operations on Redis Cuckoo filters. `CF.INSERT` auto-creates the filter with a specified capacity and adds all items, while `CF.INSERTNX` avoids re-inserting existing items. Both commands reduce round-trips and are the recommended approach when loading multiple items into a Cuckoo filter at once.
