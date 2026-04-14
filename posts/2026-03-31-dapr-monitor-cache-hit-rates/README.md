# How to Monitor Cache Hit Rates with Dapr Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Cache, Monitoring, Prometheus

Description: Learn how to monitor cache hit and miss rates in Dapr applications using Prometheus metrics, custom counters, and Grafana dashboards.

---

## Why Monitor Cache Hit Rates?

Cache hit rate tells you what fraction of reads are served from the cache versus the database. A low hit rate means your cache is not providing much benefit - requests are mostly hitting the database. Tracking this metric helps you tune TTLs, identify cache eviction problems, and measure the impact of caching changes.

## Dapr's Built-in State Metrics

Dapr exports Prometheus metrics for state store operations. Enable metrics in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  metrics:
    enabled: true
```

Scrape the metrics endpoint:

```bash
curl http://localhost:9090/metrics | grep dapr_component_state
```

Relevant metrics include:
- `dapr_component_state_count{operation="get"}` - total get operations
- `dapr_component_state_count{operation="set"}` - total set operations
- `dapr_component_state_count{operation="delete"}` - total delete operations
- `dapr_component_state_latencies` - operation latency histogram

These tell you volume and latency but not cache hits vs misses. For that, instrument your application code.

## Adding Custom Cache Metrics

Use Prometheus client library to track hits and misses in your application:

```python
from prometheus_client import Counter, Histogram, start_http_server

cache_hits = Counter(
    "app_cache_hits_total",
    "Total cache hits",
    ["entity_type"]
)
cache_misses = Counter(
    "app_cache_misses_total",
    "Total cache misses",
    ["entity_type"]
)
cache_operation_duration = Histogram(
    "app_cache_operation_seconds",
    "Cache operation duration",
    ["operation", "entity_type"]
)

start_http_server(8001)  # Expose metrics on a separate port

async def get_product(product_id: str) -> dict:
    with cache_operation_duration.labels(operation="get", entity_type="product").time():
        cached = await get_from_dapr_state(f"product:{product_id}")

    if cached:
        cache_hits.labels(entity_type="product").inc()
        return cached

    cache_misses.labels(entity_type="product").inc()
    product = await fetch_from_database(product_id)
    await set_in_dapr_state(f"product:{product_id}", product, ttl=300)
    return product
```

## Calculating Hit Rate in Prometheus

Once Prometheus is scraping your metrics, calculate hit rate with a PromQL query:

```promql
rate(app_cache_hits_total[5m])
/
(rate(app_cache_hits_total[5m]) + rate(app_cache_misses_total[5m]))
```

This gives the rolling 5-minute hit rate as a fraction between 0 and 1.

## Grafana Dashboard Panels

Create a Grafana dashboard with these key panels:

**Cache Hit Rate Gauge:**
```promql
sum(rate(app_cache_hits_total[5m])) by (entity_type)
/
sum(rate(app_cache_hits_total[5m]) + rate(app_cache_misses_total[5m])) by (entity_type)
```

**Cache Operations Per Second:**
```promql
sum(rate(app_cache_hits_total[1m]) + rate(app_cache_misses_total[1m])) by (entity_type)
```

**Average Cache Get Latency:**
```promql
rate(app_cache_operation_seconds_sum{operation="get"}[5m])
/
rate(app_cache_operation_seconds_count{operation="get"}[5m])
```

## Setting Alerts for Low Hit Rates

Alert when cache hit rate drops below a threshold, indicating a cache problem:

```yaml
groups:
  - name: cache-alerts
    rules:
      - alert: LowCacheHitRate
        expr: |
          sum(rate(app_cache_hits_total[10m]))
          /
          sum(rate(app_cache_hits_total[10m]) + rate(app_cache_misses_total[10m]))
          < 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate below 50% for 5 minutes"
```

## Summary

Monitoring cache hit rates in Dapr applications requires a combination of Dapr's built-in state metrics (for operation volume and latency) and custom application counters (for hit/miss tracking). Exposing these counters via Prometheus and visualizing them in Grafana gives you a clear picture of cache effectiveness and lets you tune TTLs and eviction strategies based on real data.
