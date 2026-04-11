# How to Use ZDIFFSTORE in Redis to Store Sorted Set Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZDIFFSTORE, Set Difference, Command

Description: Learn how to use ZDIFFSTORE in Redis to compute the difference between multiple sorted sets and store the result in a destination key.

---

## What Is ZDIFFSTORE

`ZDIFFSTORE` computes the difference between multiple sorted sets and stores the result in a destination key. The result contains members from the first set that do not appear in any subsequent sets. The scores used are those from the first (reference) set.

## Syntax

```text
ZDIFFSTORE destination numkeys key [key ...]
```

- `destination` - the key where the result is stored
- `numkeys` - the number of input keys
- `key [key ...]` - sorted set keys; the first key is the base set; subsequent keys are subtracted

Returns an integer - the number of elements in the destination sorted set.

## Basic Usage

### Basic Set Difference

```bash
redis-cli ZADD zset1 1 "a" 2 "b" 3 "c" 4 "d"
redis-cli ZADD zset2 1 "b" 2 "d"

redis-cli ZDIFFSTORE result 2 zset1 zset2
```

```text
(integer) 2
```

The result contains `a` (score: 1) and `c` (score: 3) - elements in zset1 but not in zset2.

```bash
redis-cli ZRANGE result 0 -1 WITHSCORES
```

```text
1) "a"
2) "1"
3) "c"
4) "3"
```

### Subtract Multiple Sets

```bash
redis-cli ZADD zset3 1 "a"

redis-cli ZDIFFSTORE result2 3 zset1 zset2 zset3
```

```text
(integer) 1
```

Only `c` remains - `a` is in zset3, `b` and `d` are in zset2.

### Overwrite Existing Destination

If `destination` already exists, it is overwritten:

```bash
redis-cli ZDIFFSTORE result 2 zset1 zset2
redis-cli ZDIFFSTORE result 2 zset1 zset2  # Same result, key overwritten
```

## Practical Examples

### Find Users Who Didn't Complete a Step

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# All users who started signup (score = signup timestamp)
r.zadd('signup:started', {'user:1': 1000, 'user:2': 1001, 'user:3': 1002,
                           'user:4': 1003, 'user:5': 1004})

# Users who completed signup
r.zadd('signup:completed', {'user:1': 1010, 'user:3': 1015, 'user:5': 1020})

# Find users who started but did not complete
count = r.zdiffstore('signup:incomplete', ['signup:started', 'signup:completed'])
print(f"Incomplete signups: {count}")

incomplete = r.zrange('signup:incomplete', 0, -1, withscores=True)
print(f"Users: {incomplete}")
# [('user:2', 1001.0), ('user:4', 1003.0)]
```

### Content Recommendations - Exclude Already Seen

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# All articles scored by relevance
r.zadd('articles:all', {'art:1': 95, 'art:2': 88, 'art:3': 76,
                         'art:4': 92, 'art:5': 70})

# Articles user has already seen
r.zadd('user:42:seen', {'art:1': 1, 'art:3': 1})

# Unseen recommendations
count = r.zdiffstore('user:42:recommendations', ['articles:all', 'user:42:seen'])
recs = r.zrange('user:42:recommendations', 0, -1, withscores=True, desc=True)
print(f"Top recommendations: {recs}")
# [('art:4', 92.0), ('art:2', 88.0), ('art:5', 70.0)]
```

### Subscription Management - Find Unsubscribed Users

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# All users scored by registration date
r.zadd('users:all', {'user:a': 20240101, 'user:b': 20240102,
                     'user:c': 20240103, 'user:d': 20240104})

# Users subscribed to newsletter
r.zadd('newsletter:subscribed', {'user:a': 1, 'user:c': 1})

# Find users not subscribed
r.zdiffstore('newsletter:unsubscribed', ['users:all', 'newsletter:subscribed'])

unsubscribed = r.zrange('newsletter:unsubscribed', 0, -1)
print(f"Unsubscribed users: {unsubscribed}")  # ['user:b', 'user:d']
```

### Product Availability - Remove Out of Stock

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# All products scored by price
r.zadd('products:all', {'prod:1': 29.99, 'prod:2': 49.99,
                        'prod:3': 19.99, 'prod:4': 89.99})

# Out of stock products
r.zadd('products:out_of_stock', {'prod:2': 1, 'prod:4': 1})

# Available products
count = r.zdiffstore('products:available', ['products:all', 'products:out_of_stock'])
available = r.zrange('products:available', 0, -1, withscores=True)
print(f"Available ({count}): {available}")
# [('prod:3', 19.99), ('prod:1', 29.99)]
```

## ZDIFF vs ZDIFFSTORE

`ZDIFF` returns the result directly without storing it. `ZDIFFSTORE` stores the result and returns the count:

```bash
# Return result without storing
redis-cli ZDIFF 2 zset1 zset2

# Store result in 'dest'
redis-cli ZDIFFSTORE dest 2 zset1 zset2
```

Use `ZDIFFSTORE` when you need to reuse the result, perform further sorted set operations on it, or cache the difference for repeated access.

## Summary

`ZDIFFSTORE` computes and persists the difference of multiple sorted sets, storing elements present in the first set but absent from all subsequent sets. Scores are preserved from the first (reference) set. It is valuable for finding unmatched users, filtering out seen content, and excluding specific categories from a larger pool, all while benefiting from Redis's sorted set indexing for further range queries.
