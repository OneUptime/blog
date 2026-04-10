# Validation Summary: How to Set Up Flask-Caching with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flask (Python web framework)
- Flask-Caching (caching extension for Flask)
- Redis (cache backend)
- Python `redis` package

## Sources Consulted
- Flask-Caching official documentation: https://flask-caching.readthedocs.io/
- Flask-Caching PyPI page: https://pypi.org/project/Flask-Caching/
- Flask-Caching source code (cache key generation in `cached()` decorator)

## Issues Found
1. **Incorrect cache key in invalidation example (Cache Invalidation on Writes section)**
   - **What was wrong:** The code used `cache.delete(f"product_detail_{product_id}")` to invalidate the cached `product_detail` view. However, the `product_detail` view was defined with `@cache.cached(timeout=60)` using the default `key_prefix="view/%s"`, which generates cache keys in the format `"view/" + request.path`. For a request to `/product/42`, the actual cache key is `"view//product/42"`, not `"product_detail_42"`. The `cache.delete()` call would silently fail to invalidate the cached response.
   - **What was changed:** Updated the `cache.delete()` call to use the correct default key format: `cache.delete(f"view//product/{product_id}")`. Added comments explaining the default key format used by `@cache.cached()`.
   - **Why:** Without this fix, readers following the tutorial would have a broken cache invalidation that silently does nothing, serving stale data after writes.

## Review Notes
- The double slash in `"view//product/{product_id}"` is correct — it results from `"view/%s" % "/product/42"` since `request.path` includes the leading `/`. This is an internal detail of Flask-Caching's default key generation.
- All other code examples (installation, configuration, view caching, memoize, manual operations, per-user caching) are accurate and use current Flask-Caching APIs (verified against v2.x).
- `CACHE_TYPE = "RedisCache"` is the current recommended value; the older `"redis"` string is deprecated.
- The application factory pattern with `cache.init_app(app)` is correctly demonstrated.
- `cache.delete_many()` accepting positional args and `cache.delete_memoized()` with specific arguments are both correctly shown.
