# How to Build a Tag Cloud Generator with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Tag Cloud, Sorted Set, Search, Content

Description: Generate dynamic tag clouds with Redis sorted sets by tracking tag usage frequency and producing weighted tag lists for display in real time as content is tagged.

---

Tag clouds show which topics are most popular by displaying tags at sizes proportional to their usage. Redis sorted sets are a natural fit - tags are members, and their usage count is the score.

## Tracking Tag Usage

Every time content is tagged, increment the tag's score in the sorted set:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
TAG_CLOUD_KEY = "tagcloud:global"

def add_tag_to_content(content_id: str, tag: str):
    # Track which tags the content has
    r.sadd(f"content:{content_id}:tags", tag)
    # Increment tag frequency globally
    r.zincrby(TAG_CLOUD_KEY, 1, tag.lower())

def remove_tag_from_content(content_id: str, tag: str):
    r.srem(f"content:{content_id}:tags", tag)
    # Decrement - floor at 0
    current = r.zscore(TAG_CLOUD_KEY, tag.lower())
    if current and current > 1:
        r.zincrby(TAG_CLOUD_KEY, -1, tag.lower())
    else:
        r.zrem(TAG_CLOUD_KEY, tag.lower())
```

## Generating the Tag Cloud

Fetch the top N tags with their scores for display:

```python
def get_tag_cloud(n: int = 50) -> list:
    tags = r.zrange(TAG_CLOUD_KEY, 0, n - 1, desc=True, withscores=True)
    return [{"tag": tag, "count": int(score)} for tag, score in tags]
```

## Normalizing Tag Weights for Display

Scale tag counts into a display weight (1-5) for font sizes in the UI:

```python
def get_weighted_tag_cloud(n: int = 50) -> list:
    tags = r.zrange(TAG_CLOUD_KEY, 0, n - 1, desc=True, withscores=True)
    if not tags:
        return []
    counts = [score for _, score in tags]
    min_count, max_count = min(counts), max(counts)
    result = []
    for tag, count in tags:
        if max_count == min_count:
            weight = 3
        else:
            weight = 1 + int(4 * (count - min_count) / (max_count - min_count))
        result.append({"tag": tag, "count": int(count), "weight": weight})
    return result
```

## Category-Specific Tag Clouds

Maintain separate sorted sets per category:

```python
def add_tag_with_category(content_id: str, tag: str, category: str):
    tag = tag.lower()
    r.zincrby(TAG_CLOUD_KEY, 1, tag)
    r.zincrby(f"tagcloud:cat:{category}", 1, tag)

def get_category_tag_cloud(category: str, n: int = 20) -> list:
    return r.zrange(f"tagcloud:cat:{category}", 0, n - 1, desc=True, withscores=True)
```

## Trending Tags Over Time

Use hourly buckets to show tags trending right now:

```python
import time

def add_tag_trending(tag: str):
    hour = int(time.time() // 3600)
    key = f"tagcloud:hour:{hour}"
    r.zincrby(key, 1, tag.lower())
    r.expire(key, 86400)  # Keep 24 hours

def get_trending_tags(n: int = 20) -> list:
    hour = int(time.time() // 3600)
    # Last 6 hours
    keys = [f"tagcloud:hour:{hour - i}" for i in range(6)]
    r.zunionstore("tagcloud:trending:tmp", keys)
    return r.zrange("tagcloud:trending:tmp", 0, n - 1, desc=True, withscores=True)
```

## Summary

Redis sorted sets track tag frequency with O(log N) increments and O(log N + M) range queries, where M is the number of elements returned. Normalizing scores to display weights lets frontend code render proportional font sizes. Category-specific and time-bucketed sorted sets extend the basic pattern to per-category clouds and real-time trending tags.

