# How to Build an Application Performance Monitor with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Performance, Monitoring

Description: Track application latency, error rates, and throughput in real time using RedisTimeSeries with automatic aggregations for APM dashboards.

---

Application Performance Monitoring (APM) requires capturing request latency, error rates, and throughput at high frequency. RedisTimeSeries stores these metrics with sub-millisecond write latency and supports real-time aggregation for dashboard queries.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Metric Series Design

Track metrics per service and endpoint:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def setup_apm_series(service: str, endpoint: str):
    for metric, agg_type in [
        ("latency_ms", "avg"),
        ("error_count", "sum"),
        ("request_count", "sum"),
    ]:
        raw_key = f"apm:{service}:{endpoint}:{metric}"
        try:
            r.execute_command(
                'TS.CREATE', raw_key,
                'RETENTION', 86400000,
                'LABELS',
                'service', service,
                'endpoint', endpoint,
                'metric', metric
            )
        except Exception:
            pass

        # 1-minute aggregates for dashboards
        agg_key = f"apm:{service}:{endpoint}:{metric}:1min"
        try:
            r.execute_command(
                'TS.CREATE', agg_key,
                'RETENTION', 30 * 86400000,
                'LABELS', 'service', service,
                'endpoint', endpoint, 'metric', metric, 'resolution', '1min'
            )
            r.execute_command(
                'TS.CREATERULE', raw_key, agg_key,
                'AGGREGATION', agg_type, 60000
            )
        except Exception:
            pass

setup_apm_series("api", "POST_/orders")
setup_apm_series("api", "GET_/products")
```

## Recording Request Metrics

Wrap your request handler with a timing decorator:

```python
import functools

def track_request(service: str, endpoint: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            ts = int(time.time() * 1000)
            start = time.monotonic()
            is_error = False
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                is_error = True
                raise
            finally:
                latency = (time.monotonic() - start) * 1000
                pipe = r.pipeline()
                pipe.execute_command(
                    'TS.ADD', f"apm:{service}:{endpoint}:latency_ms",
                    ts, round(latency, 2)
                )
                pipe.execute_command(
                    'TS.ADD', f"apm:{service}:{endpoint}:request_count",
                    ts, 1
                )
                pipe.execute_command(
                    'TS.ADD', f"apm:{service}:{endpoint}:error_count",
                    ts, 1 if is_error else 0
                )
                pipe.execute()
        return wrapper
    return decorator

@track_request("api", "GET_/products")
def get_products():
    time.sleep(0.045)  # simulate 45ms response
    return {"products": []}
```

## Querying APM Metrics

```python
def get_latency_stats(service: str, endpoint: str,
                       minutes: int = 60):
    key = f"apm:{service}:{endpoint}:latency_ms:1min"
    now = int(time.time() * 1000)
    from_ts = now - minutes * 60 * 1000
    result = r.execute_command('TS.RANGE', key, from_ts, now)
    values = [float(val) for _, val in result]
    if not values:
        return {}
    return {
        "avg_ms": round(sum(values) / len(values), 2),
        "min_ms": round(min(values), 2),
        "max_ms": round(max(values), 2),
        "data_points": len(values)
    }

def get_error_rate(service: str, endpoint: str,
                    minutes: int = 60) -> float:
    now = int(time.time() * 1000)
    from_ts = now - minutes * 60 * 1000

    errors = r.execute_command(
        'TS.RANGE', f"apm:{service}:{endpoint}:error_count",
        from_ts, now, 'AGGREGATION', 'sum', (minutes * 60 * 1000)
    )
    requests = r.execute_command(
        'TS.RANGE', f"apm:{service}:{endpoint}:request_count",
        from_ts, now, 'AGGREGATION', 'sum', (minutes * 60 * 1000)
    )

    total_errors = float(errors[0][1]) if errors else 0
    total_requests = float(requests[0][1]) if requests else 0
    return round(total_errors / total_requests * 100, 2) if total_requests else 0
```

## Service Overview

```python
def get_service_overview(service: str) -> list:
    result = r.execute_command(
        'TS.MGET', 'WITHLABELS', 'FILTER', f'service={service}', 'metric=latency_ms'
    )
    endpoints = []
    for item in result:
        labels = dict(item[1])
        if item[2]:
            ts, val = item[2]
            endpoints.append({
                "endpoint": labels.get('endpoint'),
                "latest_latency_ms": float(val)
            })
    return endpoints
```

## Summary

RedisTimeSeries provides a lightweight APM backend that captures request latency, throughput, and error rates with minimal overhead. Use the track_request decorator to instrument endpoints automatically, compaction rules to maintain minute-level aggregates, and TS.MGET with label filters to build service-wide overview panels without querying each metric individually.
