# Validation Summary: How to Build a Notification Preference System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sets, SCAN, EXPIRE/TTL)
- Python 3 (f-strings, type hints)
- redis-py (Python Redis client)

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset/
- Redis HGET documentation: https://redis.io/commands/hget/
- Redis SADD documentation: https://redis.io/commands/sadd/
- Redis SISMEMBER documentation: https://redis.io/commands/sismember/
- Redis EXPIRE documentation: https://redis.io/commands/expire/
- Redis SCAN documentation: https://redis.io/commands/scan/
- Redis DBSIZE documentation: https://redis.io/commands/dbsize/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- The `update_preference` function issues `hset` and `expire` as two separate commands rather than in a pipeline. This is not incorrect, but in a high-throughput environment a pipeline or Lua script would be more robust against partial failures. This is a minor best-practice consideration, not an error.
- The `can_notify` function does not check the `blocked_topics` set from the later section. The post presents these as separate building blocks, which is a valid tutorial approach — not an error.
- All integer values passed to `hset` (e.g., `0` in `unsubscribe_all_marketing`) are correctly auto-converted to strings by redis-py, consistent with the string comparison `value != "0"` in `can_notify`.
