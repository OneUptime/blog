# Validation Summary: How to Store Nested Data Structures in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (core commands: SET, SADD, HSET, HGET)
- RedisJSON module (JSON.SET, JSON.GET, JSON.ARRAPPEND)
- Python (redis-py client library)
- JSON serialization/deserialization

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/ — verified that EX is an inline option on the SET command, not a separate command
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/ — confirmed multi-field HSET syntax (supported since Redis 4.0)
- Redis SADD command documentation: https://redis.io/docs/latest/commands/sadd/ — confirmed multi-member syntax
- RedisJSON command reference: https://redis.io/docs/latest/commands/?group=json — verified JSON.SET, JSON.GET, JSON.ARRAPPEND syntax and JSONPath usage
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `r.json().set()`, `r.json().get()`, pipeline API, and `hset(mapping=...)` usage

## Issues Found
1. **SET command with EX on a separate line (Strategy 1, bash example)**: The `EX 3600` option was on its own line, separate from the `SET` command. In redis-cli, each line is a distinct command, so `EX 3600` would be interpreted as a standalone command (which does not exist) and the SET would succeed but without the intended TTL. Fixed by placing `EX 3600` on the same line as the SET command.

## Review Notes
- The `save_product_hash` function in Strategy 3 is defined but never called in the example. The code actually uses `flatten_dict` directly. The function is also misleadingly named since it returns a dict rather than saving to Redis. This is a code clarity issue rather than a technical error.
- The `import redis.commands.json.path as jsonpath` in Strategy 4 is unused — the code uses string paths directly rather than the imported `jsonpath` module. This does not affect functionality.
- The `flatten_dict` function in Strategy 3 does not handle list/set values with JSON serialization (it uses `str()` for all non-dict values). This works for the given example data which has no lists, but would produce Python string representations rather than JSON for list values. The `save_product_hash` function above it does handle this correctly with `json.dumps`, but since that function is never called, a reader following the example would hit this limitation.
- All Redis commands (SET, SADD, HSET, HGET, JSON.SET, JSON.GET, JSON.ARRAPPEND) use correct syntax.
- The comparison table and strategy tradeoffs are accurate.
