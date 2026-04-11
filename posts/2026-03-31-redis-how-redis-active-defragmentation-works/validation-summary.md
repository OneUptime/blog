# Validation Summary: How Redis Active Defragmentation Works

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (active defragmentation feature, introduced in Redis 4.0)
- jemalloc (memory allocator used by Redis)
- Node.js with ioredis client library
- Redis CLI commands (CONFIG SET/GET, INFO memory, INFO stats)

## Sources Consulted
- Redis 7.4 source code — `src/config.c` for config parameter names and defaults (https://github.com/redis/redis/blob/7.4/src/config.c)
- Redis 7.4 source code — `src/defrag.c` for defragmentation mechanism and `je_get_defrag_hint()` usage (https://github.com/redis/redis/blob/7.4/src/defrag.c)
- Redis configuration documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- jemalloc issue #566 — expose hints for active defragmentation (https://github.com/jemalloc/jemalloc/issues/566)
- Redis PR #4691 — Active defrag v2 implementation (https://github.com/redis/redis/pull/4691)
- ioredis documentation for `info()` API usage (https://github.com/redis/ioredis)

## Issues Found

### Issue 1: Invalid Redis config parameter name `active-defrag-enabled`
- **What was wrong:** Line 74 used `redis-cli CONFIG GET active-defrag-enabled`, which is not a valid Redis configuration parameter name.
- **What was changed:** Replaced `active-defrag-enabled` with `activedefrag`, which is the correct CONFIG GET/SET parameter name as confirmed in Redis 7.4 source (`src/config.c`, line 3082: `createBoolConfig("activedefrag", ...)`).
- **Why:** Using the wrong parameter name would return an empty result, confusing readers.

### Issue 2: Incorrect jemalloc API reference (`MALLCTL_ARENAS_ALL`)
- **What was wrong:** The post stated Redis "Uses jemalloc's `MALLCTL_ARENAS_ALL` interface to identify candidate pages." This is inaccurate. `MALLCTL_ARENAS_ALL` is a jemalloc constant used only for aggregate fragmentation statistics collection (in `zmalloc.c`), not for per-pointer defrag decisions.
- **What was changed:** Replaced the `MALLCTL_ARENAS_ALL` reference with `je_get_defrag_hint()`, which is the actual custom jemalloc extension function that Redis calls (in `defrag.c`) to determine whether a specific allocation resides in an underutilized slab and would benefit from relocation.
- **Why:** The original claim misidentified the API, which could mislead readers trying to understand or extend the defragmentation internals.

## Review Notes
- The `parseInfo()` function in the JavaScript monitoring example splits on all colons (`line.split(':')`), which would truncate values containing colons (e.g., `executable:/usr/local/bin/redis-server`). For the specific fields accessed in this example (`used_memory_human`, `mem_fragmentation_ratio`, `active_defrag_*`), this is not a problem since their values don't contain colons. A more robust implementation would use `line.split(':', 2)` or `indexOf(':')`, but this is not a correctness issue for the demonstrated use case.
- The `active_defrag_running` field can return values 0, 1, or 2 in Redis 7.0+ (where 2 indicates more aggressive defragmentation). The post simplifies this to "1 if defrag is running," which is acceptable for an introductory guide but worth noting for completeness.
- All default configuration values (`active-defrag-ignore-bytes: 100mb`, `active-defrag-threshold-lower: 10`, `active-defrag-threshold-upper: 100`, `active-defrag-cycle-min: 1`, `active-defrag-cycle-max: 25`, `active-defrag-max-scan-fields: 1000`) were verified against Redis 7.4 source and are correct.
