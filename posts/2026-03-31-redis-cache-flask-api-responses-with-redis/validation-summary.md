# Validation Summary: How to Cache Flask API Responses with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flask (Python web framework)
- Redis (in-memory data store)
- Flask-Caching (Flask extension for caching)
- ETags / HTTP conditional requests

## Sources Consulted
- Flask-Caching official documentation: https://flask-caching.readthedocs.io/en/latest/api.html
- Flask-Caching source code for `cached()` decorator default `key_prefix` behavior
- Flask documentation on `request.path` vs full URL

## Issues Found

### Issue 1: Incorrect claim about default cache key behavior
- **What was wrong:** The text stated "Flask-Caching uses the full URL as the default key, so query parameters are included automatically." This is incorrect — Flask-Caching uses `request.path` (via `key_prefix="view/%s"`) as the default cache key, which does **not** include query parameters.
- **What was changed:** Updated the text to: "Flask-Caching uses `request.path` as the default cache key, so query parameters are **not** included by default. Use `query_string=True` to include them."
- **Why:** The original text contradicted the purpose of the `query_string=True` parameter shown immediately below it. Without this fix, readers would not understand why `query_string=True` is needed.

### Issue 2: Misleading `key_prefix="product_%s"` on `get_product` route
- **What was wrong:** `@cache.cached(timeout=60, key_prefix="product_%s")` implies `%s` is replaced with the route parameter `pid`, but Flask-Caching replaces `%s` with `request.path` (e.g., `/api/product/5`), producing keys like `product_/api/product/5` rather than `product_5`.
- **What was changed:** Removed the custom `key_prefix` so the route uses the default `view/%s` pattern. Added `key_prefix="products_list"` to the `get_products` route for clean, predictable invalidation.
- **Why:** The misleading `%s` substitution would confuse readers about how Flask-Caching generates cache keys and cause cache invalidation bugs.

### Issue 3: Cache invalidation keys did not match actual cache keys
- **What was wrong:** `cache.delete(f"product_{pid}")` would try to delete key `product_5`, but the actual cached key was `product_/api/product/5`. Similarly, `cache.delete("api/products")` would not match the actual key `view//api/products`.
- **What was changed:** Updated to `cache.delete(f"view//api/product/{pid}")` and `cache.delete("products_list")` with explanatory comments showing how the keys are derived.
- **Why:** The original invalidation code would silently fail — stale data would remain in cache after writes, which is the exact bug this section is supposed to prevent.

## Review Notes
- The double-slash in `view//api/product/{pid}` is correct and expected: the default `key_prefix` is `"view/%s"` and `request.path` starts with `/`, producing `view/` + `/api/product/5`.
- The ETag example uses MD5 which is fine for cache validation but should not be used for security purposes. This is appropriate usage.
- Code snippets don't show all imports (e.g., `request` is used without being imported in some snippets). This is standard practice for blog post code snippets and not an error.
