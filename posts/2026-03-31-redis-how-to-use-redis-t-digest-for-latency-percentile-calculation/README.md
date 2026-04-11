# How to Use Redis T-Digest for Latency Percentile Calculation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Percentile, Latency, Monitoring

Description: Learn how to use the Redis T-Digest probabilistic data structure to calculate accurate latency percentiles like p50, p95, and p99 with minimal memory.

---

## What Is T-Digest

T-Digest is a probabilistic data structure for computing approximate quantiles (percentiles) over streaming data. It maintains high accuracy near the extremes (p0, p1, p99, p100) where accuracy matters most, while using much less memory than storing all values. This makes it ideal for latency p50/p95/p99 monitoring.

## Creating a T-Digest

```bash
# Create a T-Digest with compression factor 100 (higher = more accurate, more memory)
TDIGEST.CREATE latency:api:get_user COMPRESSION 100

# Or with default compression
TDIGEST.CREATE latency:checkout
```

## Adding Observations

```bash
# Add latency values in milliseconds
TDIGEST.ADD latency:api:get_user 12.5 8.3 15.1 23.7 9.4

# Add a single observation
TDIGEST.ADD latency:checkout 145.2
```

## Querying Percentiles

```bash
# Get p50, p95, p99 in one call
TDIGEST.QUANTILE latency:api:get_user 0.5 0.95 0.99

# Get cumulative distribution (what fraction of values are below X)
TDIGEST.CDF latency:api:get_user 100 200 500

# Get min, max, count, mean
TDIGEST.INFO latency:api:get_user
```

## Python Implementation

```python
from redis import Redis
import time
import functools

r = Redis(decode_responses=True)

def init_digest(key: str, compression: int = 100):
    """Initialize a T-Digest structure."""
    try:
        r.tdigest().info(key)
    except Exception:
        r.tdigest().create(key, compression)

def record_latency(key: str, latency_ms: float):
    """Add a latency observation."""
    r.tdigest().add(key, [latency_ms])

def record_latencies(key: str, latencies: list[float]):
    """Batch add latency observations."""
    r.tdigest().add(key, latencies)

def get_percentiles(key: str) -> dict:
    """Get standard SLO percentiles."""
    labels = ["p50", "p75", "p90", "p95", "p99", "p99.9"]
    percentiles = [0.5, 0.75, 0.90, 0.95, 0.99, 0.999]
    values = r.tdigest().quantile(key, *percentiles)
    return {
        label: round(v, 2)
        for label, v in zip(labels, values)
    }

def get_digest_summary(key: str) -> dict:
    info = r.tdigest().info(key)
    return {
        "min": r.tdigest().min(key),
        "max": r.tdigest().max(key),
        "count": info.merged_weight + info.unmerged_weight,
        "compression": info.compression
    }
```

## Automatic Latency Tracking Decorator

```python
def track_latency(digest_key: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                elapsed_ms = (time.perf_counter() - start) * 1000
                record_latency(digest_key, elapsed_ms)
        return wrapper
    return decorator

@track_latency("latency:db:get_user")
def get_user_from_db(user_id: int):
    # Simulated DB query
    import time; time.sleep(0.01)
    return {"id": user_id, "name": "Alice"}
```

## FastAPI Middleware for Automatic Tracking

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.on_event("startup")
def startup():
    for endpoint in ["/api/users", "/api/products", "/api/orders"]:
        init_digest(f"latency:{endpoint.replace('/', ':')}")

@app.middleware("http")
async def latency_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    endpoint_key = f"latency:{request.url.path.replace('/', ':')}"
    try:
        r.tdigest().add(endpoint_key, [elapsed_ms])
    except Exception:
        pass
    return response

@app.get("/metrics/latency/{endpoint}")
def latency_metrics(endpoint: str):
    key = f"latency:{endpoint}"
    init_digest(key)
    return get_percentiles(key)
```

## Rolling Window with Key Rotation

Rotate digests hourly to keep metrics fresh:

```python
def current_digest_key(service: str) -> str:
    hour = int(time.time()) // 3600
    return f"latency:{service}:{hour}"

def record_with_rotation(service: str, latency_ms: float, window_hours: int = 24):
    key = current_digest_key(service)
    try:
        r.tdigest().info(key)
    except Exception:
        r.tdigest().create(key, 100)
        r.expire(key, window_hours * 3600)
    r.tdigest().add(key, [latency_ms])

def get_current_percentiles(service: str) -> dict:
    key = current_digest_key(service)
    try:
        return get_percentiles(key)
    except Exception:
        return {}
```

## Merging Digests Across Instances

```python
def merge_service_digests(service: str, instance_count: int) -> dict:
    keys = [f"latency:{service}:instance:{i}" for i in range(instance_count)]
    dest_key = f"latency:{service}:merged"
    # Merge all instance digests into one
    r.tdigest().merge(dest_key, len(keys), *keys)
    return get_percentiles(dest_key)
```

## Summary

Redis T-Digest accurately estimates latency percentiles (p50, p95, p99) with particularly high precision at the extremes, using constant memory regardless of observation count. Automatic decorator-based instrumentation makes it trivial to add latency tracking to any function. Key rotation with TTL enables rolling window percentiles, and `TDIGEST.MERGE` combines metrics across multiple service instances.
