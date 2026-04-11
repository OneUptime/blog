# Validation Summary: How to Design a Notification System Using Redis

## Status
validated

## Post Type
Tutorial / System Design Guide

## Technologies Covered
- Redis (Pub/Sub, Lists, Sorted Sets, Streams, Hashes)
- Python (redis-py client library)
- Redis CLI commands

## Sources Consulted
- Redis official documentation for ZRANGE (https://redis.io/docs/latest/commands/zrange/) — confirmed ZREVRANGE deprecated in 6.2 in favor of ZRANGE with REV option
- Redis official documentation for BLPOP (https://redis.io/docs/latest/commands/blpop/) — confirmed returns nil/None on timeout
- Redis official documentation for XREADGROUP (https://redis.io/docs/latest/commands/xreadgroup/) — confirmed consumer group must exist before use
- Redis official documentation for XGROUP CREATE (https://redis.io/docs/latest/commands/xgroup-create/) — confirmed MKSTREAM option syntax
- redis-py documentation (https://redis-py.readthedocs.io/) — confirmed blpop returns None on timeout, not a tuple

## Issues Found

1. **Bug: `blpop` crash on timeout in `email_worker`** — The code destructured the return value of `blpop` directly (`_, raw = r.blpop(...)`) which raises `TypeError: cannot unpack non-iterable NoneType object` when the timeout expires and `None` is returned. Fixed by first assigning to `result` and only destructuring inside an `if result:` check.

2. **Inaccuracy: Rate limiter mislabeled as "sliding window"** — The rate limiting section described the implementation as a "sliding window counter," but the code uses INCR with EXPIRE, which is a fixed window counter. A true sliding window would use a sorted set with per-event timestamps. Changed description to "fixed window counter."

3. **Missing command: `XGROUP CREATE` before `XREADGROUP`** — The Redis Streams fan-out section showed an `XREADGROUP` command that references consumer group `fanout-workers`, but the group was never created. `XREADGROUP` will return a NOGROUP error without it. Added `XGROUP CREATE events:new_posts fanout-workers $ MKSTREAM` before the XREADGROUP example.

4. **Deprecated command: `ZREVRANGE`** — The inbox section used `ZREVRANGE`, which was deprecated in Redis 6.2.0 in favor of `ZRANGE` with the `REV` option. Replaced `ZREVRANGE inbox:user:bob 0 19 WITHSCORES` with `ZRANGE inbox:user:bob 0 19 REV WITHSCORES`.

## Review Notes
- The rate limiter implementation, while correctly relabeled as a fixed window, has an additional subtlety: calling `EXPIRE` on every invocation resets the TTL, which means the window can extend beyond 3600 seconds under sustained traffic. A more robust fixed window approach would only set the EXPIRE when the key is first created (i.e., when count == 1). This is a common simplification in blog posts and does not make the code incorrect for illustrative purposes.
- The `can_notify` function increments the counter even when just checking the limit, meaning rate-limit checks themselves consume quota. In production, you would typically separate the check from the increment.
- The Pub/Sub fan-out pattern correctly notes the fire-and-forget nature but readers should be aware that if no subscriber is listening, messages are lost permanently — this is inherent to Redis Pub/Sub and is accurately described in the post.
