# Validation Summary: How the noeviction Policy Works in Redis and When to Use It

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (memory management, eviction policies, maxmemory configuration)
- Python (redis-py client library)
- Redis CLI
- Redis Cluster

## Sources Consulted
- Redis official documentation on key eviction: https://redis.io/docs/latest/develop/reference/eviction/
- redis-py source code (config_get response parsing): https://github.com/redis/redis-py/blob/master/redis/_parsers/helpers.py
- redis-py commands module: https://github.com/redis/redis-py/blob/master/redis/commands/core.py
- Redis GitHub issue #9926 (OOM behavior in MULTI/EXEC): https://github.com/redis/redis/issues/9926

## Issues Found

### 1. `config_get()` returns string values, not integers (two locations)
- **What was wrong:** `r.config_get("maxmemory")["maxmemory"]` returns a string (e.g., `"1073741824"`), not an integer. In `check_memory_pressure()`, the comparison `max_mem == 0` would always be `False` (comparing string to int), and `used / max_mem` would raise a `TypeError`. The same bug existed in `setup_memory_alert()`.
- **What was changed:** Wrapped both calls with `int()`: `int(r.config_get("maxmemory")["maxmemory"])`.
- **Why:** Confirmed via redis-py source — the `CONFIG GET` response parser uses `str_if_bytes()` which always returns strings.

### 2. Bash commands missing `redis-cli` prefix
- **What was wrong:** Three commands in the "Monitoring Memory" bash block were written as `INFO memory | grep ...` and `INFO stats | grep ...` without the `redis-cli` prefix. These won't work in a bash shell (`INFO` is not a shell command), and piping to `grep` doesn't work inside redis-cli interactive mode.
- **What was changed:** Added `redis-cli` prefix to all three commands.
- **Why:** The later "Alerting Setup" section already used the correct `redis-cli INFO memory | grep ...` syntax, confirming this was an oversight.

### 3. "Pub/Sub message buffers" listed as a noeviction use case
- **What was wrong:** Pub/Sub messages in Redis are fire-and-forget — they are not stored as keys and are not subject to eviction policies. Listing "Pub/Sub message buffers" as a use case for noeviction is misleading.
- **What was changed:** Changed to "Stream-based message buffers" since Redis Streams (XADD) store data as keys and are directly affected by eviction policy.
- **Why:** Redis Streams are the correct persistent message buffering mechanism where noeviction would matter.

## Review Notes
- The `MemoryWarning` exception used in `setup_memory_alert()` is not a built-in Python exception. This is acceptable as illustrative code since the comment makes clear it's a placeholder for real alerting integration.
- The post does not mention that `noeviction` is the default maxmemory-policy in Redis, which readers might find useful context. Not an error, just a potential enhancement.
- The TTL expiration behavior described is correct: TTL-based expiration operates independently of the eviction policy, so keys with TTLs still expire under noeviction.
- The OOM error message `(error) OOM command not allowed when used memory > 'maxmemory'` was verified as accurate against the Redis source.
