# How to Use Redis for Dashboard Data Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Dashboard, Performance, Observability

Description: Cache expensive dashboard queries and aggregations in Redis to serve real-time dashboards without hammering your database on every page load.

---

Dashboards are read-heavy. Every user opening an operations dashboard triggers the same expensive aggregation queries. Caching these results in Redis allows you to serve hundreds of concurrent users from a single pre-computed result set refreshed on a schedule.

## Caching Aggregated Query Results

Store query results with a TTL that matches your acceptable data freshness:

```python
import redis
import json
import time
from typing import Optional, Callable

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cached_query(key: str, ttl: int, compute: Callable) -> dict:
    raw = r.get(key)
    if raw:
        return json.loads(raw)

    result = compute()
    r.setex(key, ttl, json.dumps(result))
    return result

# Example: cache error rate per service for 30 seconds
def get_error_rates() -> dict:
    return cached_query(
        key="dashboard:error_rates",
        ttl=30,
        compute=lambda: fetch_error_rates_from_db(),
    )
```

## Background Refresh to Avoid Cache Stampedes

When many users hit an expired cache key simultaneously, they all query the database at once - a cache stampede. Use background refresh with a lock:

```python
def get_with_background_refresh(key: str, stale_ttl: int, refresh_fn: Callable) -> Optional[dict]:
    raw = r.get(key)
    if raw:
        return json.loads(raw)

    lock_key = f"lock:{key}"
    if r.set(lock_key, "1", nx=True, ex=10):
        try:
            data = refresh_fn()
            r.setex(key, stale_ttl, json.dumps(data))
        finally:
            r.delete(lock_key)
        return data

    # Another worker is refreshing - wait briefly and retry
    time.sleep(0.1)
    raw = r.get(key)
    return json.loads(raw) if raw else {}
```

## Caching Panel Data Independently

Large dashboards have multiple panels that refresh at different rates. Cache each panel independently:

```python
PANEL_TTL = {
    "latency_p99": 15,
    "request_rate": 10,
    "error_rate": 30,
    "service_map": 60,
    "uptime_summary": 300,
}

def get_panel_data(dashboard_id: str, panel_id: str, compute: Callable) -> dict:
    key = f"panel:{dashboard_id}:{panel_id}"
    ttl = PANEL_TTL.get(panel_id, 30)
    return cached_query(key, ttl, compute)
```

## Warming the Cache on Startup

Pre-populate cache on startup so the first users never see cold queries:

```python
def warm_dashboard_cache():
    panels = ["latency_p99", "request_rate", "error_rate", "service_map"]
    for panel_id in panels:
        key = f"panel:main:{panel_id}"
        if not r.exists(key):
            data = compute_panel(panel_id)
            ttl = PANEL_TTL.get(panel_id, 30)
            r.setex(key, ttl, json.dumps(data))
            print(f"Warmed cache for {panel_id}")
```

## Tracking Cache Hit Rate

Monitor cache effectiveness with hit/miss counters:

```bash
# Log hits and misses from your application, then query:
redis-cli mget dashboard:hits dashboard:misses

# Or use Redis INFO stats
redis-cli info stats | grep keyspace
```

```python
def tracked_get(key: str) -> Optional[str]:
    value = r.get(key)
    if value:
        r.incr("dashboard:hits")
    else:
        r.incr("dashboard:misses")
    return value
```

## Summary

Redis dashboard caching dramatically reduces database load by serving pre-computed results to concurrent users. Independent TTLs per panel allow high-frequency metrics to refresh quickly while stable summaries update less often. Background refresh with locks prevents stampedes, and cache warming eliminates cold-start penalties.
