# Validation Summary: How to Use ZINTERSTORE in Redis to Store Sorted Set Intersections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ZINTERSTORE command, sorted sets)
- redis-py (Python Redis client)
- redis-cli (Redis command-line interface)

## Sources Consulted
- Redis official documentation for ZINTERSTORE: https://redis.io/commands/zinterstore/
- redis-py source code (`redis/commands/core.py`) for `zinterstore` and `_zaggregate` method signatures
- Redis official documentation for ZRANGE: https://redis.io/commands/zrange/

## Issues Found

### 1. Incorrect redis-py `zinterstore` API usage in all four Python examples
**What was wrong:** All four Python examples passed `numkeys` (an integer) and separate key arguments to `r.zinterstore()`, mimicking the raw Redis protocol syntax. The redis-py client abstracts away `numkeys` and expects `keys` as a list (or dict for weights).

**Examples of incorrect calls:**
- `r.zinterstore('active:all_platforms', 3, 'active:web', 'active:mobile', 'active:desktop')`
- `r.zinterstore('common_ratings', 2, 'ratings:alice', 'ratings:bob', aggregate='MIN')`
- `r.zinterstore('mutual:alice:bob', 2, 'following:alice', 'following:bob')`

**What was changed:** Replaced all calls with the correct redis-py API, passing keys as a list:
- `r.zinterstore('active:all_platforms', ['active:web', 'active:mobile', 'active:desktop'])`
- `r.zinterstore('common_ratings', ['ratings:alice', 'ratings:bob'], aggregate='MIN')`
- `r.zinterstore('mutual:alice:bob', ['following:alice', 'following:bob'])`

**Why:** The `zinterstore` method signature is `zinterstore(dest, keys, aggregate=None)` where `keys` is `Union[Sequence[KeyT], Mapping[AnyKeyT, float]]`. Passing an integer as `keys` would raise a `TypeError` at runtime.

### 2. Non-existent `weights` keyword argument in Combined Scoring example
**What was wrong:** The third Python example used `weights=[0.4, 0.4, 100]` as a keyword argument, which does not exist in the redis-py API.

**What was changed:** Replaced with a dict mapping keys to weights:
```python
r.zinterstore('articles:ranked',
              {'articles:views': 0.4, 'articles:likes': 0.4, 'articles:recency': 100},
              aggregate='SUM')
```

**Why:** In redis-py, weights are specified by passing a `Mapping[str, float]` as the `keys` parameter, not via a separate `weights` keyword argument.

### 3. Incorrect expected output order in Users Active example
**What was wrong:** The comment showed results in descending score order `[('user:3', 240.0), ('user:1', 210.0)]`, but `zrange` returns results in ascending score order.

**What was changed:** Corrected to `[('user:1', 210.0), ('user:3', 240.0)]`.

**Why:** `ZRANGE` returns elements ordered by score from lowest to highest. user:1 (210) comes before user:3 (240).

## Review Notes
- The Redis CLI examples (ZADD, ZINTERSTORE, ZRANGE with WITHSCORES) are all correct with accurate expected outputs and score calculations.
- The ZINTERSTORE syntax documentation, AGGREGATE options, and WEIGHTS behavior are accurately described.
- The `ZINTERSTORE` command has been marked as deprecated in Redis 6.2.0 in favor of `ZINTER` with the `STORE` option, but it remains widely supported and functional. This is worth noting for future updates.
- The `desc=True` parameter used in `zrange` in Example 3 is valid in redis-py 4.x+.
