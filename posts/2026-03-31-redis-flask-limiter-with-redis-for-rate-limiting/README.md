# How to Use Flask-Limiter with Redis for Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Flask-Limiter, Rate Limiting, API

Description: Learn how to use Flask-Limiter with a Redis storage backend to apply per-IP, per-user, and per-endpoint rate limits in Flask APIs.

---

Flask-Limiter provides decorator-based rate limiting for Flask routes. Using Redis as its storage backend makes limits persistent across restarts and shared across multiple app workers.

## Installation

```bash
pip install Flask-Limiter redis
```

## Basic Setup

```python
from flask import Flask
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

limiter = Limiter(
    get_remote_address,          # key function: identify by IP
    app=app,
    default_limits=["200/day", "50/hour"],
    storage_uri="redis://localhost:6379/0",
    storage_options={"socket_connect_timeout": 30},
    strategy="fixed-window",    # or "moving-window"
)
```

## Applying Limits to Routes

```python
@app.route("/api/products")
@limiter.limit("60/minute")
def product_list():
    return {"products": []}

@app.route("/api/login", methods=["POST"])
@limiter.limit("5/minute;20/hour")  # multiple limits
def login():
    return {"status": "ok"}

@app.route("/api/public")
@limiter.exempt  # no limit on this route
def public_info():
    return {"version": "1.0"}
```

## Per-User Rate Limiting

Use a custom key function to limit by authenticated user instead of IP:

```python
from flask import g, request
from flask_login import current_user

def get_user_or_ip():
    if current_user.is_authenticated:
        return f"user:{current_user.id}"
    return get_remote_address()

limiter = Limiter(
    get_user_or_ip,
    app=app,
    default_limits=["1000/day"],
    storage_uri="redis://localhost:6379/0",
)
```

## Per-Endpoint Overrides

```python
# Higher limit for premium users
@app.route("/api/export")
@limiter.limit("10/hour", key_func=lambda: f"user:{current_user.id}")
@limiter.limit("2/hour", key_func=get_remote_address)
def export_data():
    return {"data": []}
```

## Custom Error Response

```python
from flask import jsonify
from flask_limiter.errors import RateLimitExceeded

@app.errorhandler(RateLimitExceeded)
def handle_rate_limit(e):
    return jsonify({
        "error": "Rate limit exceeded",
        "message": str(e.description),
    }), 429
```

## Adding Rate Limit Headers

```python
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100/hour"],
    storage_uri="redis://localhost:6379/0",
    headers_enabled=True,  # adds X-RateLimit-* headers
)
```

This automatically adds:

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1743500000
```

## Moving Window Strategy

The moving window is more accurate but uses more Redis memory:

```python
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100/hour"],
    storage_uri="redis://localhost:6379/0",
    strategy="moving-window",  # sliding window rate limit
)
```

## Application Factory Pattern

```python
limiter = Limiter(get_remote_address, storage_uri="redis://localhost:6379/0")

def create_app():
    app = Flask(__name__)
    limiter.init_app(app)
    return app
```

## Summary

Flask-Limiter with Redis provides persistent, multi-worker rate limiting in a few lines of code. Use `@limiter.limit()` per route for fine-grained control, `@limiter.exempt` to bypass limits for internal endpoints, and a custom key function to limit per authenticated user rather than per IP. Enable `headers_enabled=True` to surface limit information to API consumers.
