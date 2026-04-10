# How to Set Up Flask-Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Caching, Flask-Caching, Performance

Description: Learn how to configure Flask-Caching with a Redis backend to cache view responses, function results, and arbitrary data in your Flask application.

---

Flask-Caching is the standard caching extension for Flask. It supports multiple backends and integrates cleanly with Redis via the `redis` package.

## Installation

```bash
pip install Flask-Caching redis
```

## Configuration

```python
from flask import Flask
from flask_caching import Cache

app = Flask(__name__)

app.config["CACHE_TYPE"] = "RedisCache"
app.config["CACHE_REDIS_URL"] = "redis://localhost:6379/0"
app.config["CACHE_DEFAULT_TIMEOUT"] = 300  # 5 minutes

cache = Cache(app)
```

Or use application factory pattern:

```python
cache = Cache()

def create_app():
    app = Flask(__name__)
    app.config.update(
        CACHE_TYPE="RedisCache",
        CACHE_REDIS_URL="redis://localhost:6379/0",
        CACHE_DEFAULT_TIMEOUT=300,
    )
    cache.init_app(app)
    return app
```

## Caching View Functions

```python
@app.route("/products")
@cache.cached(timeout=120, key_prefix="products_list")
def product_list():
    # This code only runs on cache miss
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])
```

For routes with URL parameters, Flask-Caching generates the key from the full request URL by default:

```python
@app.route("/product/<int:product_id>")
@cache.cached(timeout=60)
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())
```

## Caching Functions with memoize

```python
@cache.memoize(timeout=600)
def get_user_stats(user_id):
    # Cached per unique user_id argument
    orders = Order.query.filter_by(user_id=user_id).all()
    return {
        "total_orders": len(orders),
        "total_spent": sum(o.amount for o in orders)
    }

# Call it normally
stats = get_user_stats(42)
```

## Manual Cache Operations

```python
# Set and get
cache.set("my_key", {"data": "value"}, timeout=60)
value = cache.get("my_key")

# Check and set
if cache.get("expensive_result") is None:
    result = run_expensive_computation()
    cache.set("expensive_result", result, timeout=300)

# Delete
cache.delete("my_key")

# Delete multiple keys
cache.delete_many("key1", "key2", "key3")

# Clear all cache
cache.clear()
```

## Cache Invalidation on Writes

```python
from flask import request, jsonify

@app.route("/product/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.get_json()
    product = Product.query.get_or_404(product_id)
    product.name = data.get("name", product.name)
    db.session.commit()

    # Invalidate cached product detail view
    # Default @cache.cached() key is "view/" + request.path
    cache.delete(f"view//product/{product_id}")
    cache.delete_memoized(get_user_stats, product.user_id)

    return jsonify(product.to_dict())
```

## Vary Cache by User

```python
from flask_login import current_user

@app.route("/dashboard")
@cache.cached(timeout=120, key_prefix=lambda: f"dashboard:{current_user.id}")
def dashboard():
    return render_template("dashboard.html")
```

## Summary

Flask-Caching with Redis is configured in three lines and used via `@cache.cached()` for views and `@cache.memoize()` for functions. Use `key_prefix` to control cache key naming, `cache.delete_memoized()` for targeted invalidation after writes, and `lambda` key prefixes to create per-user cache entries.
