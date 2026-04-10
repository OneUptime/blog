# Validation Summary: Why You Should Not Use KEYS Command in Production Redis

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- Redis (KEYS, SCAN, DELETE, SET, SADD, SMEMBERS commands)
- Python 3 (redis-py client library)

## Sources Consulted
- Redis official documentation for KEYS command: https://redis.io/docs/latest/commands/keys/
- Redis official documentation for SCAN command: https://redis.io/docs/latest/commands/scan/
- Redis official documentation for DELETE command: https://redis.io/docs/latest/commands/del/
- redis-py library documentation: https://redis-py.readthedocs.io/
- Redis architecture documentation (single-threaded event loop model)

## Issues Found

1. **`process_key` function called before definition**: In the SCAN example, `process_key(key)` was called in the `for` loop (line 46) before the function was defined (lines 48-49). In Python, code executes top-to-bottom, so this would raise a `NameError` at runtime. Fixed by moving the `process_key` definition above the usage.

2. **Misleading "pipeline delete" comment**: The bulk delete example had the comment `# Safe pattern: SCAN + pipeline delete in batches`, but the code uses `r.delete(*keys)` (a single DELETE command with multiple keys), not a Redis pipeline (`r.pipeline()`). Changed to `# Safe pattern: SCAN + batch delete` to accurately describe what the code does.

## Review Notes
- The claim "Redis is single-threaded" is accurate for command processing. Redis 6+ introduced I/O threads for network handling, but command execution remains single-threaded, so the KEYS blocking behavior described is correct.
- The SCAN description as "non-blocking" is a slight simplification — SCAN does block during each individual iteration, but for a much shorter duration than KEYS. The Redis docs phrase this as SCAN "does not block the server for a long time." The current wording is acceptable for a practical guide.
- The `bulk_delete_pattern` function works correctly but could be further optimized using `r.pipeline()` for truly pipelined deletes. This is a potential enhancement, not an error.
- The session index example does not handle cleanup of stale session IDs from the set when sessions expire. This is a known trade-off with manual indexing in Redis and is acceptable to omit in this context.
