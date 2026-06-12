# Validation Summary: How to Build Cache Invalidation Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Redis
- redis-py
- Cache invalidation patterns
- TTL-based caching
- Event-driven invalidation
- Version-based invalidation
- Tag-based invalidation

## Sources Consulted
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Python functools documentation: https://docs.python.org/3/library/functools.html
- Python inspect Signature documentation: https://docs.python.org/3/library/inspect.html

## Issues Found
- The event-driven invalidation decorator used `pattern.format(*args, **kwargs)` with patterns such as `"user:profile:{user_id}"`. This fails when `user_id` is passed positionally, as shown by the decorated function signature. Updated the decorator to bind call arguments with `inspect.signature(func).bind(...)` and format patterns from the bound argument mapping.
- The version-based invalidation examples treated missing version keys as version 1 but did not persist that initial version before calling `INCR`. Redis initializes a missing `INCR` key to 0 before incrementing, so the first `invalidate_all()` could leave the version at 1 and fail to invalidate existing `v1` entries. Added `setnx(..., 1)` before version reads/increments so the first invalidation advances to version 2.
- The hybrid cache `set` method annotated `ttl` as `int` while using `None` as the default. Updated the annotation to `int | None` to match the actual accepted value.

## Review Notes
The Redis command usage is otherwise current and consistent with Redis and redis-py documentation. The tag-based cache example is suitable for a tutorial, but production implementations should also consider stale tag members left behind when individual data keys expire before their tag sets.
