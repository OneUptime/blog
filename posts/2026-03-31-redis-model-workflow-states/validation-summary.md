# Validation Summary: How to Model Workflow States in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Lists, Streams, Lua scripting, EXPIRE)
- Python (redis-py client library)
- Lua (Redis embedded scripting)

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset/
- Redis EVALSHA documentation: https://redis.io/commands/evalsha/
- Redis SCRIPT LOAD documentation: https://redis.io/commands/script-load/
- Redis Lua scripting reference: https://redis.io/docs/interact/programmability/eval-intro/
- Redis XADD documentation: https://redis.io/commands/xadd/
- Redis XRANGE documentation: https://redis.io/commands/xrange/
- Redis EXPIRE documentation: https://redis.io/commands/expire/
- redis-py documentation: https://redis-py.readthedocs.io/
- Lua 5.1 reserved words reference (Redis uses Lua 5.1): https://www.lua.org/manual/5.1/manual.html
- Python datetime.datetime.utcnow() deprecation (Python 3.12): https://docs.python.org/3/library/datetime.html

## Issues Found
No technical issues found.

## Review Notes
- `datetime.datetime.utcnow()` was deprecated in Python 3.12 in favor of `datetime.datetime.now(datetime.UTC)`. The code still works correctly but will emit a deprecation warning on Python 3.12+. This is a minor future-proofing concern, not an error.
- The Python `transition()` function performs a client-side transition validation before calling the Lua script. There is a theoretical race window between `hget` and `evalsha`, but the Lua script's atomic check is the authoritative guard, so the pattern is safe. The client-side check serves as an optimization to avoid unnecessary Redis round-trips for clearly invalid transitions.
- HSET with multiple field-value pairs requires Redis 4.0+. The post doesn't specify a minimum Redis version, which is fine since Redis 4.0 was released in 2017.
- The post correctly sets EXPIRE on both the main hash key and the history key separately, since Redis key expiry does not cascade to related keys.
