# Validation Summary: How to Implement IoT Device Heartbeat Monitoring with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TTL, keyspace notifications, pub/sub, sets)
- Python 3 with redis-py client library
- Redis CLI

## Sources Consulted
- Redis SET command documentation: https://redis.io/commands/set (confirms `EX` option for expiry in seconds)
- Redis EXISTS command documentation: https://redis.io/commands/exists (returns integer count of existing keys)
- Redis TTL command documentation: https://redis.io/commands/ttl (returns -2 for non-existent key, -1 for no expiry, otherwise seconds remaining)
- Redis keyspace notifications documentation: https://redis.io/docs/manual/keyspace-notifications/ (confirms `Ex` flag combination for keyevent expired notifications, `__keyevent@<db>__:expired` channel format)
- Redis SADD/SREM/SISMEMBER/SCARD command documentation: https://redis.io/commands/sadd, https://redis.io/commands/scard
- redis-py documentation: https://redis-py.readthedocs.io/ (confirms `ex` parameter on `set()`, `psubscribe` message format with `pmessage` type)

## Issues Found
No technical issues found.

## Review Notes
- The `seconds_since_heartbeat` function does not handle the TTL return value of `-1` (key exists but has no expiry). In this application all heartbeat keys are always set with `ex=HEARTBEAT_TTL`, so this edge case would not arise in normal operation. Defensive code could check for it, but it is not a bug in context.
- The `psubscribe` call uses a literal channel name without wildcards; `subscribe` would also work, but `psubscribe` is valid and the code correctly checks for `"pmessage"` type, so this is consistent.
- Redis keyspace notifications have a CPU cost and are not enabled by default. The post correctly shows enabling them via `CONFIG SET`, but for production deployments the setting should be persisted in the Redis config file. This is outside the tutorial's scope but worth noting.
