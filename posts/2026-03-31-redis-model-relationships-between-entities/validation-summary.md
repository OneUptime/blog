# Validation Summary: How to Model Relationships Between Entities in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (HSET, SADD, SMEMBERS, SINTER, ZADD, ZRANGE, SREM, HGETALL, HGET, pipelines)
- Python (redis-py client library)
- Bash (redis-cli)

## Sources Consulted
- Redis official command reference: https://redis.io/commands/ (HSET, SADD, SMEMBERS, SINTER, ZADD, ZRANGE, SREM, HGETALL, HGET)
- redis-py documentation: https://redis-py.readthedocs.io/ (pipeline usage, smembers return types, zadd mapping syntax, sinter with list argument)
- Redis data modeling best practices: https://redis.io/docs/manual/patterns/

## Issues Found

1. **Inconsistent key name in One-to-One example**: The profile hash was stored at key `profile:1`, but the reference field in `user:1` was set to `prof:1`. This mismatch would cause the lookup `HGETALL prof:1` to return nothing. Fixed `profile_id "prof:1"` to `profile_id "profile:1"` to match the actual storage key.

2. **Missing `.decode()` calls in `delete_user` function**: The `r.smembers()` call returns bytes objects by default in redis-py (when `decode_responses` is not enabled). The `pid` and `tag` variables were used directly inside f-strings, which would produce malformed key names like `"post:b'101':tags"` instead of `"post:101:tags"`. Added `pid = pid.decode()` and `tag.decode()` calls to match the pattern used correctly in the earlier `get_user_posts` function.

## Review Notes
- The `mutual_followers` function performs an in-memory Python set intersection rather than using Redis server-side operations like `ZINTERSTORE` or `ZINTER` (Redis 6.2+). This is functionally correct but less efficient for large follower sets. Not changed since it's a valid approach for a tutorial.
- The `delete_user` function mixes direct Redis calls (`r.smembers`) with pipeline calls inside the loop. This is a necessary pattern since you need the tag values before constructing subsequent pipeline commands, but readers should be aware this involves one extra round trip per post.
- All redis-py API usage (pipeline, `mapping` parameter for `hset`, `zadd` dict syntax, `sinter` with list argument) is correct for redis-py 4.x+.
