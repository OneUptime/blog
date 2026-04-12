# Validation Summary: How to Model Booking and Reservation Systems in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, sets, strings with TTL)
- Redis Lua scripting
- Python (redis-py client library)

## Sources Consulted
- Redis ZADD, ZRANGEBYSCORE, ZSCORE, ZREM command documentation — https://redis.io/docs/latest/commands/zadd/
- Redis HSET command documentation — https://redis.io/docs/latest/commands/hset/
- Redis EVAL / Lua scripting documentation — https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis TIME command documentation — https://redis.io/docs/latest/commands/time/
- Redis SADD command documentation — https://redis.io/docs/latest/commands/sadd/
- redis-py documentation for `register_script`, `zadd`, `zrangebyscore` — https://redis-py.readthedocs.io/en/stable/

## Issues Found

### 1. `get_user_bookings` reads from a set that is never populated
- **What was wrong:** The `get_user_bookings` function reads booking IDs from `user:{user_id}:bookings` using `SMEMBERS`, but the Lua booking script never adds the booking ID to that set. The function would always return an empty list.
- **What was changed:** Added `KEYS[4]` (user bookings key) and `ARGV[4]` (booking_id) to the Lua script, added `redis.call('SADD', user_bookings_key, booking_id)` to populate the set on booking, and updated `book_slot_for_user` to pass the additional key and argument.
- **Why:** Without this fix, the `get_user_bookings` feature demonstrated in the post would never work.

### 2. Summary falsely claims cancellations are atomic
- **What was wrong:** The Summary stated "Cancellations atomically move slots back to the available set" but the `cancel_booking` function uses three separate Redis commands (`zrem`, `zadd`, `hset`), which is not atomic.
- **What was changed:** Reworded the Summary to accurately describe the cancellation behavior without claiming atomicity.
- **Why:** The claim was misleading given the actual implementation.

## Review Notes
- The `cancel_booking` function is not atomic and has race conditions under concurrent load. Between `zrem` and `zadd`, the slot is temporarily in neither the booked nor available set. For production use, this should be wrapped in a Lua script similar to the booking operation. Not fixed here to avoid scope creep beyond correcting errors.
- The `confirm_provisional_hold` function has a TOCTOU (time-of-check-time-of-use) race condition: the hold key could expire between `GET` and `DELETE`. For production use, this check-and-delete should be atomic (e.g., using a Lua script).
- `ZRANGEBYSCORE` was deprecated in Redis 6.2 in favor of `ZRANGE ... BYSCORE`. The old command still works and redis-py still supports it, but new code should prefer `r.zrange(key, min, max, byscore=True)`.
- The Lua script uses `redis.call('TIME')` which is a non-deterministic command. This works by default in Redis 7.0+ (effects replication), but on Redis < 7.0 it would require `redis.replicate_commands()` at the top of the script to avoid errors after write commands.
- The example timestamps (e.g., 1712000000 labeled as "2024-04-01T10:00") don't precisely correspond to the labeled times (1712000000 is approximately 2024-04-01T19:33 UTC). The timestamps are internally consistent (1-hour intervals) and the code logic is correct, so this is a cosmetic issue only.
