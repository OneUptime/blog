# Validation Summary: How to Handle Lock Expiration in Redis Distributed Locks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (distributed locking, key expiration, Lua scripting, INCR)
- Python (redis-py client library)
- Distributed systems concepts (fencing tokens, exponential backoff, split-brain prevention)

## Sources Consulted
- redis-py API documentation and source behavior for `r.get()`, `r.set()`, `r.eval()`, `r.incr()` — https://redis-py.readthedocs.io/
- Redis SET command documentation (NX, PX flags) — https://redis.io/commands/set/
- Redis EVAL command documentation (Lua scripting, KEYS/ARGV) — https://redis.io/commands/eval/
- Martin Kleppmann's analysis of distributed locks and fencing tokens — https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- Redis distributed locks documentation (Redlock) — https://redis.io/docs/latest/develop/use/patterns/distributed-locks/

## Issues Found
1. **`is_still_valid()` bytes/string comparison bug** (line 44-47): The method compared the return value of `r.get()` directly with `self.token` (a `str`). In redis-py, `r.get()` returns `bytes` by default (e.g., `b"some-uuid"`) unless the client is created with `decode_responses=True`. This means the comparison `current_token == self.token` would always return `False` with default client settings, making the validity check silently broken. Fixed by adding an explicit `None` check (for expired keys) and decoding bytes to string before comparison.

## Review Notes
- The fencing token counter (`INCR`) is incremented before attempting lock acquisition (`SET NX`), meaning failed acquisition attempts waste fence token values. This does not affect correctness (the monotonic ordering guarantee is preserved), but combining both operations into a single Lua script would be more efficient.
- The retry jitter (`random.uniform(0, base_wait * 0.1)`) is 10% of the base wait. A wider jitter range (e.g., up to 100% of base wait) is more commonly recommended to reduce thundering herd effects, but the current implementation is not incorrect.
- Some code blocks use `uuid` and `json` without explicit imports. This is acceptable for illustrative tutorial snippets.
- The Lua-based `VALIDATE_AND_DELETE` script correctly handles atomic compare-and-delete, which is the canonical pattern from the Redis documentation for safe lock release.
- The `release()` method using `r.eval()` is not affected by the bytes/string issue because the comparison happens inside the Lua script where both values are Redis strings.
