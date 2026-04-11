# How to Implement Error Rate Monitoring with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error Rate, Monitoring, Counter, Alerting

Description: Monitor error rates in real time using Redis counters with sliding windows to detect anomalies and trigger alerts when error thresholds are exceeded.

---

## Overview

Error rate monitoring tracks the ratio of failed requests to total requests over a time window. Redis provides the atomic counting primitives needed for accurate, high-performance error tracking across distributed services.

## Time-Bucketed Error Counters

```python
import time
import json
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

WINDOW_SIZES = {
    "1min":  60,
    "5min":  300,
    "15min": 900,
    "1hour": 3600
}

def get_bucket_key(service: str, metric: str, window_seconds: int) -> str:
    """Generate a time-bucketed key."""
    bucket = int(time.time()) // window_seconds
    return f"errors:{service}:{metric}:{window_seconds}:{bucket}"

def record_request(service: str, success: bool, endpoint: str = None):
    """Record a request outcome for error rate calculation."""
    pipe = r.pipeline()

    for window_name, window_secs in WINDOW_SIZES.items():
        total_key = get_bucket_key(service, "total", window_secs)
        pipe.incr(total_key)
        pipe.expire(total_key, window_secs * 2)

        if not success:
            error_key = get_bucket_key(service, "errors", window_secs)
            pipe.incr(error_key)
            pipe.expire(error_key, window_secs * 2)

        if endpoint:
            ep_key = get_bucket_key(f"{service}:{endpoint}", "total", window_secs)
            pipe.incr(ep_key)
            pipe.expire(ep_key, window_secs * 2)
            if not success:
                ep_err_key = get_bucket_key(f"{service}:{endpoint}", "errors", window_secs)
                pipe.incr(ep_err_key)
                pipe.expire(ep_err_key, window_secs * 2)

    pipe.execute()

def get_error_rate(service: str, window_name: str = "5min") -> dict:
    """Calculate error rate for the current time window."""
    window_secs = WINDOW_SIZES.get(window_name)
    if not window_secs:
        raise ValueError(f"Unknown window: {window_name}")

    total_key = get_bucket_key(service, "total", window_secs)
    error_key = get_bucket_key(service, "errors", window_secs)

    pipe = r.pipeline()
    pipe.get(total_key)
    pipe.get(error_key)
    total, errors = pipe.execute()

    total = int(total or 0)
    errors = int(errors or 0)

    rate = errors / total if total > 0 else 0.0

    return {
        "service": service,
        "window": window_name,
        "total_requests": total,
        "error_count": errors,
        "error_rate": round(rate, 4),
        "error_rate_pct": round(rate * 100, 2)
    }
```

## Sliding Window Error Rate

For more precise tracking, use a sliding window with Sorted Sets:

```python
def record_request_sliding(
    service: str,
    success: bool,
    window_seconds: int = 300
):
    """Record request using sliding window for accurate rate calculation."""
    now = time.time()
    event_id = f"{now:.6f}"  # Unique ID based on timestamp

    pipe = r.pipeline()

    # Track total requests
    total_key = f"sliding:total:{service}"
    pipe.zadd(total_key, {event_id: now})
    pipe.zremrangebyscore(total_key, 0, now - window_seconds)

    # Track errors separately
    if not success:
        error_key = f"sliding:errors:{service}"
        pipe.zadd(error_key, {f"err:{event_id}": now})
        pipe.zremrangebyscore(error_key, 0, now - window_seconds)

    pipe.execute()

def get_sliding_error_rate(service: str, window_seconds: int = 300) -> dict:
    """Get accurate sliding window error rate."""
    now = time.time()
    cutoff = now - window_seconds

    pipe = r.pipeline()
    pipe.zcount(f"sliding:total:{service}", cutoff, now)
    pipe.zcount(f"sliding:errors:{service}", cutoff, now)
    total, errors = pipe.execute()

    rate = errors / total if total > 0 else 0.0
    return {
        "service": service,
        "window_seconds": window_seconds,
        "total": total,
        "errors": errors,
        "error_rate": round(rate, 4),
        "error_rate_pct": round(rate * 100, 2)
    }
```

## Error Rate Alerting

```python
ALERT_THRESHOLDS = {
    "warning":  0.01,   # 1% error rate
    "critical": 0.05    # 5% error rate
}

def check_and_alert(service: str) -> dict | None:
    """Check error rate and fire alert if threshold exceeded."""
    stats = get_error_rate(service, "5min")
    error_rate = stats["error_rate"]

    if error_rate >= ALERT_THRESHOLDS["critical"]:
        severity = "critical"
    elif error_rate >= ALERT_THRESHOLDS["warning"]:
        severity = "warning"
    else:
        return None  # OK

    # Cooldown to avoid repeated alerts
    cooldown_key = f"alert:cooldown:error_rate:{service}"
    if r.exists(cooldown_key):
        return None

    cooldown_secs = 300 if severity == "critical" else 600
    r.set(cooldown_key, "1", ex=cooldown_secs)

    alert = {
        "type": "error_rate_threshold",
        "service": service,
        "severity": severity,
        "error_rate_pct": stats["error_rate_pct"],
        "total_requests": stats["total_requests"],
        "error_count": stats["error_count"],
        "fired_at": int(time.time())
    }

    r.publish("alerts:error_rate", json.dumps(alert))
    r.lpush("alerts:history", json.dumps(alert))
    r.ltrim("alerts:history", 0, 999)

    return alert
```

## Error Breakdown by Type

```python
def record_error_with_type(service: str, error_type: str):
    """Track error counts by type for root cause analysis."""
    pipe = r.pipeline()

    # Increment error type counter
    error_type_key = f"errors:by_type:{service}:{error_type}"
    pipe.incr(error_type_key)
    pipe.expire(error_type_key, 3600)

    # Track in a Sorted Set for ranking
    pipe.zincrby(f"errors:type_ranking:{service}", 1, error_type)
    pipe.expire(f"errors:type_ranking:{service}", 3600)

    pipe.execute()

def get_error_breakdown(service: str) -> list[dict]:
    """Get error counts ranked by frequency."""
    entries = r.zrevrange(
        f"errors:type_ranking:{service}",
        0, 9,
        withscores=True
    )
    return [
        {"error_type": etype, "count": int(count)}
        for etype, count in entries
    ]
```

## Dashboard Aggregation

```python
def get_service_health_summary(services: list[str]) -> list[dict]:
    """Get error rate summary for multiple services."""
    summaries = []
    for service in services:
        stats = get_error_rate(service, "5min")
        rate = stats["error_rate"]
        status = "ok" if rate < 0.01 else ("degraded" if rate < 0.05 else "critical")
        summaries.append({**stats, "status": status})
    return summaries
```

## Summary

Redis counters with time-bucketed keys provide fast, scalable error rate tracking that works identically across multiple application servers. Sliding window Sorted Sets offer more precise short-window metrics while bucket-based counters are memory-efficient for longer windows. Alerting with cooldown keys prevents notification fatigue during sustained incidents while ensuring the first alert fires immediately.
