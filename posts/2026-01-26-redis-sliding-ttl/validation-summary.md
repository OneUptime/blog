# Validation Summary: How to Implement Sliding TTL in Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis key expiration and TTL
- Redis Lua scripting
- redis-py
- Python session management
- Redis sorted sets for sliding-window rate limiting

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis Lua scripting introduction: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API reference and type conversion rules: https://redis.io/docs/latest/develop/programmability/lua-api/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Clarified the opening TTL claim: Redis TTLs are not inherently fixed at key creation time, but they do not automatically change when a key is read.
- Replaced `redis.setex(...)` with `redis.set(..., ex=ttl)` because Redis documents `SETEX` as deprecated in favor of `SET` with `EX`.
- Replaced Lua `redis.call('SETEX', ...)` calls with `redis.call('SET', ..., 'EX', ttl)` for the same Redis deprecation.
- Replaced Lua `HMSET` with multi-field `HSET` because Redis documents `HMSET` as deprecated since Redis 4.0.0.
- Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` because Python 3.12 deprecates `datetime.utcnow()` and recommends timezone-aware UTC datetimes.
- Removed unused `datetime` and `hashlib` imports from examples.
- Added missing imports to standalone Python code blocks so the examples can be copied and run independently.
- Replaced Redis Lua `math.random()` use in the rate limiter with a Python-generated request id because Redis Lua uses a deterministic pseudo-random sequence for script execution.
- Returned the rate limiter's fractional `retry_after` as a string from Lua and converted it to `float` in Python because Redis converts Lua numbers returned by scripts to integer replies, truncating decimal values.

## Review Notes
All Python code fences were parsed successfully with Python `ast.parse` after the fixes. The examples assume a running Redis server and the `redis` Python package installed. `EVALSHA` use is correct after `script_load`, but production code may still want a `NOSCRIPT` fallback if Redis script caches are flushed.
