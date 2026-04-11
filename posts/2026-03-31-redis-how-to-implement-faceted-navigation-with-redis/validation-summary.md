# Validation Summary: How to Implement Faceted Navigation with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, Sorted Sets)
- Python 3 (redis-py client library)
- Faceted search / navigation patterns

## Sources Consulted
- Redis official documentation for SET commands (SADD, SMEMBERS, SUNIONSTORE, SINTERSTORE, SCARD): https://redis.io/docs/latest/commands/?group=set
- Redis official documentation for Sorted Set commands (ZADD, ZRANGEBYSCORE): https://redis.io/docs/latest/commands/?group=sorted-set
- Redis official documentation for key expiry (EXPIRE): https://redis.io/docs/latest/commands/expire/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found

### 1. Cache key did not include price range parameters
**What was wrong:** The `get_cached_facet_results` function accepted `price_min` and `price_max` parameters but the cache key was computed solely from `filters`. Two queries with identical filters but different price ranges would produce the same cache key, causing stale/incorrect cached results to be returned. Additionally, filter values (lists) were not sorted before hashing, so `['nike', 'adidas']` and `['adidas', 'nike']` would produce different cache keys for semantically identical queries.

**What was changed:** Updated the cache key computation to include `price_min` and `price_max` in the hashed string, and added sorting of filter values for consistent hashing.

### 2. Empty price range silently dropped instead of returning empty results
**What was wrong:** In `search_with_facets`, when `price_min`/`price_max` were specified but `zrangebyscore` returned no matching products, the code did not add the price key to `facet_keys`. This effectively silently dropped the price constraint, causing the function to return results matching other facets without the price filter applied.

**What was changed:** Added an `else` branch: when the price range matches zero products and a price filter was explicitly requested, the function now cleans up temporary keys and returns an empty list immediately.

## Review Notes
- `zrangebyscore` is deprecated in redis-py 4.2+ in favor of `zrange` with `byscore=True`. The deprecated method still works but may be removed in a future major version. Consider updating if targeting redis-py 5+.
- The `hashlib.md5()` call may raise a `ValueError` on FIPS-compliant systems (Python 3.9+) unless `usedforsecurity=False` is passed. This is an edge case unlikely to affect most readers.
- The code uses `decode_responses=False` (the redis-py default), requiring manual `.decode()` calls on byte responses. Setting `decode_responses=True` in the `Redis()` constructor would simplify the code but is a style choice, not a bug.
