# How to Monitor SaaS API Rate Limiting and Quota Enforcement Across Tenants with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rate Limiting, API Quotas, Multi-Tenant

Description: Monitor API rate limiting and quota enforcement across tenants in your SaaS platform using OpenTelemetry metrics and traces.

Rate limiting protects your SaaS platform from abuse and ensures fair resource distribution across tenants. But rate limiting without observability is flying blind. You need to know which tenants are hitting limits, whether your limits are set correctly, and when legitimate traffic is being incorrectly throttled. OpenTelemetry gives you the instrumentation to answer all of these questions.

## Instrumenting the Rate Limiter

Here is a rate limiter middleware that emits OpenTelemetry metrics for every decision it makes:

```python
# rate_limiter.py
from opentelemetry import metrics, trace
import redis
import time

meter = metrics.get_meter("api.rate_limiting")
tracer = trace.get_tracer("api.rate_limiting")

# Metrics for rate limiting decisions
rate_limit_checks = meter.create_counter(
    "api.rate_limit.checks",
    description="Number of rate limit checks performed",
    unit="1",
)

rate_limit_rejections = meter.create_counter(
    "api.rate_limit.rejections",
    description="Requests rejected due to rate limiting",
    unit="1",
)

quota_usage_gauge = meter.create_histogram(
    "api.quota.usage_percent",
    description="Current quota usage as a percentage",
    unit="%",
)

class TenantRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def check_rate_limit(self, tenant_id: str, endpoint: str, plan: str) -> dict:
        """Check if a request should be allowed or rejected."""
        with tracer.start_as_current_span(
            "rate_limit.check",
            attributes={
                "tenant.id": tenant_id,
                "api.endpoint": endpoint,
                "tenant.plan": plan,
            }
        ) as span:
            limits = self._get_plan_limits(plan)
            key = f"ratelimit:{tenant_id}:{endpoint}"

            # Get current usage from Redis
            current = self.redis.get(key)
            current_count = int(current) if current else 0

            allowed = current_count < limits["requests_per_minute"]
            usage_percent = (current_count / limits["requests_per_minute"]) * 100

            # Record metrics
            rate_limit_checks.add(1, {
                "tenant.id": tenant_id,
                "tenant.plan": plan,
                "api.endpoint": endpoint,
                "rate_limit.allowed": str(allowed),
            })

            quota_usage_gauge.record(usage_percent, {
                "tenant.id": tenant_id,
                "tenant.plan": plan,
            })

            if not allowed:
                rate_limit_rejections.add(1, {
                    "tenant.id": tenant_id,
                    "tenant.plan": plan,
                    "api.endpoint": endpoint,
                })
                span.set_attribute("rate_limit.rejected", True)
                span.set_attribute("rate_limit.current_count", current_count)
                span.set_attribute("rate_limit.limit", limits["requests_per_minute"])

            return {
                "allowed": allowed,
                "current": current_count,
                "limit": limits["requests_per_minute"],
                "remaining": max(0, limits["requests_per_minute"] - current_count),
                "reset_at": self._get_reset_time(key),
            }

    def _get_plan_limits(self, plan: str) -> dict:
        """Return rate limits based on tenant plan."""
        plan_limits = {
            "free": {"requests_per_minute": 60, "daily_quota": 1000},
            "pro": {"requests_per_minute": 600, "daily_quota": 50000},
            "enterprise": {"requests_per_minute": 6000, "daily_quota": 500000},
        }
        return plan_limits.get(plan, plan_limits["free"])
```

## Middleware Integration

Wire the rate limiter into your API framework:

```python
# rate_limit_middleware.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limiter: TenantRateLimiter):
        super().__init__(app)
        self.rate_limiter = rate_limiter

    async def dispatch(self, request: Request, call_next):
        tenant_id = request.state.tenant_id
        plan = request.state.tenant_plan
        endpoint = f"{request.method} {request.url.path}"

        result = self.rate_limiter.check_rate_limit(tenant_id, endpoint, plan)

        # Always add rate limit headers
        if not result["allowed"]:
            return Response(
                content='{"error": "Rate limit exceeded"}',
                status_code=429,
                headers={
                    "X-RateLimit-Limit": str(result["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(result["reset_at"]),
                    "Retry-After": str(result["reset_at"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result["limit"])
        response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
        return response
```

## Daily Quota Tracking

Beyond per-minute rate limits, most SaaS platforms enforce daily or monthly quotas:

```python
# quota_tracker.py
from opentelemetry import metrics

meter = metrics.get_meter("api.quotas")

daily_quota_counter = meter.create_counter(
    "api.quota.daily_usage",
    description="Daily API usage count per tenant",
    unit="1",
)

quota_exceeded_counter = meter.create_counter(
    "api.quota.exceeded",
    description="Number of times a tenant exceeded their quota",
    unit="1",
)

quota_remaining = meter.create_histogram(
    "api.quota.remaining_percent",
    description="Remaining quota as percentage of total",
    unit="%",
)

def track_quota_usage(tenant_id: str, plan: str, daily_used: int, daily_limit: int):
    """Track daily quota usage for a tenant."""
    daily_quota_counter.add(1, {
        "tenant.id": tenant_id,
        "tenant.plan": plan,
    })

    remaining_pct = max(0, ((daily_limit - daily_used) / daily_limit) * 100)
    quota_remaining.record(remaining_pct, {
        "tenant.id": tenant_id,
        "tenant.plan": plan,
    })

    # Alert when quota is nearly exhausted
    if remaining_pct < 10:
        notify_tenant_quota_warning(tenant_id, remaining_pct)

    if daily_used >= daily_limit:
        quota_exceeded_counter.add(1, {
            "tenant.id": tenant_id,
            "tenant.plan": plan,
        })
```

## Alerting on Rate Limiting Anomalies

Set up alerts for these scenarios:

- A tenant suddenly hitting rate limits when they were not before (possible bug in their integration)
- Rate limit rejections increasing across all tenants (possible infrastructure issue)
- A free-tier tenant consistently hitting limits (upgrade opportunity)

The combination of per-tenant metrics and trace data lets you distinguish between legitimate high traffic, misconfigured client applications, and actual abuse. When your support team gets a "my API calls are failing" ticket, they can look up the tenant's rate limit metrics and see exactly when throttling started and which endpoints were affected.

## Wrapping Up

Rate limiting observability transforms a blunt protection mechanism into a data source for capacity planning, customer success, and abuse detection. By instrumenting every rate limit check with OpenTelemetry, you turn a simple yes/no decision into rich operational data that benefits multiple teams across your organization.
