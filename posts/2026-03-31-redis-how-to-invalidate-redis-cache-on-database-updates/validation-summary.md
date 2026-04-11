# Validation Summary: How to Invalidate Redis Cache on Database Updates

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- Redis (redis-py Python client)
- Python 3.10+ (union type syntax `dict | None`)
- PostgreSQL (via psycopg2, `RETURNING` clause)
- SQL (parameterized queries with both dict-style and tuple-style placeholders)

## Sources Consulted
- Redis official documentation for commands: DEL, GET, SET, SETEX, INCR, EXPIRE, SADD, SMEMBERS, PIPELINE — https://redis.io/docs/latest/commands/
- redis-py documentation — https://redis-py.readthedocs.io/en/stable/
- psycopg2 documentation — https://www.psycopg.org/docs/
- Redis INCR command behavior on non-existent keys — https://redis.io/docs/latest/commands/incr/

## Issues Found

1. **Bug in Strategy 2 — Versioned Cache Keys: incorrect default version caused first update to not invalidate cache.**
   - `get_entity_version()` returned `1` as the default when no version key existed in Redis. However, `redis.incr()` on a non-existent key initializes the value to 0 then increments to 1 (per Redis INCR documentation). This meant the first version bump after a cold cache did not change the effective version number (both defaulted to 1), so stale cached data would continue to be served until a second update.
   - **Fix:** Changed the default return value from `1` to `0`. Now the initial cache key uses `v0`, and the first `INCR` bumps to `v1`, correctly invalidating the cache.

2. **Unused import in Strategy 1 — Direct Key Deletion.**
   - `from contextlib import contextmanager` was imported but never used in that code block.
   - **Fix:** Removed the unused import.

## Review Notes
- The tag-based invalidation strategy (Strategy 3) has an inherent race condition between `smembers` and the subsequent pipeline delete. This is acceptable for a tutorial but worth noting for production use — a Lua script could make this atomic.
- The `on_order_created_or_updated` function accepts an `order_id` parameter that is unused in the function body. This is a minor style issue but the parameter makes sense for the function's interface contract.
- The write-through cache examples (Strategy 5) use PostgreSQL-specific `RETURNING` syntax without explicitly mentioning PostgreSQL, though psycopg2 is used in the transaction example making the database choice implicit.
- All Redis API usage (pipeline, setex, delete, incr, expire, sadd, smembers) is correct and current per the redis-py library.
