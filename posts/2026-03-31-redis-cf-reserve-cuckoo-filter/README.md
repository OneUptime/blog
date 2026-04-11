# How to Use CF.RESERVE in Redis to Create a Cuckoo Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, Probabilistic Data Structure

Description: Learn how to use CF.RESERVE in Redis to create a Cuckoo filter with custom capacity, bucket size, and expansion settings for efficient membership testing.

---

A Cuckoo filter is a probabilistic data structure similar to a Bloom filter, but with a key advantage: it supports deletions. `CF.RESERVE` lets you create a Cuckoo filter in Redis with precise control over capacity, bucket size, and expansion behavior - allowing you to tune it for your specific workload.

## Basic Syntax

```text
CF.RESERVE key capacity [BUCKETSIZE bucketsize] [MAXITERATIONS maxiterations] [EXPANSION expansion]
```

- `capacity` - Approximate number of items the filter can hold
- `BUCKETSIZE` - Number of items per bucket (default: 2, max: 255)
- `MAXITERATIONS` - Max number of attempts to swap items during insertion (default: 20)
- `EXPANSION` - Expansion rate when the filter is full (default: 1, meaning each new sub-filter equals the initial size)

## Creating a Basic Cuckoo Filter

```bash
# Create a Cuckoo filter for 100,000 items
127.0.0.1:6379> CF.RESERVE url:seen 100000
OK
```

## Creating a Filter with Custom Parameters

```bash
# Custom parameters for specific workload tuning
127.0.0.1:6379> CF.RESERVE product:ids 500000 BUCKETSIZE 4 MAXITERATIONS 30 EXPANSION 2
OK
```

With Redis's 1-byte fingerprints, the false positive rate increases linearly with bucket size. A `BUCKETSIZE` of 2 (the default) gives a typical false positive rate around 1.5%, while a `BUCKETSIZE` of 4 gives around 3%.

## Disabling Expansion

If you want a fixed-size filter that never grows (returning an error instead of expanding), set `EXPANSION` to `0`:

```bash
127.0.0.1:6379> CF.RESERVE session:tokens 200000 EXPANSION 0
OK
```

## Python Example: Creating Filters for Different Use Cases

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def create_cuckoo_filter(key: str, capacity: int,
                          bucket_size: int = 2,
                          expansion: int = 1) -> None:
    """Create a Cuckoo filter with given settings."""
    try:
        r.execute_command(
            "CF.RESERVE", key,
            capacity,
            "BUCKETSIZE", bucket_size,
            "EXPANSION", expansion
        )
        print(f"Created filter '{key}' with capacity {capacity}")
    except redis.ResponseError as e:
        if "item exists" in str(e):
            print(f"Filter '{key}' already exists")
        else:
            raise

# High-accuracy filter for email deduplication
create_cuckoo_filter("email:seen", capacity=1_000_000, bucket_size=4)

# Fixed-size filter for session tokens (no expansion)
create_cuckoo_filter("session:active", capacity=500_000, expansion=0)

# Default settings for quick prototyping
create_cuckoo_filter("test:filter", capacity=10_000)
```

## Cuckoo Filter vs Bloom Filter

| Feature | Bloom Filter | Cuckoo Filter |
|---|---|---|
| Supports deletion | No | Yes |
| False positive rate | Configurable | ~1-3% (depends on bucket size) |
| Memory efficiency | Better at low FPR | Better at moderate FPR |
| Insertion speed | Faster | Slightly slower |

Use a Cuckoo filter when you need to remove items - for example, tracking active user sessions where logouts must be reflected immediately.

## Checking the Created Filter

```bash
127.0.0.1:6379> CF.INFO url:seen
 1) Size
 2) (integer) 8192
 3) Number of buckets
 4) (integer) 4096
 5) Number of filter
 6) (integer) 1
 7) Number of items inserted
 8) (integer) 0
 9) Number of items deleted
10) (integer) 0
11) Bucket size
12) (integer) 2
13) Expansion rate
14) (integer) 1
15) Max iteration
16) (integer) 20
```

## Summary

`CF.RESERVE` gives you fine-grained control over Cuckoo filter creation in Redis. By tuning `BUCKETSIZE`, `MAXITERATIONS`, and `EXPANSION`, you can balance memory usage, accuracy, and performance. Unlike Bloom filters, Cuckoo filters support item deletion, making them the right choice for use cases where membership can change over time.
