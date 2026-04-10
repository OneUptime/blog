# How to Implement Search Analytics with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Analytics, Search

Description: Learn how to track and analyze search queries, click-through rates, and zero-result queries using RediSearch and Redis data structures.

---

Search analytics help you understand what users are looking for and improve your search quality. RediSearch, combined with Redis hashes and sorted sets, gives you a fast, in-memory search analytics pipeline.

## Setting Up RediSearch Index

First, create an index for your product catalog:

```bash
FT.CREATE product_idx ON HASH PREFIX 1 product: SCHEMA
  name TEXT WEIGHT 5.0
  category TAG
  price NUMERIC SORTABLE
  description TEXT
```

## Tracking Search Queries

Every time a user searches, log the query using a sorted set for frequency tracking:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def search_and_track(query: str, user_id: str):
    # Perform the search
    results = r.execute_command(
        'FT.SEARCH', 'product_idx', query,
        'LIMIT', 0, 10
    )

    num_results = results[0]

    # Track query frequency
    r.zincrby('search:query_freq', 1, query.lower())

    # Track zero-result queries
    if num_results == 0:
        r.zincrby('search:zero_results', 1, query.lower())

    # Track impressions for CTR calculation
    if num_results > 0:
        r.hincrby(f"search:ctr:{query.lower()}", 'impressions', 1)

    # Track by time window (hourly)
    hour_key = f"search:queries:{int(time.time() // 3600)}"
    r.rpush(hour_key, query.lower())
    r.expire(hour_key, 86400 * 7)  # keep 7 days

    return results

# Example usage
results = search_and_track("wireless headphones", "user:123")
```

## Analyzing Top Searches

Retrieve the most popular search queries:

```python
def get_top_queries(limit: int = 10):
    # Get top queries by frequency
    top = r.zrevrange('search:query_freq', 0, limit - 1, withscores=True)
    return [{"query": q, "count": int(score)} for q, score in top]

def get_zero_result_queries(limit: int = 10):
    # Queries returning no results - highest priority for improvement
    zero = r.zrevrange('search:zero_results', 0, limit - 1, withscores=True)
    return [{"query": q, "count": int(score)} for q, score in zero]

print("Top queries:", get_top_queries())
print("Zero results:", get_zero_result_queries())
```

## Tracking Click-Through Rates

When a user clicks on a search result, record it:

```python
def track_click(query: str, doc_id: str, position: int):
    pipe = r.pipeline()
    # Total clicks for this query
    pipe.hincrby(f"search:ctr:{query.lower()}", 'clicks', 1)
    # Position data
    pipe.rpush(f"search:positions:{query.lower()}", position)
    pipe.execute()

def get_ctr(query: str) -> float:
    data = r.hgetall(f"search:ctr:{query.lower()}")
    clicks = int(data.get('clicks', 0))
    impressions = int(data.get('impressions', 1))
    return round(clicks / impressions * 100, 2)
```

## Hourly Search Volume Report

Summarize search activity across time windows:

```python
def get_hourly_volume(hours_back: int = 24):
    current_hour = int(time.time() // 3600)
    volume = {}
    for h in range(hours_back):
        hour = current_hour - h
        key = f"search:queries:{hour}"
        count = r.llen(key)
        volume[hour] = count
    return volume
```

## Using FT.INFO for Index Statistics

RediSearch provides built-in stats per index:

```bash
FT.INFO product_idx
```

This returns the number of documents, index size, and indexing failures - useful for monitoring index health alongside your custom analytics.

## Summary

RediSearch's fast full-text search combined with Redis sorted sets and hashes makes it straightforward to implement search analytics. Track query frequency, zero-result rates, and click-through rates to continuously improve your search experience. Use the hourly time windows to spot trends and react to sudden changes in search behavior.
