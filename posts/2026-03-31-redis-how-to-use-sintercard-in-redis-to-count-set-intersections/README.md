# How to Use SINTERCARD in Redis to Count Set Intersections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, SINTERCARD, Intersection, Command

Description: Learn how to use SINTERCARD in Redis to count the number of elements in the intersection of multiple sets without returning the full intersection result.

---

## What Is SINTERCARD

`SINTERCARD` returns the cardinality (count) of the intersection between two or more sets. It was introduced in Redis 7.0 as a more efficient alternative to calling `SINTER` when you only need the count, not the actual members.

This is particularly useful when dealing with large sets where you want to check overlap size without transferring all intersecting elements over the network.

## Syntax

```text
SINTERCARD numkeys key [key ...] [LIMIT limit]
```

- `numkeys` - the number of keys to intersect (required)
- `key [key ...]` - the set keys to intersect
- `LIMIT limit` - stop counting at this number; `0` means no limit (count all)

Returns an integer - the count of elements in the intersection.

## Basic Usage

### Two-Set Intersection Count

```bash
redis-cli SADD set1 "a" "b" "c" "d"
redis-cli SADD set2 "b" "c" "e" "f"

redis-cli SINTERCARD 2 set1 set2
```

```text
(integer) 2
```

The intersection is `{b, c}` - count is 2.

### Three-Set Intersection Count

```bash
redis-cli SADD set3 "c" "g" "h"

redis-cli SINTERCARD 3 set1 set2 set3
```

```text
(integer) 1
```

Only `c` is in all three sets.

### Using LIMIT

Stop counting once the limit is reached - useful for existence checks:

```bash
redis-cli SINTERCARD 2 set1 set2 LIMIT 1
```

```text
(integer) 1
```

Even though there are 2 common elements, LIMIT 1 stops at 1. Use this to answer "do these sets share at least N elements?" efficiently.

### Empty Intersection

```bash
redis-cli SADD set4 "x" "y" "z"
redis-cli SINTERCARD 2 set1 set4
```

```text
(integer) 0
```

## SINTERCARD vs SINTER

`SINTER` returns all intersecting members, while `SINTERCARD` returns only the count. For large sets, `SINTERCARD` is much more efficient when you only need the size:

```bash
# Returns all members (expensive for large sets)
redis-cli SINTER set1 set2

# Returns just the count (efficient)
redis-cli SINTERCARD 2 set1 set2
```

```bash
# Compare similarity without fetching all data
redis-cli SINTERCARD 2 set1 set2 LIMIT 0
```

## Practical Use Cases

### Mutual Friends Check

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# User friend lists
r.sadd('friends:alice', 'bob', 'charlie', 'dave', 'eve')
r.sadd('friends:bob', 'alice', 'charlie', 'frank', 'grace')

# Count mutual friends
mutual_count = r.sintercard(2, ['friends:alice', 'friends:bob'])
print(f"Alice and Bob have {mutual_count} mutual friend(s)")  # 1 (charlie)

# Check if they share at least 2 mutual friends
has_enough = r.sintercard(2, ['friends:alice', 'friends:bob'], limit=2)
print(f"Share at least 2 friends: {has_enough >= 2}")  # False
```

### Audience Overlap Analysis

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Users in different marketing segments
r.sadd('segment:sports', 'u1', 'u2', 'u3', 'u4', 'u5')
r.sadd('segment:tech', 'u2', 'u3', 'u6', 'u7', 'u8')
r.sadd('segment:premium', 'u3', 'u4', 'u6', 'u9', 'u10')

# Overlap between sports and tech fans
sports_tech = r.sintercard(2, ['segment:sports', 'segment:tech'])
print(f"Sports+Tech overlap: {sports_tech}")  # 2

# All three segments
all_three = r.sintercard(3, ['segment:sports', 'segment:tech', 'segment:premium'])
print(f"All three segments: {all_three}")  # 1 (u3 only)

# Total users
total_sports = r.scard('segment:sports')
overlap_rate = sports_tech / total_sports * 100
print(f"Overlap rate: {overlap_rate:.1f}%")
```

### Recommendation System - Shared Tags

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def similarity_score(item1_key, item2_key):
    """Jaccard similarity based on tag intersection."""
    intersection = r.sintercard(2, [item1_key, item2_key])
    union_size = r.sunionstore('__tmp__', item1_key, item2_key)
    r.delete('__tmp__')
    if union_size == 0:
        return 0.0
    return intersection / union_size

# Items with tags
r.sadd('tags:article1', 'python', 'redis', 'backend', 'database')
r.sadd('tags:article2', 'python', 'redis', 'caching', 'performance')
r.sadd('tags:article3', 'javascript', 'frontend', 'react', 'ui')

print(f"Article 1-2 similarity: {similarity_score('tags:article1', 'tags:article2'):.2f}")
print(f"Article 1-3 similarity: {similarity_score('tags:article1', 'tags:article3'):.2f}")
```

## Summary

`SINTERCARD` efficiently counts the intersection size between multiple Redis sets without returning the actual members, making it ideal for overlap analysis, mutual element checks, and similarity scoring in large datasets. The `LIMIT` option provides an early-exit mechanism for threshold checks. Use it instead of `SINTER` + client-side counting whenever you only need the intersection size.
