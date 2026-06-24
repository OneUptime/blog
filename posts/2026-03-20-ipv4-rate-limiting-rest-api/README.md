# How to Implement IPv4 Address-Based Rate Limiting in REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, IPv4, Rate Limiting, Python, Node.js, Redis

Description: Learn how to implement per-IP rate limiting in REST APIs using sliding window and token bucket algorithms in Python and Node.js, with Redis for distributed deployments.

## Python / Flask: Simple In-Memory Rate Limiter

```python
from flask import Flask, request, jsonify
from collections import defaultdict
import time, threading
from werkzeug.middleware.proxy_fix import ProxyFix

app   = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)  # Only if behind one trusted proxy
_lock = threading.Lock()

# Sliding window: {ip: [timestamp, ...]}

_windows: dict[str, list[float]] = defaultdict(list)

LIMIT   = 100    # requests
WINDOW  = 60.0   # seconds

def is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    with _lock:
        ts = _windows[ip]
        # Remove timestamps outside the window
        cutoff = now - WINDOW
        _windows[ip] = [t for t in ts if t > cutoff]
        if len(_windows[ip]) >= LIMIT:
            return True
        _windows[ip].append(now)
        return False

@app.before_request
def rate_limit():
    ip = request.remote_addr or "unknown"
    if is_rate_limited(ip):
        return jsonify(error="rate limit exceeded"), 429

@app.get("/api/data")
def data():
    return jsonify(result="ok")
```

## Python / Flask + Redis: Distributed Fixed-Window Rate Limiter

```python
import redis
import time
from flask import Flask, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)  # Only if behind one trusted proxy
r   = redis.Redis(host="localhost", port=6379, decode_responses=True)

LIMIT  = 100
WINDOW = 60  # seconds

RATE_LIMIT_SCRIPT = """
local current = redis.call("INCR", KEYS[1])
if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
"""
check_window = r.register_script(RATE_LIMIT_SCRIPT)

def check_rate_limit(ip: str) -> tuple[bool, int, int]:
    """Returns (is_limited, remaining, retry_after)."""
    key = f"rl:{ip}"
    count, ttl = check_window(keys=[key], args=[WINDOW])
    count = int(count)
    retry_after = max(int(ttl), 0)
    remaining = max(0, LIMIT - count)
    return count > LIMIT, remaining, retry_after

@app.before_request
def rate_limit():
    ip = request.remote_addr or "unknown"
    limited, remaining, retry_after = check_rate_limit(ip)
    if limited:
        reset_at = int(time.time()) + retry_after
        resp = jsonify(error="Too Many Requests")
        resp.headers["X-RateLimit-Limit"]     = LIMIT
        resp.headers["X-RateLimit-Remaining"] = 0
        resp.headers["X-RateLimit-Reset"]     = reset_at
        resp.headers["Retry-After"]           = retry_after
        return resp, 429
```

## Node.js / Express: express-rate-limit

```javascript
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

async function main() {
    const app = express();
    app.set("trust proxy", 1);  // Trust one reverse proxy so req.ip reflects the client IP

    const client = createClient({ url: "redis://localhost:6379" });
    client.on("error", (err) => console.error("Redis Client Error", err));
    await client.connect();

    const limiter = rateLimit({
        windowMs: 60 * 1000,   // 1 minute
        limit: 100,            // requests per window per IP
        standardHeaders: false,
        legacyHeaders: true,   // Return legacy X-RateLimit-* headers
        store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
        handler: (req, res) => {
            res.status(429).json({ error: "Too Many Requests" });
        },
    });

    app.use("/api/", limiter);

    app.get("/api/data", (req, res) => {
        res.json({ result: "ok" });
    });

    app.listen(3000);
}

main().catch(console.error);
```

## Rate Limiting Headers

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until client can retry (on 429) |

## Conclusion

In-memory rate limiting works for single-instance deployments but loses state on restart and doesn't share across replicas. Redis-backed rate limiting is the production standard for distributed systems. Always extract the real client IP before using it as the rate limit key - trust forwarded headers only through correctly configured proxy middleware. Return consistent `X-RateLimit-*` headers and `Retry-After` on 429 responses to help well-behaved clients back off gracefully.
