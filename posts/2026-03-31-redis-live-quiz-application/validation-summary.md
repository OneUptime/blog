# Validation Summary: How to Build a Live Quiz Application with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, Pub/Sub, Lua scripting, hashes, sets, pipelines)
- Python (redis-py client library)
- Lua (embedded Redis scripting)

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset/
- Redis ZADD documentation: https://redis.io/commands/zadd/
- Redis ZRANGE documentation: https://redis.io/commands/zrange/
- Redis ZREVRANK documentation: https://redis.io/commands/zrevrank/
- Redis ZINCRBY documentation: https://redis.io/commands/zincrby/
- Redis ZSCORE documentation: https://redis.io/commands/zscore/
- Redis SISMEMBER documentation: https://redis.io/commands/sismember/
- Redis PUBLISH documentation: https://redis.io/commands/publish/
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py Script.register_script API: https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.core.CoreCommands.register_script

## Issues Found
1. **Summary text: "TTL-protected answer windows" is inaccurate.** The implementation uses a timestamp comparison in the Lua script (`now - q_started_at > time_limit`), not Redis TTL/key expiration (`EXPIRE`, `PEXPIRE`). TTL is a specific Redis concept for automatic key expiry, which is not what the code does. Changed "TTL-protected answer windows" to "time-limited answer windows" in the summary paragraph.

## Review Notes
- The `zrange` call with `desc=True` requires Redis 6.2+ (for `ZRANGE ... REV`) and redis-py 4.x+. This is current and correct for modern deployments.
- The Lua script passes the current timestamp from the Python client (`int(time.time())`) rather than using `redis.call('TIME')` inside Lua. This is a reasonable design choice for a tutorial—using `TIME` inside Lua scripts was non-deterministic and restricted in Redis versions before 7.0.
- The Lua script assumes users are pre-registered in the scores sorted set (as shown in the Data Model section). If a user answers incorrectly without being pre-registered, `ZSCORE` and `ZREVRANK` would return nil, causing a Lua error on `rank + 1`. The data model section correctly shows pre-registration via `ZADD ... 0 user-101`, but no explicit `join_quiz` function is provided. This is a design gap rather than a technical error.
- The `cjson` module used in the Lua script is built into Redis and correctly used here.
- Pipeline usage in `create_quiz` is correct and efficient for batching writes.
