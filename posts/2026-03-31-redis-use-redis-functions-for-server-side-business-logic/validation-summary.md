# Validation Summary: How to Use Redis Functions for Server-Side Business Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ Functions (`FUNCTION LOAD`, `FCALL`)
- Redis Lua scripting API (`redis.register_function`, `redis.call`, `cjson`)
- Redis data structures: Hashes (`HGET`, `HSET`, `HINCRBY`, `HDEL`), Sorted Sets (`ZINCRBY`), Lists (`RPUSH`, `LTRIM`)
- Python redis-py client (`fcall` method)

## Sources Consulted
- Redis FUNCTION LOAD command documentation: https://redis.io/docs/latest/commands/function-load/
- Redis FCALL command documentation: https://redis.io/docs/latest/commands/fcall/
- Redis Functions introduction: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- redis-py source code (fcall method): https://github.com/redis/redis-py/blob/master/redis/commands/core.py

## Issues Found
1. **Example 2 - Undeclared key access in `update_score` function**: The Lua function constructed a key dynamically (`'player:' .. player_id`) without declaring it in the `keys` parameter. Redis Functions require all accessed keys to be explicitly provided as input key arguments for correct execution in both standalone and clustered deployments. Fixed by adding `player_key` as `keys[2]` in the Lua function and updating the Python calling code to pass 2 keys (`numkeys=2`) with the player key as the second key argument.

## Review Notes
- The `FUNCTION LOAD` commands in the bash examples do not use the `REPLACE` flag. This is correct for a first-time load, but readers should be aware that reloading an existing library requires `FUNCTION LOAD REPLACE`.
- Sorted set scores in Redis are floating-point, but the `update_score` function returns the score in a Lua table, which causes Redis to convert it to an integer (RESP2 protocol). This is fine when only integer points are added, but could cause truncation with fractional scores.
- The `redis.call('TIME')` usage in Example 3 is correct — Redis 7.0+ uses script effects replication by default, which allows non-deterministic commands like `TIME` in Functions.
- All three examples use the simpler positional-arguments form of `redis.register_function`. The named-arguments form (with `flags` and `description`) is also available for more advanced use cases.
