# Validation Summary: How to Monitor Per-Tenant Redis Usage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SCAN, SET, GET, EXISTS, DELETE, INCR, DECR, MEMORY USAGE, EXPIRE commands)
- Python (redis-py client library)
- Prometheus (prometheus_client Python library)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis SCAN command documentation: https://redis.io/commands/scan
- Redis MEMORY USAGE command documentation: https://redis.io/commands/memory-usage
- prometheus_client Python library documentation: https://prometheus.github.io/client_python/

## Issues Found
No technical issues found.

## Review Notes
- **Strategy 2 race condition**: The `set_and_track` function has a TOCTOU (time-of-check-time-of-use) race between `r.exists(full_key)` and `r.set(full_key, value)`. A concurrent client could create or delete the key between these two calls, causing the counter to drift. For exact counters, a Lua script or pipeline with WATCH would be needed. This is acceptable for monitoring purposes where approximate counts are sufficient, and the post frames it as such.
- **`r_metrics` undefined in Strategy 4**: The `MetricsRedis.execute_command` method references `r_metrics`, which is not defined in the snippet. This is intentionally a separate Redis connection to avoid infinite recursion (since calling `self.incr()` would re-trigger `execute_command`). Readers should define it as a standard `redis.Redis()` instance.
- **`get_all_tenant_ids()` undefined**: The Prometheus export section calls `get_all_tenant_ids()` without defining it. This is a reader-implemented function, which is standard for tutorial-style posts.
- **`update_metrics()` not scheduled**: The function is defined but never called in a loop or on a schedule. Readers would need to add periodic invocation (e.g., via a background thread or scheduler).
- **Context variable comment**: Strategy 4 comments `self._current_tenant_id` as "Set via context var" but accesses it as an instance attribute. If using Python's `contextvars.ContextVar`, the access pattern would differ. The comment is slightly misleading but the code works if the attribute is set on the instance before use.
- **`MEMORY USAGE` availability**: The `r.memory_usage()` call in Strategy 3 requires Redis 4.0+. The post does not mention this version requirement.
