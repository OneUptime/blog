# How to Use Redis Count-Min Sketch for Frequency Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, Probabilistic, Frequency Estimation, Analytics

Description: Learn how to use the Redis Count-Min Sketch probabilistic data structure to estimate event frequencies using constant memory with bounded error.

---

## What Is Count-Min Sketch

Count-Min Sketch (CMS) is a probabilistic data structure that estimates the frequency of items in a data stream using a fixed amount of memory. It uses multiple hash functions and a 2D array of counters. The estimate may overcount (never undercount), with error bounded by configurable width and depth parameters.

CMS uses far less memory than exact counting for high-cardinality data like URL clicks, API calls per endpoint, or word frequencies.

## Creating a Count-Min Sketch in Redis

```bash
# Create a CMS with error rate 0.001 (0.1%) and 0.01 probability of exceeding error
CMS.INITBYPROB cms:page_views 0.001 0.01

# Or specify width and depth directly
CMS.INITBYDIM cms:api_calls 2000 10
```

## Adding Items

```bash
# Increment counts for multiple events in one call
CMS.INCRBY cms:page_views /home 10 /products 5 /about 1
```

## Querying Frequencies

```bash
# Query estimated frequency of specific items
CMS.QUERY cms:page_views /home /products /about
```

## Python Implementation

```python
from redis import Redis

r = Redis(decode_responses=True)

def init_sketch(sketch_name: str, error_rate: float = 0.001,
                probability: float = 0.01):
    """Initialize a Count-Min Sketch with error bounds."""
    r.cms().initbyprob(sketch_name, error_rate, probability)

def track_event(sketch_name: str, event: str, count: int = 1) -> int:
    """Increment the count for an event and return the new estimated count."""
    result = r.cms().incrby(sketch_name, [event], [count])
    return result[0]

def get_frequency(sketch_name: str, *events: str) -> dict:
    """Get estimated frequencies for one or more events."""
    counts = r.cms().query(sketch_name, *events)
    return dict(zip(events, counts))

def batch_track(sketch_name: str, events: dict):
    """Increment multiple events at once. events = {event_name: count}"""
    items = list(events.keys())
    increments = list(events.values())
    r.cms().incrby(sketch_name, items, increments)
```

## Real-World Example - API Endpoint Tracking

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()
SKETCH = "cms:api_calls"

@app.on_event("startup")
def startup():
    init_sketch(SKETCH, error_rate=0.001, probability=0.01)

@app.middleware("http")
async def track_endpoints(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    endpoint = request.url.path
    track_event(SKETCH, endpoint)
    return response

@app.get("/stats/endpoints")
def endpoint_stats():
    endpoints = ["/api/users", "/api/products", "/api/orders",
                 "/api/search", "/api/auth"]
    return get_frequency(SKETCH, *endpoints)
```

## Tracking Trending Keywords

```python
from collections import Counter
import re

def process_search_query(query: str, sketch_name: str = "cms:keywords"):
    words = re.findall(r'\w+', query.lower())
    if words:
        word_counts = Counter(words)
        items = list(word_counts.keys())
        increments = list(word_counts.values())
        r.cms().incrby(sketch_name, items, increments)

def get_keyword_frequency(sketch_name: str, *keywords: str) -> dict:
    counts = r.cms().query(sketch_name, *keywords)
    return dict(zip(keywords, counts))

# Process search queries
process_search_query("how to build redis cache")
process_search_query("redis cache invalidation tutorial")
process_search_query("redis tutorial getting started")

# Check frequencies
print(get_keyword_frequency("cms:keywords", "redis", "cache", "tutorial"))
# {'redis': 3, 'cache': 2, 'tutorial': 2}
```

## Merging Multiple Sketches

```python
def merge_sketches(destination: str, sources: list[str]):
    """Merge multiple sketches into one (must have same dimensions)."""
    # Redis CMS.MERGE: destination, num_sources, source1, source2, ...
    r.execute_command("CMS.MERGE", destination, len(sources), *sources)

# Example: merge hourly sketches into a daily sketch
def aggregate_hourly_to_daily():
    hourly_sketches = [f"cms:api_calls:hour:{h}" for h in range(24)]
    merge_sketches("cms:api_calls:daily", hourly_sketches)
```

## Getting Sketch Info

```python
def sketch_info(sketch_name: str) -> dict:
    info = r.cms().info(sketch_name)
    return {
        "width": info.width,
        "depth": info.depth,
        "count": info.count
    }
```

## Summary

Redis Count-Min Sketch provides sub-linear memory frequency estimation for high-cardinality event streams with configurable error bounds. `CMS.INCRBY` batches multiple event increments in a single round trip, and `CMS.MERGE` combines sketches across time windows or service instances. It is ideal for tracking API calls, page views, and search keyword popularity where approximate counts are sufficient.
