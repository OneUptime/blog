# How to Implement Fixed Window Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API

Description: Implement fixed window rate limiting in Redis using INCR and EXPIRE to cap requests per time window with minimal complexity.

---

Fixed window rate limiting is the simplest and most common rate limiting strategy. It counts requests in discrete time windows (e.g., 100 requests per minute) and rejects any request that exceeds the limit within the current window. Redis's atomic `INCR` command makes this trivially easy to implement.

## How Fixed Window Works

1. Create a key per user/IP per time window (e.g., `ratelimit:user:123:2026033114` for hour 14)
2. Increment the counter on each request with `INCR`
3. Set TTL to the window size on the first request
4. Reject requests when the counter exceeds the limit

## Basic Implementation

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def is_allowed(identifier: str, limit: int = 100, window_seconds: int = 60) -> bool:
    window = int(time.time() // window_seconds)
    key = f"ratelimit:{identifier}:{window}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds)
    results = pipe.execute()

    current_count = results[0]
    return current_count <= limit
```

## Returning Limit Headers

Include rate limit information in your API response headers:

```python
def check_rate_limit(identifier: str, limit: int = 100, window_seconds: int = 60) -> dict:
    window = int(time.time() // window_seconds)
    key = f"ratelimit:{identifier}:{window}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds)
    results = pipe.execute()

    count = results[0]
    remaining = max(0, limit - count)
    reset_at = (window + 1) * window_seconds

    return {
        "allowed": count <= limit,
        "limit": limit,
        "remaining": remaining,
        "reset_at": reset_at,
    }
```

## Flask Middleware Example

```python
from flask import Flask, request, jsonify, g

app = Flask(__name__)

@app.before_request
def rate_limit():
    identifier = request.remote_addr
    result = check_rate_limit(identifier, limit=100, window_seconds=60)

    g.rate_limit_info = result

    if not result['allowed']:
        response = jsonify({"error": "Too Many Requests"})
        response.status_code = 429
        response.headers['X-RateLimit-Limit'] = result['limit']
        response.headers['X-RateLimit-Remaining'] = 0
        response.headers['X-RateLimit-Reset'] = result['reset_at']
        return response

@app.after_request
def add_rate_limit_headers(response):
    if hasattr(g, 'rate_limit_info'):
        info = g.rate_limit_info
        response.headers['X-RateLimit-Limit'] = info['limit']
        response.headers['X-RateLimit-Remaining'] = info['remaining']
        response.headers['X-RateLimit-Reset'] = info['reset_at']
    return response
```

## Limitations of Fixed Window

The main drawback is the boundary burst problem: a user can make `limit` requests at the end of one window and `limit` more at the start of the next, effectively doubling the rate at the boundary. For most APIs this is acceptable.

```text
Window 1: ...........| 100 requests in last 1s
Window 2: 100 req |...

= 200 requests in 2 seconds despite a "100/min" limit
```

For stricter limits, use sliding window rate limiting instead.

## Checking Counter State

```bash
# View current request count in this window
redis-cli GET "ratelimit:192.168.1.1:$(date +%s | awk '{print int($1/60)}')"

# View TTL on the rate limit key
redis-cli TTL "ratelimit:192.168.1.1:$(date +%s | awk '{print int($1/60)}')"
```

## Summary

Fixed window rate limiting with Redis requires just two commands - `INCR` and `EXPIRE` - making it extremely fast and easy to implement. The atomic pipeline ensures no race conditions. It is well-suited for most production API rate limiting scenarios where the boundary burst edge case is acceptable, and it serves as an excellent foundation before moving to more complex algorithms.
