# Validation Summary: How to Build a Course Enrollment Queue with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (commands: HSET, SADD, ZADD, SISMEMBER, ZSCORE, SCARD, HGET, ZRANK, ZPOPMIN, SREM, HINCRBY, PUBLISH)
- Redis Lua scripting (cjson, redis.call, redis.error_reply)
- Python (redis-py client library)
- Redis Pub/Sub

## Sources Consulted
- Redis ZPOPMIN documentation: https://redis.io/commands/zpopmin/ (confirmed returns flat array of member-score pairs, available since Redis 5.0)
- Redis ZSCORE documentation: https://redis.io/commands/zscore/ (confirmed returns nil for non-existent members)
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/ (confirmed ARGV values are always strings in Lua, requiring tonumber() for numeric use)
- Redis cjson module documentation: https://redis.io/docs/interact/programmability/lua-api/#cjson-library (confirmed cjson.encode encodes Lua strings as JSON strings, not numbers)
- redis-py documentation: https://redis-py.readthedocs.io/ (confirmed register_script API, ResponseError exception class, decode_responses behavior)

## Issues Found

1. **Missing `tonumber()` on `now` in DROP_AND_ADVANCE_SCRIPT** (line 107 of original): `local now = ARGV[2]` left the timestamp as a string since all ARGV values in Redis Lua scripts are strings. This caused `cjson.encode` to serialize the `ts` field as a JSON string (e.g., `"ts":"1712000001"`) instead of a number (e.g., `"ts":1712000001`), inconsistent with the enrollment script which correctly used `tonumber(ARGV[2])`. Fixed by adding `tonumber()`.

2. **Unused `import uuid`** (line 31 of original): The `uuid` module was imported in the setup section but never used anywhere in the post's code. This would confuse readers looking for where it's used. Removed the unused import.

## Review Notes
- The ZPOPMIN command requires Redis 5.0+. The post does not mention a minimum Redis version. Readers on older Redis versions would encounter errors.
- The Pub/Sub channel is passed as a KEYS argument to the Lua scripts. While this works on single-instance Redis, it would not work correctly in Redis Cluster since PUBLISH channels are not key-based and all KEYS must hash to the same slot. This is acceptable for a tutorial but worth noting for production use.
- The `drop()` Python function does not catch `redis.ResponseError` (unlike `enroll()`), so the `NOT_ENROLLED` error from the Lua script would propagate as an unhandled exception. This is a design choice, not a bug, but the inconsistency could confuse readers.
