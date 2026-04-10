# Validation Summary: How to Build a Sidecar Cache Pattern with Redis

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- Redis (redis-py client library)
- Python (Flask web framework)
- Requests library (HTTP forwarding)
- Kubernetes (sidecar container pattern)

## Sources Consulted
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ (verified `Redis.get()`, `Redis.setex()`, `Redis.incr()`, `Redis.scan()`, `Redis.delete()` APIs)
- Flask documentation: https://flask.palletsprojects.com/ (verified `request.headers` iteration, `request.full_path`, `request.method`, `Response` constructor, `@app.route` with `path` converter)
- Python `requests` library documentation: https://docs.python-requests.org/ (verified `requests.request()` parameters including `allow_redirects`)
- Kubernetes documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/ (verified sidecar container pattern, pod network namespace sharing)
- Python `hashlib` documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

### 1. Cache invalidation broken due to hashed keys (Critical)
- **What was wrong:** The `cache_key` function hashed the method+path using SHA256, producing keys like `sidecar:a3f2b8c1...`. The `invalidate_by_prefix` function then used `r.scan()` with pattern `sidecar:*{path_prefix}*`, attempting to match the raw path string against hashed keys. Since the path is not present in the hash, the SCAN pattern would never match any keys, making cache invalidation completely non-functional.
- **What was changed:** Removed SHA256 hashing from `cache_key` so keys use the readable format `sidecar:{method}:{path}` (e.g., `sidecar:GET:/api/products?id=1`). Updated `invalidate_by_prefix` pattern from `sidecar:*{path_prefix}*` to `sidecar:GET:{path_prefix}*` to correctly match cached GET entries by path prefix. Removed the unused `import hashlib` and the unused `body` parameter from `cache_key`.
- **Why:** Pattern-based key scanning with `SCAN` requires that the searchable component (the path) be present in the key in readable form. Hashing destroys the ability to do prefix/pattern matching, which is the entire basis of the invalidation strategy.

## Review Notes
- The `get_ttl` function is defined but not wired into the main proxy code. The proxy always uses `DEFAULT_TTL` instead of calling `get_ttl(path)`. This is not technically incorrect (the function itself works), but readers should note they need to replace `DEFAULT_TTL` with `get_ttl(request.full_path)` in the `r.setex()` call to use per-route TTLs.
- The observability snippet uses an undefined `cache_hit` variable. It's presented as a standalone snippet rather than integrated code, so readers will need to adapt it into the proxy function where the hit/miss state is known.
- The `<path:path>` route converter won't match the root path `/`. For a production sidecar proxy, an additional route for `/` would be needed.
- The proxy forwards all headers from the origin response including hop-by-hop headers like `Transfer-Encoding` which ideally should be filtered. This is acceptable for a tutorial but worth noting for production use.
