# How to Use Redis as a Cache for Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elasticsearch, Caching

Description: Learn how to use Redis as a query cache in front of Elasticsearch to reduce latency and cluster load for repeated search queries.

---

Elasticsearch queries can take 100ms or more for complex searches. For repeated queries - popular search terms, dashboard aggregations, autocomplete - Redis caching can reduce response times to under 1ms and dramatically cut Elasticsearch cluster load.

## Cache Architecture

```text
Client Request
     |
     v
Redis Cache (MISS?)
     |            \
     v             v
Query ES    Return cached result
     |
     v
Store result in Redis with TTL
     |
     v
Return result
```

## Python Caching Layer

```python
import json
import hashlib
import redis
from elasticsearch import Elasticsearch

es = Elasticsearch(["http://localhost:9200"])
cache = redis.Redis(host="localhost", port=6379, decode_responses=True)

def build_cache_key(index: str, query: dict) -> str:
    query_str = json.dumps(query, sort_keys=True)
    hash_val = hashlib.sha256(f"{index}:{query_str}".encode()).hexdigest()[:16]
    return f"es:cache:{index}:{hash_val}"

def cached_search(
    index: str,
    query: dict,
    ttl: int = 60,
    size: int = 10
) -> dict:
    cache_key = build_cache_key(index, query)

    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - query Elasticsearch
    result = es.search(index=index, body=query, size=size)
    serializable = result.body if hasattr(result, "body") else dict(result)

    cache.set(cache_key, json.dumps(serializable), ex=ttl)
    return serializable
```

## Example: Caching a Product Search

```python
query = {
    "query": {
        "multi_match": {
            "query": "wireless headphones",
            "fields": ["title^3", "description", "tags"],
        }
    },
    "aggs": {
        "by_brand": {"terms": {"field": "brand.keyword", "size": 10}}
    },
}

# First call: hits Elasticsearch (~80ms)
results = cached_search("products", query, ttl=300)

# Subsequent calls: served from Redis (<1ms)
results = cached_search("products", query, ttl=300)
```

## Invalidate Cache on Index Update

When documents are indexed, invalidate related cache keys:

```python
def invalidate_index_cache(index: str):
    pattern = f"es:cache:{index}:*"
    cursor = 0
    while True:
        cursor, keys = cache.scan(cursor, match=pattern, count=100)
        if keys:
            cache.delete(*keys)
        if cursor == 0:
            break

# Call after bulk indexing
es.index(index="products", body=new_product)
invalidate_index_cache("products")
```

## Cache Aggregations Separately

Aggregation queries are expensive but their results change less frequently:

```python
def cached_aggregation(index: str, agg_query: dict, ttl: int = 600) -> dict:
    """Cache aggregations longer than search results."""
    key = f"es:agg:{index}:{hashlib.sha256(json.dumps(agg_query, sort_keys=True).encode()).hexdigest()[:12]}"
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    result = es.search(index=index, body=agg_query, size=0)
    aggs = result["aggregations"]
    cache.set(key, json.dumps(aggs), ex=ttl)
    return aggs
```

## Summary

Using Redis as a cache in front of Elasticsearch reduces repeated query latency from milliseconds to sub-millisecond and protects your Elasticsearch cluster from query storms. Hash query bodies to create stable cache keys, set TTLs appropriate to your data freshness requirements, and implement index-level cache invalidation to ensure results stay accurate after indexing updates.
