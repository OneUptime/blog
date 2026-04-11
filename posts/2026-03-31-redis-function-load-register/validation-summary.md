# Validation Summary: How to Use FUNCTION LOAD in Redis to Register Functions

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis 7.0+ (FUNCTION LOAD command)
- Lua scripting engine for Redis Functions
- FCALL / FCALL_RO commands
- Redis persistence (RDB/AOF)
- Redis replication

## Sources Consulted
- Redis official documentation for FUNCTION LOAD: https://redis.io/docs/latest/commands/function-load/
- Redis official documentation for FCALL: https://redis.io/docs/latest/commands/fcall/
- Redis official documentation for FCALL_RO: https://redis.io/docs/latest/commands/fcall-ro/
- Redis Functions introduction guide: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis Lua API reference for redis.register_function: https://redis.io/docs/latest/develop/interact/programmability/lua-api/

## Issues Found
No technical issues found.

## Review Notes
- The `FUNCTION LOAD` syntax shown matches Redis 7.0 GA and later. Earlier RC builds of Redis 7.0 used a different syntax with separate engine/name arguments, but this is not relevant to production users.
- The post lists four flags (`no-writes`, `allow-oom`, `allow-stale`, `no-cluster`) which are all valid. Additional flags like `allow-cross-slot-keys` and `raw-arguments` exist but their omission is not an error — the post covers the most commonly used flags.
- All Lua code examples are syntactically correct and demonstrate proper use of `redis.register_function` in both positional and named styles.
- The FCALL examples correctly specify the `numkeys` argument (0 when no keys are used, 1 when a single key is passed).
- The rate limiter example is a well-known pattern and is implemented correctly with INCR + conditional EXPIRE.
