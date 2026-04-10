# Validation Summary: How to Build a Real-Time Classroom Poll with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, Pub/Sub, pipelines, Lua scripting, key expiration)
- Python (redis-py client library)

## Sources Consulted
- Redis HEXISTS command documentation: https://redis.io/docs/latest/commands/hexists/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Lua 5.1 reference manual (truthiness rules): https://www.lua.org/manual/5.1/manual.html#2.4.4
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Redis HSET, HGETALL, HINCRBY command documentation: https://redis.io/docs/latest/commands/hset/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found

1. **Description claimed "sorted sets" but code uses hashes**: The post description said "sorted sets for results" but all vote storage uses Redis hashes (HSET, HGETALL, HINCRBY). No sorted sets (ZADD, ZRANGE, etc.) are used anywhere. Fixed the description to say "hashes for results."

2. **Lua script HEXISTS truthiness bug**: The Lua script used `if not redis.call('HEXISTS', votes_key, option)` to check for invalid options. In Lua, only `nil` and `false` are falsy — the number `0` is truthy. Since HEXISTS returns `0` when a field does not exist, `not 0` evaluates to `false`, meaning the INVALID_OPTION error would never be triggered regardless of the option value. Fixed to `if redis.call('HEXISTS', votes_key, option) == 0 then`.

3. **Unused `import threading`**: The `threading` module was imported in the "Watching as an Instructor" section but never used in the code. Removed the unused import.

## Review Notes
- The Pub/Sub subscriber in `instructor_dashboard` uses the same Redis connection object `r` for subscribing. In production, a dedicated connection for Pub/Sub is recommended since a subscribed connection cannot issue other commands, but for a tutorial this is acceptable.
- The `vote()` function makes an extra `r.hgetall(meta_key)` call before executing the Lua script to read `allow_multiple`. This adds a round trip that could be avoided by passing it as a Lua ARGV or reading it inside the script, but it is functionally correct.
