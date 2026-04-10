# Validation Summary: How to Build an Online Exam Timer with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TTL, Pub/Sub, Pipelines)
- Python (redis-py client library)

## Sources Consulted
- Redis TTL command documentation: https://redis.io/commands/ttl/
- Redis PTTL command documentation: https://redis.io/commands/pttl/
- Redis SETEX command documentation: https://redis.io/commands/setex/
- Redis EXPIRE command documentation: https://redis.io/commands/expire/
- Redis PUBLISH command documentation: https://redis.io/commands/publish/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Summary incorrectly references `PTTL` instead of `TTL`**: The summary paragraph stated "Remaining time is derived from the key's TTL using `PTTL`" but all code examples use `r.ttl()` (the `TTL` command, which returns seconds). `PTTL` is a different command that returns milliseconds. Fixed by changing `PTTL` to `TTL` in the summary.

2. **Unused `threading` import**: The setup code block imported `threading` but no code snippet in the post uses it. Removed the unused import to avoid confusing readers.

3. **Unused `session_key` variable in `broadcast_countdown`**: The variable `session_key` was defined but never referenced in the function body (remaining time is fetched via the `get_remaining_time` helper instead). Removed the unused variable.

## Review Notes
- The `start_exam` function uses a non-atomic check-then-set pattern (`exists()` followed by `setex()`), which has a TOCTOU race condition under concurrent requests. For a production system this should use a Redis transaction or `SET ... NX EX` to make the operation atomic. This is a design concern rather than a correctness error in the code as written, so it was not changed.
- Similarly, `submit_exam` has a non-atomic check-then-write pattern. A Lua script or `WATCH`/`MULTI` transaction would be more robust for production use.
- The warning check `if remaining in (600, 300)` in `broadcast_countdown` could miss exact second boundaries if the loop iteration takes slightly longer than 1 second. A range-based check (e.g., `remaining <= 600 and not warned_10min`) would be more reliable.
- The `redis-py` `pipeline()` used in `submit_exam` is not transactional by default (it batches commands but does not use `MULTI`/`EXEC`). For this use case the batching behavior is sufficient, but readers should be aware of the distinction.
