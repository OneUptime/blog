# How to Use Redis with Apache Superset for Dashboard Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Apache Superset, Caching, Dashboard, Performance

Description: Configure Redis as the caching and Celery results backend for Apache Superset to accelerate dashboard load times and reduce database query pressure.

---

Apache Superset supports Redis as both a query results cache and a Celery task results backend. By caching expensive SQL queries in Redis, dashboards load from fast in-memory lookups instead of re-running database queries on every page load.

## Redis Roles in Superset

1. **Query cache**: stores results of SQL queries keyed by query hash
2. **Celery results backend**: stores async task results (used with `RESULTS_BACKEND`)
3. **Rate limiting backend**: tracks API rate limit counters

## Installing Dependencies

```bash
pip install apache-superset celery redis
```

## Configuring Redis Cache in superset_config.py

```python
# Main query results cache
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 86400,  # 24 hours
    "CACHE_KEY_PREFIX": "superset_results_",
    "CACHE_REDIS_URL": "redis://:yourpassword@redis.internal:6379/0",
}

# Dashboard filter state cache (shorter TTL)
FILTER_STATE_CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 900,  # 15 minutes
    "CACHE_KEY_PREFIX": "superset_filter_",
    "CACHE_REDIS_URL": "redis://:yourpassword@redis.internal:6379/1",
}

# Explore form cache
EXPLORE_FORM_DATA_CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 1800,
    "CACHE_KEY_PREFIX": "superset_explore_",
    "CACHE_REDIS_URL": "redis://:yourpassword@redis.internal:6379/2",
}
```

## Celery Configuration with Redis Backend

```python
class CeleryConfig:
    broker_url = "redis://:yourpassword@redis.internal:6379/3"
    result_backend = "redis://:yourpassword@redis.internal:6379/4"
    worker_prefetch_multiplier = 4
    task_acks_late = True
    task_annotations = {
        "sql_lab.get_sql_results": {"rate_limit": "100/s"},
    }

CELERY_CONFIG = CeleryConfig

# Enable async queries
FEATURE_FLAGS = {
    "GLOBAL_ASYNC_QUERIES": True,
    "ALERT_REPORTS": True,
}
```

## Starting Celery Workers

```bash
# Start the Celery worker
celery --app=superset.tasks.celery_app:app worker \
  --pool=prefork \
  --concurrency=4 \
  --loglevel=INFO

# Start the Celery beat scheduler (for reports and alerts)
celery --app=superset.tasks.celery_app:app beat \
  --loglevel=INFO
```

## Setting Per-Chart Cache Timeouts

In Superset UI: Edit a chart -> Advanced -> Cache Timeout (seconds)

Or via API:

```python
import requests

session = requests.Session()
response = session.post("http://superset:8088/api/v1/security/login", json={
    "username": "admin",
    "password": "admin",
    "provider": "db",
})
access_token = response.json()["access_token"]
session.headers.update({"Authorization": f"Bearer {access_token}"})

# Set 30-minute cache on a specific chart
session.put("http://superset:8088/api/v1/chart/42", json={
    "cache_timeout": 1800
})
```

## Monitoring Cache Efficiency

Check Redis memory usage by prefix:

```bash
redis-cli --scan --pattern "superset_results_*" | wc -l
redis-cli --scan --pattern "superset_results_*" | xargs -n 1 redis-cli MEMORY USAGE | awk '{sum+=$1} END {print sum/1024/1024 " MB"}'
```

Check cache hit rate:

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

## Warming the Cache

Pre-warm dashboards with a cron job:

```bash
superset cache-warmup --strategy top_n_dashboards --top-n 10
```

This runs the top 10 most-viewed dashboards and loads results into Redis before business hours.

## Summary

Redis significantly accelerates Apache Superset by caching query results, storing Celery task outputs, and maintaining filter and explore form state. Separating cache namespaces across Redis databases prevents key collisions and makes it easy to flush specific cache types. Monitor cache hit rates and memory usage to validate TTL settings match your dashboard refresh requirements.
