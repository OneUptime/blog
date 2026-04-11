# How to Cache Flask API Responses with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Caching, API, Performance

Description: Learn how to cache Flask API responses with Redis using Flask-Caching and custom decorators to reduce database load and improve response times.

---

Caching API responses in Redis is one of the highest-leverage performance improvements for read-heavy Flask services. This guide covers decorator-based caching, manual cache control, and cache invalidation patterns.

## Installation

```bash
pip install Flask-Caching redis
```

## Configuration

```python
from flask import Flask
from flask_caching import Cache

app = Flask(__name__)
app.config.update(
    CACHE_TYPE="RedisCache",
    CACHE_REDIS_URL="redis://localhost:6379/0",
    CACHE_DEFAULT_TIMEOUT=300,
)
cache = Cache(app)
```

## Caching Route Responses

```python
from flask import jsonify

@app.route("/api/products")
@cache.cached(timeout=120, key_prefix="products_list")
def get_products():
    products = Product.query.all()
    return jsonify([{"id": p.id, "name": p.name, "price": p.price} for p in products])

@app.route("/api/product/<int:pid>")
@cache.cached(timeout=60)
def get_product(pid):
    product = Product.query.get_or_404(pid)
    return jsonify({"id": product.id, "name": product.name})
```

## Cache Based on Query Parameters

Flask-Caching uses `request.path` as the default cache key, so query parameters are **not** included by default. Use `query_string=True` to include them:

```python
@app.route("/api/search")
@cache.cached(timeout=60, query_string=True)
def search():
    q = request.args.get("q", "")
    results = Product.query.filter(Product.name.ilike(f"%{q}%")).all()
    return jsonify([p.name for p in results])
```

## Manual Caching for Complex Logic

```python
import json
from flask import request, jsonify

@app.route("/api/report/<int:report_id>")
def get_report(report_id):
    cache_key = f"report:{report_id}:v2"
    cached = cache.get(cache_key)

    if cached is not None:
        return jsonify({"source": "cache", "data": cached})

    # Build the expensive report
    data = {
        "id": report_id,
        "summary": compute_summary(report_id),
        "charts": build_charts(report_id),
    }
    cache.set(cache_key, data, timeout=600)
    return jsonify({"source": "db", "data": data})
```

## Cache Invalidation on Write

```python
@app.route("/api/product/<int:pid>", methods=["PUT"])
def update_product(pid):
    data = request.get_json()
    product = Product.query.get_or_404(pid)
    product.name = data.get("name", product.name)
    product.price = data.get("price", product.price)
    db.session.commit()

    # Bust related cache entries
    cache.delete(f"view//api/product/{pid}")  # default @cache.cached() key is "view/" + request.path
    cache.delete("products_list")              # matches key_prefix used on get_products

    return jsonify({"status": "updated"})
```

## ETag Support for Conditional Caching

Combine Redis caching with ETags to save bandwidth:

```python
import hashlib

@app.route("/api/products")
def products_with_etag():
    cache_key = "products_json"
    data = cache.get(cache_key)

    if data is None:
        products = Product.query.all()
        data = json.dumps([p.to_dict() for p in products])
        cache.set(cache_key, data, timeout=120)

    etag = hashlib.md5(data.encode()).hexdigest()

    if request.headers.get("If-None-Match") == etag:
        return "", 304

    from flask import Response
    return Response(data, mimetype="application/json", headers={"ETag": etag})
```

## Summary

Flask API caching with Redis uses `@cache.cached()` for automatic caching keyed by URL, `query_string=True` to include query params in the cache key, and `cache.get`/`cache.set` for manual control over complex scenarios. Always call `cache.delete()` on the relevant keys after write operations to prevent stale data, and consider ETags for conditional GET optimization.
