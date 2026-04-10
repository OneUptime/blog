# How to Implement Per-IP Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Security

Description: Implement per-IP rate limiting with Redis to protect unauthenticated endpoints from abuse and limit scraping or brute force attacks.

---

Per-IP rate limiting is the first line of defense for public endpoints that do not require authentication - login forms, registration, password reset, and public APIs. Redis handles per-IP counters efficiently, scaling to millions of unique IPs without performance degradation.

## Key Design for Per-IP Limiting

Use the IP address and a time window in the key name to create isolated counters per IP per window:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_ip_rate_limit(
    ip: str,
    limit: int = 60,
    window_seconds: int = 60
) -> dict:
    window = int(time.time() // window_seconds)
    key = f"ratelimit:ip:{ip}:{window}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds + 5)
    pipe.ttl(key)
    results = pipe.execute()

    count, _, ttl = results
    return {
        "allowed": count <= limit,
        "count": count,
        "remaining": max(0, limit - count),
        "reset_in": ttl,
    }
```

## Extracting the Real Client IP

Behind a proxy or CDN, use the `X-Forwarded-For` header:

```python
def get_client_ip(request) -> str:
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        # Take the leftmost (original client) IP
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr
```

## Flask Integration

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.before_request
def ip_rate_limit():
    ip = get_client_ip(request)
    result = check_ip_rate_limit(ip, limit=60, window_seconds=60)

    if not result["allowed"]:
        return jsonify({"error": "Too Many Requests"}), 429
```

## Hardening Login Endpoints

Apply stricter limits to sensitive endpoints:

```python
ENDPOINT_LIMITS = {
    "/auth/login": {"limit": 10, "window": 300},          # 10 per 5 min
    "/auth/password-reset": {"limit": 5, "window": 600},  # 5 per 10 min
    "/api/search": {"limit": 120, "window": 60},           # 120 per min
    "default": {"limit": 60, "window": 60},
}

def check_endpoint_ip_limit(ip: str, path: str) -> dict:
    config = ENDPOINT_LIMITS.get(path, ENDPOINT_LIMITS["default"])
    return check_ip_rate_limit(
        f"{ip}:{path}",
        limit=config["limit"],
        window_seconds=config["window"]
    )
```

## Blocklisting Abusive IPs

Automatically block IPs that trigger limits repeatedly:

```python
BLOCK_THRESHOLD = 5  # Block after 5 limit violations
BLOCK_DURATION = 3600  # Block for 1 hour

def check_with_blocklist(ip: str, limit: int = 60) -> dict:
    block_key = f"blocked:ip:{ip}"
    if r.exists(block_key):
        return {"allowed": False, "blocked": True}

    result = check_ip_rate_limit(ip, limit=limit)

    if not result["allowed"]:
        violation_key = f"violations:ip:{ip}"
        violations = r.incr(violation_key)
        r.expire(violation_key, 3600)

        if violations >= BLOCK_THRESHOLD:
            r.setex(block_key, BLOCK_DURATION, "blocked")

    return result
```

## Monitoring High-Rate IPs

```bash
# Find IPs with highest current rate limit counts
redis-cli --scan --pattern "ratelimit:ip:*" | \
  xargs -I{} sh -c 'echo "{}: $(redis-cli GET {})"' | \
  sort -t: -k5 -rn | head -20
```

## Summary

Per-IP rate limiting with Redis protects unauthenticated and semi-public endpoints from abuse with minimal infrastructure overhead. Combining endpoint-specific limits with an automatic IP blocklist adds layers of protection. Always extract the real client IP from proxy headers to avoid applying limits to your reverse proxy address instead of the actual client.
