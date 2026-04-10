# Validation Summary: How to Implement a Mutex with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SET NX PX, PEXPIRE, PTTL, EXISTS, EVAL with Lua scripting)
- Python (redis-py client library)
- Distributed systems (mutual exclusion / locking)

## Sources Consulted
- Redis SET command documentation — https://redis.io/docs/latest/commands/set/
- Redis PEXPIRE command documentation — https://redis.io/docs/latest/commands/pexpire/
- Redis PTTL command documentation — https://redis.io/docs/latest/commands/pttl/
- Redis EVAL command documentation — https://redis.io/docs/latest/commands/eval/
- Redis distributed locks pattern — https://redis.io/docs/latest/develop/use/patterns/distributed-locks/
- redis-py library documentation — https://redis-py.readthedocs.io/

## Issues Found

1. **Linear backoff mislabeled as exponential backoff (line 64):** The retry logic used `retry_delay * (attempt + 1)` which produces delays of 0.1, 0.2, 0.3 seconds — this is linear backoff, not exponential. Changed to `retry_delay * (2 ** attempt)` which produces 0.1, 0.2, 0.4 seconds — true exponential backoff matching the comment.

2. **Misleading parameter name in `extend_lock` (line 106):** The parameter was named `additional_ms`, implying the time would be added to the existing TTL. However, `PEXPIRE` replaces the TTL entirely with the given value rather than adding to it. Renamed the parameter to `ttl_ms` and updated the docstring from "Extend the TTL" to "Set a new TTL" to accurately reflect the behavior.

## Review Notes
- The post correctly implements the single-instance Redis lock pattern as recommended by the official Redis documentation. It does not claim to implement Redlock (the multi-instance algorithm), which is appropriate for the scope.
- The Lua-script-based atomic check-and-delete for lock release is the exact pattern shown in the official Redis documentation.
- The `PTTL` docstring mentions returning -2 if not locked, which is correct for a non-existent key. It does not mention -1 (key exists without expiry), but since all locks in this implementation are created with PX, they will always have an expiry, making this omission acceptable.
- The context manager's `finally` block always calls `release_lock`, which is safe because the Lua script checks ownership before deleting — if the lock has already expired and been re-acquired by another process, the release will correctly be a no-op.
