# How to Build a Sidecar Cache Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sidecar, Cache, Architecture, Pattern

Description: Implement the sidecar cache pattern by deploying a Redis proxy sidecar alongside your service to intercept reads, serve cached responses, and write-through to the origin without changing...

---

The sidecar cache pattern moves caching logic out of your application and into a co-deployed proxy sidecar. The sidecar intercepts requests, checks Redis, and either returns a cached response or forwards to the origin service, caches the result, and returns it. Your application code remains unchanged.

## When to Use It

The sidecar pattern is useful when:
- You cannot modify the origin service (legacy, third-party)
- You want consistent caching across multiple services
- You need to add caching without a redeployment of the main service

## Sidecar Proxy Design

The sidecar runs as a lightweight HTTP proxy alongside your service:

```python
from flask import Flask, request, Response
import redis
import requests
import json

app = Flask(__name__)
r = redis.Redis()

ORIGIN_URL = "http://localhost:8080"
DEFAULT_TTL = 300

def cache_key(method, path):
    return f"sidecar:{method}:{path}"

@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE"])
def proxy(path):
    if request.method == "GET":
        key = cache_key("GET", request.full_path)
        cached = r.get(key)
        if cached:
            data = json.loads(cached)
            resp = Response(data["body"], status=data["status"],
                           headers=data["headers"])
            resp.headers["X-Cache"] = "HIT"
            return resp

    # Forward to origin
    origin_resp = requests.request(
        method=request.method,
        url=f"{ORIGIN_URL}/{path}",
        headers={k: v for k, v in request.headers if k != "Host"},
        data=request.get_data(),
        params=request.args,
        allow_redirects=False
    )

    if request.method == "GET" and origin_resp.status_code == 200:
        payload = json.dumps({
            "body": origin_resp.text,
            "status": origin_resp.status_code,
            "headers": dict(origin_resp.headers)
        })
        r.setex(cache_key("GET", request.full_path), DEFAULT_TTL, payload)

    return Response(
        origin_resp.content,
        status=origin_resp.status_code,
        headers=dict(origin_resp.headers)
    )
```

## Cache Invalidation on Write

Invalidate cached GET responses when a mutating request succeeds:

```python
def invalidate_by_prefix(path_prefix):
    pattern = f"sidecar:GET:{path_prefix}*"
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        if keys:
            r.delete(*keys)
        if cursor == 0:
            break
```

Call this after successful POST/PUT/DELETE responses.

## Per-Route TTL Configuration

Configure different TTLs for different route patterns:

```python
TTL_RULES = [
    ("/api/products", 600),
    ("/api/users", 60),
    ("/api/rates", 30),
]

def get_ttl(path):
    for prefix, ttl in TTL_RULES:
        if path.startswith(prefix):
            return ttl
    return DEFAULT_TTL
```

## Kubernetes Deployment

In Kubernetes, run the sidecar as a second container in the same pod:

```yaml
spec:
  containers:
  - name: app
    image: my-service:latest
    ports:
    - containerPort: 8080
  - name: cache-sidecar
    image: my-sidecar:latest
    ports:
    - containerPort: 80
    env:
    - name: ORIGIN_URL
      value: "http://localhost:8080"
    - name: REDIS_URL
      value: "redis://redis-service:6379"
```

Route external traffic to port 80 (sidecar) while the app listens on 8080 internally.

## Observability

Log cache hit rates from the sidecar:

```python
r.incr("sidecar:stats:total")
if cache_hit:
    r.incr("sidecar:stats:hits")
```

```python
def hit_rate():
    total = int(r.get("sidecar:stats:total") or 1)
    hits = int(r.get("sidecar:stats:hits") or 0)
    return hits / total
```

## Summary

The sidecar cache pattern moves Redis caching logic into a dedicated proxy co-deployed with each service, eliminating caching code from application logic entirely. Per-route TTL rules and write-through invalidation keep the cache coherent, while Kubernetes pod co-location ensures the sidecar adds minimal network latency compared to a remote proxy.
