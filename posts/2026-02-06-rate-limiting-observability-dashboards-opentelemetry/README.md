# How to Build Rate Limiting Observability Dashboards with OpenTelemetry Counters and Histograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rate Limiting, Dashboards, Counters and Histograms

Description: Build rate limiting observability dashboards using OpenTelemetry counters and histograms to visualize throttling behavior and tune limits.

Rate limiting is one of those things that seems simple until it is not. You set a threshold, reject requests above it, and move on. But then customers complain about being throttled, your team cannot tell if limits are too strict or too loose, and nobody knows if the rate limiter is actually protecting the system. Dashboards built on OpenTelemetry counters and histograms turn rate limiting from a black box into something you can reason about.

## The Metrics You Need

There are four categories of metrics that make up a complete rate limiting dashboard:

```python
# rate_limit_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("rate_limiting.dashboard")

# 1. Decision metrics - what the rate limiter decided
rate_limit_decisions = meter.create_counter(
    "rate_limit.decisions",
    description="Rate limit decisions (allow/reject)",
    unit="1",
)

# 2. Utilization metrics - how close to the limit
rate_limit_utilization = meter.create_histogram(
    "rate_limit.utilization",
    description="Current usage as percentage of limit",
    unit="%",
    explicit_bucket_boundaries=[10, 25, 50, 75, 80, 90, 95, 99, 100],
)

# 3. Headroom metrics - how much capacity remains
rate_limit_remaining = meter.create_histogram(
    "rate_limit.remaining",
    description="Remaining requests before hitting the limit",
    unit="1",
)

# 4. Latency impact - does rate limit checking add latency
rate_limit_check_duration = meter.create_histogram(
    "rate_limit.check_duration",
    description="Time spent checking rate limits",
    unit="ms",
    explicit_bucket_boundaries=[0.1, 0.5, 1, 2, 5, 10, 25, 50],
)

# Burst metrics
rate_limit_burst_counter = meter.create_counter(
    "rate_limit.bursts",
    description="Number of traffic bursts detected",
    unit="1",
)

# Retry-After header values
retry_after_histogram = meter.create_histogram(
    "rate_limit.retry_after",
    description="Retry-After header values sent to clients",
    unit="seconds",
)
```

## Instrumented Rate Limiter

Here is a rate limiter that emits all the metrics your dashboard needs:

```python
# instrumented_rate_limiter.py
import time
import redis

class InstrumentedRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def check(self, key: str, limit: int, window_seconds: int,
              attributes: dict = None) -> dict:
        """Check rate limit and emit comprehensive metrics."""
        attrs = attributes or {}
        start = time.time()

        # Sliding window rate limit check
        now = time.time()
        window_key = f"ratelimit:{key}:{int(now // window_seconds)}"

        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds * 2)
        results = pipe.execute()

        current_count = results[0]
        allowed = current_count <= limit

        # Calculate utilization and remaining
        utilization_pct = (current_count / limit) * 100
        remaining = max(0, limit - current_count)
        check_duration_ms = (time.time() - start) * 1000

        # Record decision
        rate_limit_decisions.add(1, {
            **attrs,
            "rate_limit.decision": "allow" if allowed else "reject",
        })

        # Record utilization
        rate_limit_utilization.record(min(utilization_pct, 100), attrs)

        # Record remaining capacity
        rate_limit_remaining.record(remaining, attrs)

        # Record check latency
        rate_limit_check_duration.record(check_duration_ms, attrs)

        # Detect bursts (utilization jumped significantly)
        if utilization_pct > 80:
            prev_count = self._get_previous_window_count(key, window_seconds)
            if prev_count > 0 and current_count > prev_count * 2:
                rate_limit_burst_counter.add(1, attrs)

        result = {
            "allowed": allowed,
            "current": current_count,
            "limit": limit,
            "remaining": remaining,
            "utilization_pct": utilization_pct,
        }

        if not allowed:
            retry_after = window_seconds - (now % window_seconds)
            retry_after_histogram.record(retry_after, attrs)
            result["retry_after"] = int(retry_after)

        return result

    def _get_previous_window_count(self, key, window_seconds):
        now = time.time()
        prev_key = f"ratelimit:{key}:{int(now // window_seconds) - 1}"
        val = self.redis.get(prev_key)
        return int(val) if val else 0
```

## Per-Endpoint Rate Limiting Metrics

Different endpoints deserve different limits and separate dashboard panels:

```python
# endpoint_rate_limits.py
ENDPOINT_LIMITS = {
    "POST /api/search": {"limit": 30, "window": 60, "tier": "standard"},
    "POST /api/export": {"limit": 5, "window": 60, "tier": "heavy"},
    "GET /api/users": {"limit": 100, "window": 60, "tier": "standard"},
    "POST /api/webhooks": {"limit": 10, "window": 60, "tier": "heavy"},
}

async def rate_limit_middleware(request, call_next):
    """Apply per-endpoint rate limits with full metric emission."""
    endpoint_key = f"{request.method} {request.url.path}"
    config = ENDPOINT_LIMITS.get(endpoint_key)

    if not config:
        return await call_next(request)

    tenant_id = request.state.tenant_id
    rate_key = f"{tenant_id}:{endpoint_key}"

    result = rate_limiter.check(
        key=rate_key,
        limit=config["limit"],
        window_seconds=config["window"],
        attributes={
            "rate_limit.endpoint": endpoint_key,
            "rate_limit.tier": config["tier"],
            "tenant.id": tenant_id,
        },
    )

    if not result["allowed"]:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after": result["retry_after"]},
            headers={
                "Retry-After": str(result["retry_after"]),
                "X-RateLimit-Limit": str(result["limit"]),
                "X-RateLimit-Remaining": "0",
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(result["limit"])
    response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
    return response
```

## Dashboard Layout

With these metrics, build a dashboard with these panels:

**Overview Panel**
- Total requests allowed vs. rejected (counter, stacked area chart)
- Overall rejection rate as a percentage (derived metric)

**Utilization Panel**
- Heatmap of `rate_limit.utilization` showing how close tenants are to their limits
- This reveals which tenants consistently operate near their ceiling

**Per-Endpoint Panel**
- Rejection rate by endpoint (helps you find endpoints where limits are too tight)
- P95 and P99 utilization per endpoint

**Tenant Panel**
- Top 10 tenants by rejection count
- Tenant utilization distribution

**Operational Panel**
- Rate limit check latency (P50, P95, P99) to ensure the limiter is not adding noticeable overhead
- Burst detection events over time
- Retry-After distribution (tells you how long rejected clients are being asked to wait)

```python
# Example PromQL-style queries for each panel
queries = {
    "rejection_rate": 'rate(rate_limit_decisions{rate_limit_decision="reject"}[5m]) / rate(rate_limit_decisions[5m])',
    "utilization_p95": 'histogram_quantile(0.95, rate(rate_limit_utilization_bucket[5m]))',
    "top_rejected_tenants": 'topk(10, sum by (tenant_id) (rate(rate_limit_decisions{rate_limit_decision="reject"}[1h])))',
    "check_latency_p99": 'histogram_quantile(0.99, rate(rate_limit_check_duration_bucket[5m]))',
}
```

## Making Dashboards Actionable

A good rate limiting dashboard does not just show numbers. It answers questions: "Should we increase the limit on the export endpoint?" (Check if many legitimate tenants are hitting it.) "Is our rate limiter adding too much latency?" (Check the check_duration P99.) "Which tenants should we reach out to about upgrading their plan?" (Check who is consistently above 80% utilization.) The metrics from OpenTelemetry give you everything you need to make these decisions with data instead of guesswork.
