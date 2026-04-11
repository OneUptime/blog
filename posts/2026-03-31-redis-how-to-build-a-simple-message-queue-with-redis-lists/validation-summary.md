# Validation Summary: How to Build a Simple Message Queue with Redis Lists

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists, LPUSH, RPOP, BRPOP, BRPOPLPUSH, BLMOVE, LLEN, LRANGE, LREM)
- Python (redis-py client library)
- Message queue / background job processing patterns

## Sources Consulted
- Redis official documentation for BRPOPLPUSH: https://redis.io/docs/latest/commands/brpoplpush/
- Redis official documentation for BLMOVE: https://redis.io/docs/latest/commands/blmove/
- Redis official documentation for LMOVE: https://redis.io/docs/latest/commands/lmove/
- Redis official documentation for BRPOP: https://redis.io/docs/latest/commands/brpop/
- redis-py library API (v7.0.1) — verified function signatures for `blmove()`, `lmove()`, `brpoplpush()`

## Issues Found
1. **LMOVE cited as replacement for BRPOPLPUSH — should be BLMOVE.** The post stated that `LMOVE` (Redis 6.2+) is the replacement for `BRPOPLPUSH`. This is incorrect: `LMOVE` is the non-blocking replacement for `RPOPLPUSH`, while `BLMOVE` is the blocking replacement for `BRPOPLPUSH`. The code used `r.lmove()` with a `time.sleep(0.1)` polling loop, which is a CPU-wasteful pattern compared to the blocking `r.blmove()` with a timeout. Fixed by:
   - Changing the text reference from `LMOVE` to `BLMOVE` in the section heading and summary.
   - Replacing the `reliable_worker_lmove()` function with `reliable_worker_blmove()` using `r.blmove(QUEUE_KEY, PROCESSING_KEY, 5, "RIGHT", "LEFT")` which blocks for up to 5 seconds, matching the behavior of the `brpoplpush` example above it.

## Review Notes
- `BRPOPLPUSH` itself is deprecated as of Redis 6.2. The post correctly notes the newer alternative but the code using `brpoplpush()` in redis-py still works. A future update could add a deprecation note to the `brpoplpush` example.
- The redis-py `brpoplpush()` wrapper does not emit a deprecation warning even though the underlying Redis command is deprecated since 6.2.
- All other code examples (LPUSH/RPOP basics, BRPOP consumer, queue monitoring, multi-priority worker) are correct and use current redis-py APIs properly.
