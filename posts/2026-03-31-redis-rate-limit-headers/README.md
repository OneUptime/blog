# How to Return Rate Limit Headers (X-RateLimit-*) with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API

Description: Add standard X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers to your API using Redis rate limit data.

---

Returning rate limit information in response headers is a widely adopted convention that helps API consumers understand their quota status, implement backoff, and avoid hitting limits. The standard `X-RateLimit-*` headers give clients everything they need to self-regulate their request rate.

## Standard Rate Limit Headers

```text
X-RateLimit-Limit:     Maximum requests allowed in the window
X-RateLimit-Remaining: Requests remaining in the current window
X-RateLimit-Reset:     Unix timestamp when the window resets
Retry-After:           Seconds to wait after a 429 (required on limit exceeded)
```

## Rate Limit Check with Header Data

```python
import redis
import time
import math

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_rate_limit(identifier: str, limit: int = 100, window: int = 60) -> dict:
    now = time.time()
    current_window = int(now // window)
    key = f"rl:{identifier}:{current_window}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window + 5)
    pipe.ttl(key)
    results = pipe.execute()

    count = results[0]
    ttl = max(0, results[2])
    reset_at = (current_window + 1) * window

    return {
        "allowed": count <= limit,
        "limit": limit,
        "remaining": max(0, limit - count),
        "reset_at": int(reset_at),
        "retry_after": ttl if count > limit else None,
    }
```

## Flask: Attaching Headers to Every Response

```python
from flask import Flask, request, jsonify, g

app = Flask(__name__)

@app.before_request
def rate_limit_check():
    identifier = request.remote_addr
    result = check_rate_limit(identifier, limit=100, window=60)
    g.rl = result

    if not result["allowed"]:
        response = jsonify({"error": "Too Many Requests"})
        response.status_code = 429
        _set_rl_headers(response, result)
        return response

@app.after_request
def add_rate_limit_headers(response):
    if hasattr(g, 'rl'):
        _set_rl_headers(response, g.rl)
    return response

def _set_rl_headers(response, rl: dict):
    response.headers['X-RateLimit-Limit'] = rl['limit']
    response.headers['X-RateLimit-Remaining'] = rl['remaining']
    response.headers['X-RateLimit-Reset'] = rl['reset_at']
    if rl.get('retry_after') is not None:
        response.headers['Retry-After'] = rl['retry_after']
```

## Express.js Example

```javascript
const redis = require('redis');
const client = redis.createClient();

async function rateLimitMiddleware(req, res, next) {
    const identifier = req.ip;
    const window = Math.floor(Date.now() / 1000 / 60);
    const key = `rl:${identifier}:${window}`;

    const count = await client.incr(key);
    await client.expire(key, 65);

    const limit = 100;
    const remaining = Math.max(0, limit - count);
    const resetAt = (window + 1) * 60;

    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', remaining);
    res.set('X-RateLimit-Reset', resetAt);

    if (count > limit) {
        res.set('Retry-After', 60);
        return res.status(429).json({ error: 'Too Many Requests' });
    }
    next();
}
```

## Testing Headers with curl

```bash
# Make a request and inspect headers
curl -I https://api.example.com/v1/data

# Sample response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 73
# X-RateLimit-Reset: 1743432060
```

## Handling 429 Responses on the Client Side

```python
import requests
import time

def api_call_with_backoff(url: str) -> dict:
    response = requests.get(url)
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 5))
        print(f"Rate limited. Waiting {retry_after}s...")
        time.sleep(retry_after)
        return api_call_with_backoff(url)
    return response.json()
```

## Summary

Adding `X-RateLimit-*` headers to every API response is a low-cost improvement that significantly improves API usability. Pull limit, remaining, and reset values from your Redis rate limit check and attach them in an `after_request` hook so all routes benefit automatically. Always include `Retry-After` on 429 responses to enable automatic client-side backoff.
