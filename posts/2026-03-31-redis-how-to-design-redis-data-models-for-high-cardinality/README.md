# How to Design Redis Data Models for High Cardinality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Modeling, High Cardinality, Performance, Memory Optimization

Description: Learn how to design efficient Redis data models when dealing with high cardinality datasets, avoiding memory bloat and performance pitfalls.

---

## Understanding High Cardinality in Redis

High cardinality refers to datasets with many unique values - millions of users, billions of events, or thousands of unique metric labels. Redis data models that work fine at small scale can collapse under high cardinality due to memory explosion, slow operations, or hitting key-count limits.

The key challenge: Redis stores each unique key with metadata overhead (around 50-100 bytes per key). A naive model that creates one key per entity quickly becomes a memory problem at scale.

## Anti-Pattern: One Key Per Entity

Avoid this approach with high cardinality:

```bash
# BAD: creates millions of keys
SET user:1001:name "Alice"
SET user:1001:email "alice@example.com"
SET user:1001:score "150"
SET user:1002:name "Bob"
# ... for 10 million users, this is 30 million keys
```

Each key adds ~50 bytes of overhead. 30 million keys = 1.5 GB just in key overhead.

## Pattern 1: Hash-Based Grouping

Group related fields into hashes to reduce key count dramatically.

```bash
# GOOD: one hash per user
HSET user:1001 name "Alice" email "alice@example.com" score "150"
HSET user:1002 name "Bob" email "bob@example.com" score "200"
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store user data efficiently
def set_user(user_id, data):
    r.hset(f"user:{user_id}", mapping=data)

# Retrieve specific fields without loading everything
def get_user_score(user_id):
    return r.hget(f"user:{user_id}", 'score')

# Batch operations
pipeline = r.pipeline()
for i in range(1000):
    pipeline.hset(f"user:{i}", mapping={'name': f'User{i}', 'score': str(i * 10)})
pipeline.execute()
```

## Pattern 2: Hash Bucketing for Extreme Cardinality

When you have tens of millions of entities, even one key per entity is too many. Use hash buckets to group multiple entities into one key.

```python
HASH_BUCKET_SIZE = 100

def get_bucket_key(entity_id):
    bucket = int(entity_id) // HASH_BUCKET_SIZE
    return f"users:bucket:{bucket}"

def get_field_name(entity_id):
    return str(entity_id)

def set_user_score(user_id, score):
    bucket_key = get_bucket_key(user_id)
    field = get_field_name(user_id)
    r.hset(bucket_key, field, score)

def get_user_score(user_id):
    bucket_key = get_bucket_key(user_id)
    field = get_field_name(user_id)
    return r.hget(bucket_key, field)

# 10 million users = 100,000 hash keys instead of 10 million string keys
# Redis uses memory-efficient listpack encoding for hashes with fewer entries than hash-max-listpack-entries (default 512)
```

Redis automatically uses a memory-efficient listpack encoding (called ziplist in older versions) for small hashes, making this pattern extremely memory-efficient when bucket sizes stay below the `hash-max-listpack-entries` threshold.

## Pattern 3: Sorted Sets for Ranked High-Cardinality Data

Leaderboards, rate limiting, and time-series bucketing with many entries.

```python
def record_page_view(page_id, user_id, timestamp):
    # Store views per page - sorted by timestamp
    r.zadd(f"views:{page_id}", {user_id: timestamp})

def get_recent_viewers(page_id, count=100):
    # Get most recent viewers
    cutoff = time.time() - 3600  # Last hour
    return r.zrangebyscore(f"views:{page_id}", cutoff, '+inf', withscores=True)

def count_unique_viewers(page_id, start, end):
    return r.zcount(f"views:{page_id}", start, end)
```

For very high cardinality with approximate counting, use HyperLogLog:

```bash
# Count unique visitors - uses only 12KB regardless of cardinality
PFADD daily-visitors:2024-01-15 user:1001 user:1002 user:9999999
PFCOUNT daily-visitors:2024-01-15
# Returns approximate count with <1% error
```

```python
def track_unique_visitor(date_str, user_id):
    r.pfadd(f"visitors:{date_str}", user_id)

def get_unique_visitor_count(date_str):
    return r.pfcount(f"visitors:{date_str}")

# Merge multiple days
def get_weekly_unique_visitors(dates):
    keys = [f"visitors:{d}" for d in dates]
    r.pfmerge('visitors:week', *keys)
    return r.pfcount('visitors:week')
```

## Pattern 4: Time-Series Bucketing

Instead of one key per time point, bucket time series data to reduce key count.

```python
import time

def get_time_bucket(timestamp, bucket_seconds=3600):
    """Floor timestamp to bucket boundary"""
    return int(timestamp // bucket_seconds) * bucket_seconds

def record_metric(metric_name, value, timestamp=None):
    ts = timestamp or time.time()
    bucket = get_time_bucket(ts)
    field = str(int(ts))  # Second-level precision as field

    # One hash per metric per hour - max 3600 fields per hash
    r.hset(f"metric:{metric_name}:{bucket}", field, value)
    # Set TTL on old buckets
    r.expire(f"metric:{metric_name}:{bucket}", 86400 * 30)

def get_metric_range(metric_name, start_ts, end_ts):
    results = []
    bucket = get_time_bucket(start_ts)
    while bucket <= end_ts:
        key = f"metric:{metric_name}:{bucket}"
        data = r.hgetall(key)
        for ts_str, val in data.items():
            ts = int(ts_str)
            if start_ts <= ts <= end_ts:
                results.append((ts, float(val)))
        bucket += 3600
    return sorted(results)
```

## Pattern 5: Bitmap Indexes for Boolean High-Cardinality

Track which users have a property using bitmaps - 1 bit per user.

```python
def mark_user_active(user_id, date_str):
    r.setbit(f"active:{date_str}", user_id, 1)

def is_user_active(user_id, date_str):
    return r.getbit(f"active:{date_str}", user_id)

def count_active_users(date_str):
    return r.bitcount(f"active:{date_str}")

# Find users active on both Monday and Tuesday (bitwise AND)
def find_users_active_both_days(date1, date2):
    result_key = f"active:intersection:{date1}:{date2}"
    r.bitop('AND', result_key, f"active:{date1}", f"active:{date2}")
    r.expire(result_key, 300)  # Cache for 5 minutes
    return r.bitcount(result_key)

# 10 million users = 10 million bits = 1.25 MB per day
```

## Memory Configuration for High Cardinality

```bash
# redis.conf settings for high cardinality workloads

# Hash encoding thresholds - keep small for listpack savings
hash-max-listpack-entries 128
hash-max-listpack-value 64

# Sorted set thresholds
zset-max-listpack-entries 128
zset-max-listpack-value 64

# Enable active defragmentation for long-running high-cardinality workloads
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
```

## Monitoring Memory Efficiency

```bash
# Check memory usage of a specific key
MEMORY USAGE user:1001

# Get memory statistics
INFO memory

# Sample random keys to find memory hogs
redis-cli --hotkeys
redis-cli --bigkeys
```

```python
def audit_key_memory(pattern, sample_size=100):
    keys = r.scan_iter(pattern, count=sample_size)
    total_bytes = 0
    count = 0
    for key in keys:
        total_bytes += r.memory_usage(key) or 0
        count += 1
        if count >= sample_size:
            break
    return {'avg_bytes': total_bytes / count if count else 0, 'sampled': count}
```

## Summary

High cardinality Redis data models require moving from one-key-per-entity patterns to hash grouping, bucketing, and purpose-built data structures like HyperLogLog and bitmaps. The most impactful change is usually hash bucketing for entity stores and HyperLogLog for unique counting, which can reduce memory by 10-100x compared to naive string key approaches. Always benchmark with `MEMORY USAGE` and monitor `INFO memory` to catch encoding transitions that can cause unexpected memory growth.
