# Validation Summary: How to Build an Appointment Scheduling Cache with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, SET NX, TTL, Lua scripting)
- Python (redis-py client library)
- Distributed locking patterns

## Sources Consulted
- Redis official documentation for ZADD, ZRANGEBYSCORE, SET, HSET, ZREM, DEL commands — https://redis.io/docs/latest/commands/
- redis-py documentation — https://redis.readthedocs.io/en/stable/
- redis-py Lua scripting documentation — https://redis.readthedocs.io/en/stable/lua_scripting.html
- Python `time` module documentation — https://docs.python.org/3/library/time.html

## Issues Found
- **Incorrect Unix timestamps in data model examples**: The timestamps `1712000000` and `1712003600` were presented as corresponding to `2024-04-01T09:00` and `2024-04-01T10:00`, but they actually correspond to `2024-04-01T19:33:20 UTC` and `2024-04-01T20:33:20 UTC`. Fixed to the correct values: `1711962000` (09:00 UTC) and `1711965600` (10:00 UTC). The HSET example datetime field was also updated to match.

## Review Notes
- The Lua confirmation script declares variables `appt_id`, `provider_id`, and `now` from ARGV but never uses them. This is harmless but adds unnecessary clutter — the script only needs `patient_id` and `datetime_str` from ARGV.
- `get_available_slots` issues a separate `ZSCORE` call per slot (N+1 pattern). Using `zrangebyscore(key, start_ts, end_ts, withscores=True)` would return scores alongside members in a single call.
- `zrangebyscore` is deprecated at the Redis server level since Redis 6.2.0 in favor of `ZRANGE` with the `BYSCORE` option. In redis-py, the equivalent is `zrange(key, start, end, byscore=True)`. The current code still works but may trigger deprecation warnings in newer versions of the library.
- `cancel_appointment` uses `time.mktime` which interprets the parsed time as local time. If the server timezone differs from what was used when creating the original timestamps, the reconstructed score will be incorrect. For production use, `calendar.timegm` (UTC) would be safer.
