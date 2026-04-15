# How to Implement API Rate Limiting with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rate Limiting, Middleware, API, Security

Description: Learn how to implement API rate limiting in Dapr using the built-in rate limit middleware component, Redis-backed token buckets, and per-client quota enforcement.

---

## Rate Limiting in Dapr

Rate limiting protects services from overload and prevents abuse by limiting how many requests a client can make within a time window. Dapr provides a built-in HTTP middleware for simple rate limiting and can be extended with Redis-backed rate limiting for distributed, per-client quotas.

## Using Dapr's Built-In Rate Limit Middleware

Configure the rate limit middleware component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
  namespace: production
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "100"
```

Apply it to a service via the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: ratelimited-config
  namespace: production
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
```

Annotate the deployment to use this configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/config: "ratelimited-config"
```

## Per-Client Rate Limiting with Redis

For distributed per-client rate limiting, implement a token bucket using Dapr state store:

```python
import time
import json
from dapr.clients import DaprClient
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

RATE_LIMIT = 60  # requests per minute
WINDOW = 60      # seconds

def get_client_id(request: Request) -> str:
    # Use JWT sub, API key, or IP as client identifier
    return request.headers.get("X-Client-ID", request.client.host)

def check_rate_limit(client_id: str) -> bool:
    with DaprClient() as dapr:
        key = f"ratelimit:{client_id}"
        result = dapr.get_state("statestore", key)

        now = time.time()
        if result.data:
            bucket = json.loads(result.data)
            # Remove requests outside current window
            bucket["requests"] = [t for t in bucket["requests"] if now - t < WINDOW]
        else:
            bucket = {"requests": []}

        if len(bucket["requests"]) >= RATE_LIMIT:
            return False

        bucket["requests"].append(now)
        dapr.save_state("statestore", key, json.dumps(bucket),
            state_metadata={"ttlInSeconds": str(WINDOW * 2)})
        return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = get_client_id(request)
    if not check_rate_limit(client_id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Retry after 60 seconds.",
            headers={"Retry-After": "60", "X-RateLimit-Limit": str(RATE_LIMIT)}
        )
    response = await call_next(request)
    return response
```

## Tiered Rate Limits

Implement different rate limits for different API tiers:

```python
TIER_LIMITS = {
    "free": {"requests": 60, "window": 60},
    "standard": {"requests": 600, "window": 60},
    "enterprise": {"requests": 6000, "window": 60},
}

def get_client_tier(client_id: str) -> str:
    with DaprClient() as dapr:
        result = dapr.get_state("statestore", f"tier:{client_id}")
        if result.data:
            return result.data.decode("utf-8")
        return "free"

def check_tiered_rate_limit(client_id: str) -> tuple:
    tier = get_client_tier(client_id)
    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    allowed = check_rate_limit_with_params(
        client_id, limit["requests"], limit["window"]
    )
    return allowed, tier, limit["requests"]
```

## Rate Limit Headers

Return standard rate limit headers in responses:

```python
from fastapi.responses import JSONResponse

@app.middleware("http")
async def rate_limit_with_headers(request: Request, call_next):
    client_id = get_client_id(request)
    allowed, tier, limit = check_tiered_rate_limit(client_id)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + 60),
                "Retry-After": "60",
            }
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-Client-Tier"] = tier
    return response
```

## Summary

Dapr rate limiting starts with the built-in `middleware.http.ratelimit` component for simple per-service limits. For distributed per-client rate limiting with tiered quotas, use a Dapr state store to implement a sliding window log that tracks request timestamps per client ID. Return standard `X-RateLimit-*` and `Retry-After` headers to help clients implement appropriate backoff. Store tier information in the state store to enable dynamic quota management without service redeployment.
