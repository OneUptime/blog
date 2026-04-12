# How to Use ZINTERSTORE in Redis to Store Sorted Set Intersections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZINTERSTORE, Intersection, Command

Description: Learn how to use ZINTERSTORE in Redis to compute the intersection of multiple sorted sets and store results with aggregate score options.

---

## What Is ZINTERSTORE

`ZINTERSTORE` computes the intersection of multiple sorted sets and stores the result in a destination key. Only members present in ALL input sets are included. Scores can be aggregated using SUM (default), MIN, or MAX. Weights can be applied to each set's scores before aggregation.

## Syntax

```text
ZINTERSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
```

- `destination` - where the result is stored
- `numkeys` - number of input keys
- `key [key ...]` - sorted set keys to intersect
- `WEIGHTS` - multiply each set's scores by the given weight before aggregation
- `AGGREGATE SUM|MIN|MAX` - how to combine scores (default: SUM)

Returns the number of elements in the destination sorted set.

## Basic Usage

### Simple Intersection

```bash
redis-cli ZADD set1 1 "a" 2 "b" 3 "c"
redis-cli ZADD set2 10 "b" 20 "c" 30 "d"

redis-cli ZINTERSTORE dest 2 set1 set2
```

```text
(integer) 2
```

`b` and `c` are in both sets. Scores are summed: `b` = 2+10 = 12, `c` = 3+20 = 23.

```bash
redis-cli ZRANGE dest 0 -1 WITHSCORES
```

```text
1) "b"
2) "12"
3) "c"
4) "23"
```

### AGGREGATE MIN

Keep the lower score from each set:

```bash
redis-cli ZINTERSTORE dest_min 2 set1 set2 AGGREGATE MIN
redis-cli ZRANGE dest_min 0 -1 WITHSCORES
```

```text
1) "b"
2) "2"
3) "c"
4) "3"
```

### AGGREGATE MAX

Keep the higher score:

```bash
redis-cli ZINTERSTORE dest_max 2 set1 set2 AGGREGATE MAX
redis-cli ZRANGE dest_max 0 -1 WITHSCORES
```

```text
1) "b"
2) "10"
3) "c"
4) "20"
```

### WEIGHTS

Multiply set scores by weights before aggregating:

```bash
redis-cli ZINTERSTORE dest_weighted 2 set1 set2 WEIGHTS 2 0.5
redis-cli ZRANGE dest_weighted 0 -1 WITHSCORES
```

For `b`: (2 * 2) + (10 * 0.5) = 4 + 5 = 9
For `c`: (3 * 2) + (20 * 0.5) = 6 + 10 = 16

```text
1) "b"
2) "9"
3) "c"
4) "16"
```

## Practical Examples

### Users Active on Multiple Platforms

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Users active on each platform (score = activity score)
r.zadd('active:web', {'user:1': 85, 'user:2': 60, 'user:3': 90, 'user:4': 70})
r.zadd('active:mobile', {'user:1': 75, 'user:3': 80, 'user:5': 95})
r.zadd('active:desktop', {'user:1': 50, 'user:3': 70, 'user:6': 65})

# Users active on ALL platforms - sum their activity scores
count = r.zinterstore('active:all_platforms', ['active:web', 'active:mobile', 'active:desktop'])
print(f"Users on all platforms: {count}")

users = r.zrange('active:all_platforms', 0, -1, withscores=True)
print(f"Active users: {users}")
# [('user:1', 210.0), ('user:3', 240.0)]
```

### Collaborative Filtering - Shared Preferences

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Items rated by each user (score = rating)
r.zadd('ratings:alice', {'item:1': 5, 'item:2': 3, 'item:3': 4, 'item:4': 2})
r.zadd('ratings:bob', {'item:1': 4, 'item:3': 5, 'item:5': 3})

# Items both users rated - use MIN to find the lower (consensus) rating
r.zinterstore('common_ratings', ['ratings:alice', 'ratings:bob'], aggregate='MIN')

common = r.zrange('common_ratings', 0, -1, withscores=True)
print(f"Commonly rated items: {common}")
# [('item:1', 4.0), ('item:3', 4.0)]
```

### Combined Scoring - Weighted Relevance

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Article scores by different signals
r.zadd('articles:views', {'art:1': 1000, 'art:2': 500, 'art:3': 750})
r.zadd('articles:likes', {'art:1': 200, 'art:2': 150, 'art:3': 80})
r.zadd('articles:recency', {'art:1': 0.8, 'art:2': 0.9, 'art:3': 0.5})

# Combine: views * 0.4 + likes * 0.4 + recency * 100
r.zinterstore('articles:ranked',
              {'articles:views': 0.4, 'articles:likes': 0.4, 'articles:recency': 100},
              aggregate='SUM')

ranked = r.zrange('articles:ranked', 0, -1, withscores=True, desc=True)
print(f"Top articles: {ranked}")
```

### Mutual Followers on Social Platform

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Users Alice follows (score = follow timestamp)
r.zadd('following:alice', {'bob': 1000, 'charlie': 1001, 'dave': 1002})
# Users Bob follows
r.zadd('following:bob', {'alice': 999, 'charlie': 1003, 'eve': 1004})

# Mutual: users both Alice and Bob follow
r.zinterstore('mutual:alice:bob', ['following:alice', 'following:bob'])
mutuals = r.zrange('mutual:alice:bob', 0, -1)
print(f"Mutual follows: {mutuals}")  # ['charlie']
```

## Summary

`ZINTERSTORE` intersects multiple sorted sets and stores only members common to all input sets, with flexible score aggregation via SUM, MIN, or MAX, and per-set weight multipliers. It enables multi-signal ranking, cross-platform activity analysis, and collaborative filtering directly in Redis. Use `AGGREGATE MIN` for consensus scoring and `WEIGHTS` for weighted combination of different signal scales.
