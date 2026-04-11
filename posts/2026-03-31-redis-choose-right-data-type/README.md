# How to Choose the Right Redis Data Type for Your Use Case

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Type, Performance, Architecture, Cache

Description: A practical guide to choosing between Redis strings, hashes, lists, sets, sorted sets, and streams based on your access patterns and memory requirements.

---

Choosing the wrong Redis data type can result in poor performance, wasted memory, or complex application code. Each data type is optimized for specific access patterns. This guide maps common use cases to the best-fit data type.

## The Decision Framework

Ask three questions:
1. What shape does the data have? (scalar, object, ordered list, unique collection, scored collection, log)
2. What operations do you need? (point lookup, range scan, membership test, push/pop)
3. What are the cardinality and size constraints?

## Quick Reference Table

| Use Case | Best Type | Why |
|----------|-----------|-----|
| Caching a single value | String | Simple GET/SET |
| Storing object attributes | Hash | Single key, partial updates |
| Job queue / activity feed | List | O(1) push/pop from ends |
| Unique member collection | Set | O(1) add/membership |
| Leaderboard / priority queue | Sorted Set | Ordered by score |
| Event log with consumer groups | Stream | Append-only with ACK |
| Unique visitor count (approx) | HyperLogLog | 12KB regardless of cardinality |
| Dense boolean flags | Bitmap (String) | 1 bit per flag |
| Nearby location search | Geo (Sorted Set) | Geohash-encoded scores |

## String: The Workhorse

Use strings for simple scalable values and as a foundation for counters and locks:

```bash
# Cache a serialized object
SET user:123:profile '{"name":"Alice","tier":"pro"}' EX 3600

# Atomic counter
INCR page:home:views

# Distributed lock with expiry
SET lock:job_42 worker_1 NX PX 30000
```

## Hash: Objects with Multiple Attributes

Use hashes when you need partial reads or updates on object fields:

```bash
HSET product:99 name "Widget" price 9.99 stock 200
HGET product:99 price        # Partial read
HINCRBY product:99 stock -1  # Partial update
```

Hashes stored as listpack use significantly less memory than separate string keys for the same data.

## List: Ordered Collections with Push/Pop

Use lists when order matters and you access elements from the ends:

```bash
# Task queue
LPUSH jobs '{"type":"send_email","to":"user@example.com"}'
BRPOP jobs 0   # Blocking dequeue

# Capped activity feed
LPUSH feed:user:42 "liked post 100"
LTRIM feed:user:42 0 99
```

## Set: Unique Membership

Use sets when you need unique membership and fast O(1) add/check, with support for intersections:

```bash
# Tag system
SADD tags:post:1 redis database backend
SISMEMBER tags:post:1 redis   # Fast membership test
SINTER tags:post:1 tags:post:2   # Find common tags
```

## Sorted Set: Ordered by Score

Use sorted sets when you need ordering, range queries, or priority:

```bash
# Leaderboard
ZADD scores 1500 alice 2300 bob 900 charlie
ZRANGE scores 0 2 REV WITHSCORES   # Top 3

# Sliding window rate limit
ZADD rate:user:1 1711880000 req1
ZREMRANGEBYSCORE rate:user:1 -inf 1711879970
ZCARD rate:user:1
```

## Stream: Append-Only Log

Use streams for event sourcing, message queues with consumer groups, or any append-only log:

```bash
XADD events "*" type "order_placed" order_id "ord_999"
XREADGROUP GROUP workers w1 COUNT 10 STREAMS events ">"
XACK events workers 1711880000000-0
```

## Making the Choice in Code

```python
import json
import redis

r = redis.Redis()

def cache_user(user_id, user_data):
    # Option A: String (JSON blob) - whole-object read/write
    r.set(f"user:{user_id}", json.dumps(user_data), ex=3600)

    # Option B: Hash - partial field access
    r.hset(f"user:{user_id}", mapping=user_data)
    r.expire(f"user:{user_id}", 3600)

# Use Hash when you only need one field frequently:
name_only = r.hget("user:123", "name")
```

## Summary

Redis data type selection is driven by access patterns: strings for simple scalars and counters, hashes for multi-attribute objects, lists for ordered queues, sets for unique collections, sorted sets for ranked data, and streams for append-only logs. Always prototype with the simplest type first, then benchmark under realistic load before optimizing.
