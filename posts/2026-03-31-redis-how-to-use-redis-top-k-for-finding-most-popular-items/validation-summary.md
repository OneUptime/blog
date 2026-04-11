# Validation Summary: How to Use Redis Top-K for Finding Most Popular Items

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (RedisBloom module)
- Redis Top-K probabilistic data structure
- Python (redis-py client library)
- FastAPI

## Sources Consulted
- TOPK.RESERVE command reference: https://redis.io/commands/topk.reserve/
- TOPK.ADD command reference: https://redis.io/docs/latest/commands/topk.add/
- TOPK.LIST command reference: https://redis.io/docs/latest/commands/topk.list/
- TOPK.QUERY command reference: https://redis.io/docs/latest/commands/topk.query/
- TOPK.INFO command reference: https://redis.io/docs/latest/commands/topk.info/
- Top-K data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/
- redis-py TOPKCommands source: https://github.com/redis/redis-py/blob/master/redis/commands/bf/commands.py
- redis-py Top-K doctest examples: https://github.com/redis/redis-py/blob/master/doctests/dt_topk.py

## Issues Found

1. **`listWithScores` method does not exist in redis-py (line 80)**
   - **What was wrong:** The `get_top_items_with_counts` function called `r.topk().listWithScores(key)`, which is not a valid method in the redis-py client library.
   - **What was changed:** Replaced with `r.topk().list(key, withcount=True)`, which is the correct method. Additionally, since `list()` with `withcount=True` returns a flat alternating list `[item, count, item, count, ...]` rather than a dict, added conversion logic `dict(zip(result[::2], result[1::2]))` so downstream code calling `.items()` on the result works correctly.
   - **Why:** The `list()` method with the `withcount` boolean parameter is the correct redis-py API for retrieving Top-K items with their approximate counts.

2. **`reserve()` called with missing required parameters (lines 68, 154)**
   - **What was wrong:** `r.topk().reserve(key, k)` and `r.topk().reserve(window_key, 20)` were called with only 2 positional arguments. In redis-py, the `reserve()` method signature is `reserve(key, k, width, depth, decay)` with all parameters required (no defaults in the Python client).
   - **What was changed:** Added the Redis server default values explicitly: `r.topk().reserve(key, k, 8, 7, 0.9)` and `r.topk().reserve(window_key, 20, 8, 7, 0.9)`.
   - **Why:** While the Redis server itself provides defaults for width (8), depth (7), and decay (0.9), the redis-py client requires all parameters to be specified explicitly. Without them, a `TypeError` would be raised at runtime.

## Review Notes
- The `import random` on line 92 in the FastAPI example is unused but does not cause a runtime error.
- FastAPI's `@app.on_event("startup")` decorator is deprecated in favor of the `lifespan` context manager pattern, but it still functions correctly and is not technically wrong.
- The `get_current_trending` function hard-codes a 3600-second (1-hour) window, which matches the `time_windowed_topk` default of `window_minutes=60`. If the window parameter were changed, these would fall out of sync. This is a minor design concern, not a bug.
- The Redis CLI commands (`TOPK.RESERVE`, `TOPK.ADD`, `TOPK.LIST`, `TOPK.QUERY`) are all syntactically correct and accurately described. The `TOPK.RESERVE` command at the Redis server level does accept just `key` and `k` with defaults for the remaining parameters, so the CLI examples are valid.
- The explanation of the HeavyKeeper algorithm and the general description of Top-K behavior are accurate.
