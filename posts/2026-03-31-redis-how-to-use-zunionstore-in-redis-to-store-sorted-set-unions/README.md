# How to Use ZUNIONSTORE in Redis to Store Sorted Set Unions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZUNIONSTORE, UNION, Command

Description: Learn how to use ZUNIONSTORE in Redis to merge multiple sorted sets into a destination key with flexible score aggregation and weighting options.

---

## What Is ZUNIONSTORE

`ZUNIONSTORE` computes the union of multiple sorted sets and stores the result in a destination key. All members from all input sets are included. When a member appears in multiple sets, its scores are aggregated using SUM (default), MIN, or MAX. Per-set weights can be applied before aggregation.

## Syntax

```text
ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]
```

- `destination` - where the result is stored
- `numkeys` - number of input keys
- `key [key ...]` - sorted sets to union
- `WEIGHTS` - multiply each set's scores by weight before aggregating
- `AGGREGATE SUM|MIN|MAX` - how to combine scores for members in multiple sets (default: SUM)

Returns the number of elements in the destination sorted set.

## Basic Usage

### Simple Union

```bash
redis-cli ZADD set1 1 "a" 2 "b" 3 "c"
redis-cli ZADD set2 10 "b" 20 "d" 30 "e"

redis-cli ZUNIONSTORE result 2 set1 set2
```

```text
(integer) 5
```

```bash
redis-cli ZRANGE result 0 -1 WITHSCORES
```

```text
1) "a"
2) "1"
3) "c"
4) "3"
5) "b"
6) "12"
7) "d"
8) "20"
9) "e"
10) "30"
```

`b` appears in both sets; its scores are summed: 2 + 10 = 12.

### AGGREGATE MAX

Use the highest score from any set:

```bash
redis-cli ZUNIONSTORE result_max 2 set1 set2 AGGREGATE MAX
redis-cli ZRANGE result_max 0 -1 WITHSCORES
```

`b` score = max(2, 10) = 10.

### AGGREGATE MIN

Use the lowest score:

```bash
redis-cli ZUNIONSTORE result_min 2 set1 set2 AGGREGATE MIN
```

`b` score = min(2, 10) = 2. Members only in one set keep their original score.

### WEIGHTS

Multiply scores before aggregating:

```bash
redis-cli ZUNIONSTORE weighted 2 set1 set2 WEIGHTS 1 0.5
```

`b` score = (2 * 1) + (10 * 0.5) = 7.

## Practical Examples

### Merge Segment Lists

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# User engagement scores per channel
r.zadd('engaged:email', {'user:1': 80, 'user:2': 60, 'user:3': 90})
r.zadd('engaged:push', {'user:2': 75, 'user:3': 85, 'user:4': 70})
r.zadd('engaged:sms', {'user:1': 50, 'user:4': 60, 'user:5': 40})

# All engaged users - sum scores across channels
count = r.zunionstore('engaged:all', ['engaged:email', 'engaged:push', 'engaged:sms'])
print(f"Total engaged users: {count}")

top_users = r.zrange('engaged:all', 0, -1, withscores=True, desc=True)
print(f"Users by engagement: {top_users}")
# user:3 (90+85=175), user:2 (60+75=135), user:1 (80+50=130), user:4 (70+60=130), user:5 (40)
```

### Merge Daily Analytics

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Daily page views (score = view count)
r.zadd('views:2026-03-29', {'page:home': 1200, 'page:docs': 800, 'page:blog': 500})
r.zadd('views:2026-03-30', {'page:home': 1500, 'page:blog': 600, 'page:pricing': 300})
r.zadd('views:2026-03-31', {'page:home': 1100, 'page:docs': 950, 'page:pricing': 450})

# Weekly totals
count = r.zunionstore('views:weekly',
                       ['views:2026-03-29', 'views:2026-03-30', 'views:2026-03-31'],
                       aggregate='SUM')

weekly = r.zrange('views:weekly', 0, -1, withscores=True, desc=True)
print(f"Weekly page views: {weekly}")
```

### Tag-Based Search Index

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Articles tagged with each topic (score = relevance)
r.zadd('tag:python', {'art:1': 95, 'art:3': 80, 'art:5': 70})
r.zadd('tag:redis', {'art:2': 90, 'art:3': 85, 'art:4': 75})
r.zadd('tag:backend', {'art:1': 88, 'art:2': 92, 'art:4': 78, 'art:5': 65})

def search_by_tags(*tags):
    """Find articles matching any of the given tags, ranked by total relevance."""
    keys = [f'tag:{tag}' for tag in tags]
    r.zunionstore('search:results', keys, aggregate='SUM')
    results = r.zrange('search:results', 0, -1, withscores=True, desc=True)
    r.delete('search:results')
    return results

results = search_by_tags('python', 'redis')
print(f"Search results: {results}")
```

### Fan-Out Message Aggregation

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Inbox messages per user (score = timestamp)
r.zadd('inbox:alice', {'msg:1': 1000, 'msg:3': 1020})
r.zadd('inbox:bob', {'msg:2': 1010, 'msg:4': 1030})
r.zadd('inbox:charlie', {'msg:1': 1000, 'msg:5': 1040})

def get_combined_feed(*user_ids):
    keys = [f'inbox:{uid}' for uid in user_ids]
    r.zunionstore('feed:combined', keys, aggregate='MAX')
    return r.zrange('feed:combined', 0, -1, withscores=True)

feed = get_combined_feed('alice', 'bob', 'charlie')
print(f"Combined feed: {feed}")
```

## Summary

`ZUNIONSTORE` merges all members from multiple sorted sets into a single destination key, aggregating scores via SUM (default), MIN, or MAX when members appear in multiple input sets. Per-set weights allow scoring normalization before aggregation. It is used for merging engagement metrics across channels, aggregating daily analytics into weekly totals, building multi-tag search indexes, and combining user feeds.
