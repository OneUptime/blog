# Validation Summary: How to Build a Real-Time Call Analytics Dashboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sets, sorted sets, pipelines, Pub/Sub, key expiration)
- Python 3 (type hints, f-strings)
- redis-py (Python Redis client, v4.x+ API)

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/stable/
- redis-py `zrange` API (v4.x+ supports `desc` parameter): https://redis.readthedocs.io/en/stable/commands.html#redis.commands.core.CoreCommands.zrange
- Python `time` module documentation: https://docs.python.org/3/library/time.html#time.strftime
- Redis ZRANGE command documentation: https://redis.io/commands/zrange/

## Issues Found
1. **Timezone mismatch between key writes and reads (minute buckets):** `call_started` writes minute-bucket keys using local time (`time.strftime("%Y%m%d%H%M")`), but `get_dashboard_kpis` read them using UTC (`time.gmtime(ts)`). On any system not configured to UTC, this would look up different Redis keys than what were written, returning zero counts. Fixed by changing `time.gmtime(ts)` to `time.localtime(ts)` in `get_dashboard_kpis`.

2. **Timezone mismatch between key writes and reads (hourly buckets):** `call_ended` writes hourly stats using local time (`time.strftime("%Y%m%d%H")`), but `get_hourly_call_trend` read them using UTC (`time.gmtime(ts)`). Same root cause as above. Fixed by changing `time.gmtime(ts)` to `time.localtime(ts)` in `get_hourly_call_trend`.

## Review Notes
- The `import threading` in the Broadcasting Updates section is imported but unused. It appears to be a hint that `stream_to_dashboard` would be run in a thread, but as written it is dead code.
- The `region` variable in `call_ended` is fetched from the call hash but never used, suggesting per-region end-of-call stats were planned but not implemented.
- The `zrange` call with `desc=True` requires redis-py 4.x+ (released 2021). Older versions would need `zrevrange` instead. The post does not specify a redis-py version, but 4.x is the current standard.
- All Redis commands (HSET, SADD, HINCRBY, ZINCRBY, EXPIRE, SREM, SCARD, HGET, HGETALL, ZRANGE, PUBLISH, SUBSCRIBE) are used correctly per their documented semantics.
