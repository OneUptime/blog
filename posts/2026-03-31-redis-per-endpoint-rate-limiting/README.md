# How to Implement Per-Endpoint Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API

Description: Configure different Redis rate limits per API endpoint so expensive or sensitive routes get stricter quotas than standard endpoints.

---

A single global rate limit treats all your API endpoints the same. A database query endpoint, an export endpoint, and a health check endpoint have very different cost profiles. Per-endpoint rate limiting lets you set granular quotas per route, protecting expensive operations without over-restricting cheap ones.

## Key Design

Include the endpoint path in the rate limit key:

```python
import redis
import time
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_rate_limit(
    identifier: str,
    endpoint: str,
    limit: int,
    window_seconds: int
) -> dict:
    window = int(time.time() // window_seconds)
    key = f"ratelimit:{endpoint}:{identifier}:{window}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds + 5)
    pipe.ttl(key)
    results = pipe.execute()

    count, _, ttl = results
    return {
        "allowed": count <= limit,
        "limit": limit,
        "count": count,
        "remaining": max(0, limit - count),
        "reset_in": ttl,
        "endpoint": endpoint,
    }
```

## Centralized Endpoint Limits Configuration

Define limits per endpoint in a configuration dict:

```python
ENDPOINT_RATE_LIMITS = {
    "GET:/api/products": {"limit": 300, "window": 60},
    "GET:/api/products/search": {"limit": 50, "window": 60},
    "POST:/api/orders": {"limit": 20, "window": 60},
    "GET:/api/reports/export": {"limit": 5, "window": 300},
    "POST:/api/auth/login": {"limit": 10, "window": 300},
    "GET:/api/health": {"limit": 1000, "window": 60},
    # Default fallback
    "default": {"limit": 100, "window": 60},
}

def get_endpoint_config(method: str, path: str) -> dict:
    key = f"{method}:{path}"
    return ENDPOINT_RATE_LIMITS.get(key, ENDPOINT_RATE_LIMITS["default"])
```

## Flask Middleware with Per-Endpoint Limits

```python
from flask import Flask, request, jsonify, g

app = Flask(__name__)

def get_requester_id() -> str:
    # Use authenticated user ID if available, fall back to IP
    auth_user = getattr(g, 'user_id', None)
    if auth_user:
        return f"user:{auth_user}"
    return f"ip:{request.remote_addr}"

@app.before_request
def endpoint_rate_limit():
    config = get_endpoint_config(request.method, request.path)
    identifier = get_requester_id()
    endpoint_key = f"{request.method}:{request.path}"

    result = check_rate_limit(
        identifier=identifier,
        endpoint=endpoint_key,
        limit=config["limit"],
        window_seconds=config["window"]
    )

    g.rate_limit_result = result

    if not result["allowed"]:
        return jsonify({
            "error": "Rate limit exceeded",
            "endpoint": endpoint_key,
            "retry_after": result["reset_in"]
        }), 429

@app.after_request
def set_rate_limit_headers(response):
    if hasattr(g, 'rate_limit_result'):
        r_info = g.rate_limit_result
        response.headers['X-RateLimit-Limit'] = r_info.get('limit', 0)
        response.headers['X-RateLimit-Remaining'] = r_info.get('remaining', 0)
        response.headers['X-RateLimit-Reset'] = r_info.get('reset_in', 0)
    return response
```

## Dynamic Limit Updates Without Redeployment

Store limits in Redis so they can be updated at runtime:

```python
def set_dynamic_limit(endpoint: str, limit: int, window: int):
    r.hset(f"config:ratelimit:{endpoint}", mapping={"limit": limit, "window": window})

def get_dynamic_limit(endpoint: str) -> Optional[dict]:
    config = r.hgetall(f"config:ratelimit:{endpoint}")
    if config:
        return {"limit": int(config["limit"]), "window": int(config["window"])}
    return None
```

## Checking Current Usage Per Endpoint

```bash
# Current usage for search endpoint
redis-cli --scan --pattern "ratelimit:GET:/api/products/search:*"

# Count active requesters on a specific endpoint
redis-cli --scan --pattern "ratelimit:POST:/api/orders:*" | wc -l
```

## Summary

Per-endpoint rate limiting gives you fine-grained control over API resource usage. By including the endpoint path in the Redis key, each route gets its own independent quota. Centralizing limit configurations and supporting dynamic updates from Redis means you can tighten limits on misbehaving endpoints in real time without redeploying your application.
