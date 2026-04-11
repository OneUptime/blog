# How to Use BF.INSERT in Redis for Auto-Creating Bloom Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, Probabilistic Data Structure

Description: Learn how to use BF.INSERT in Redis to add items to a Bloom filter with auto-creation, custom capacity, and error rate in a single command.

---

`BF.INSERT` is a powerful Redis command that combines filter creation and item insertion into a single atomic operation. Unlike `BF.ADD`, which also auto-creates filters but only with module-level defaults, `BF.INSERT` can create the filter on the fly using custom parameters you specify inline. This makes it ideal for scenarios where you want to lazily initialize filters with specific capacity and error rate settings without a separate `BF.RESERVE` step.

## Basic Syntax

```text
BF.INSERT key [CAPACITY capacity] [ERROR error] [EXPANSION expansion]
  [NOCREATE] [NONSCALING] ITEMS item [item ...]
```

- `CAPACITY` - Expected number of unique items (default: 100)
- `ERROR` - Desired false positive rate (default: 0.01 = 1%)
- `NOCREATE` - Return an error if the filter does not already exist
- `NONSCALING` - Disable auto-expansion when the filter is full

## Auto-Creating a Filter on First Use

```bash
# Create filter and add items in one command
127.0.0.1:6379> BF.INSERT user:emails CAPACITY 50000 ERROR 0.001 ITEMS alice@example.com bob@example.com charlie@example.com
1) (integer) 1
2) (integer) 1
3) (integer) 1
```

Each returned `1` means the item was newly added. A `0` would mean the item was likely already present.

## Using NOCREATE to Require Pre-Existing Filters

If you want to ensure you only insert into filters that have already been provisioned (to avoid accidental creation with default settings), use `NOCREATE`:

```bash
127.0.0.1:6379> BF.INSERT user:emails NOCREATE ITEMS dave@example.com
1) (integer) 1

127.0.0.1:6379> BF.INSERT nonexistent:filter NOCREATE ITEMS test@example.com
(error) ERR not found
```

## Python Example: Lazy Filter Initialization

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def track_seen_event(event_id: str, filter_key: str = "events:seen") -> bool:
    """
    Add an event to the Bloom filter, auto-creating it with custom params.
    Returns True if the item is new, False if likely already seen.
    """
    results = r.execute_command(
        "BF.INSERT", filter_key,
        "CAPACITY", 100000,
        "ERROR", 0.005,
        "ITEMS", event_id
    )
    return results[0] == 1

# First time seeing event
print(track_seen_event("evt:abc123"))  # True
# Duplicate event
print(track_seen_event("evt:abc123"))  # False (likely seen)
```

## Bulk Insert with Mixed Results

```bash
# Some items new, some already present
127.0.0.1:6379> BF.INSERT user:emails CAPACITY 50000 ERROR 0.001 ITEMS alice@example.com newuser@example.com
1) (integer) 0
2) (integer) 1
```

## When to Use BF.INSERT vs BF.ADD

| Scenario | Recommended Command |
|---|---|
| Need custom capacity/error rate | `BF.INSERT` |
| Simple single-item add to existing filter | `BF.ADD` |
| Batch add to existing filter | `BF.MADD` |
| Guarantee filter exists before insert | `BF.INSERT` with `NOCREATE` |

## Practical Use Case: Deduplication Pipeline

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def process_event(event_id: str) -> None:
    results = r.execute_command(
        "BF.INSERT", "pipeline:seen",
        "CAPACITY", 1000000,
        "ERROR", 0.001,
        "NONSCALING",
        "ITEMS", event_id
    )
    if results[0] == 1:
        print(f"New event {event_id}, processing...")
        # send to downstream system
    else:
        print(f"Duplicate event {event_id}, skipping.")

process_event("order:1001")
process_event("order:1001")
process_event("order:1002")
```

`NONSCALING` prevents the filter from expanding past its initial capacity, which gives you predictable memory usage. Once the filter reaches capacity, additional insert attempts will return an error.

## Summary

`BF.INSERT` simplifies Bloom filter workflows by combining creation and insertion into one command. It supports custom capacity, error rates, and expansion settings, making it the most flexible command for initializing and populating Bloom filters. Use `NOCREATE` when you want strict control over filter lifecycle and `NONSCALING` when you need predictable memory usage.
