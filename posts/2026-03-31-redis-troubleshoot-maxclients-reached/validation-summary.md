# Validation Summary: How to Troubleshoot Redis Maxclients Reached

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (server configuration, CLIENT commands, INFO command)
- Python (redis-py client library with ConnectionPool)
- Node.js (ioredis client library)
- Linux (file descriptor limits, systemd, ulimit)
- Bash scripting (monitoring, awk parsing)

## Sources Consulted
- Redis official documentation for INFO command: https://redis.io/docs/latest/commands/info/
- Redis official documentation for CLIENT KILL command: https://redis.io/docs/latest/commands/client-kill/
- Redis official documentation for CONFIG SET/GET: https://redis.io/docs/latest/commands/config-set/
- Redis GitHub PR #7979 (adding maxclients to INFO clients in Redis 6.2): https://github.com/redis/redis/pull/7979
- redis-py documentation for ConnectionPool
- ioredis documentation for connection options

## Issues Found
1. **Incorrect INFO section for maxclients verification** (line 68): The command `redis-cli INFO server | grep maxclients` was used to verify the maxclients setting after adjusting OS file descriptor limits. However, `maxclients` is not in the `server` section of INFO output — it was added to the `clients` section in Redis 6.2. The command would return no output. Fixed by changing to `redis-cli CONFIG GET maxclients`, which works across all Redis versions.

## Review Notes
- The `CLIENT KILL ID $(...)` pattern on line 164 works correctly in Redis 6.2+ since multiple IDs are accepted in a single `CLIENT KILL ID` call. For Redis < 6.2, a loop would be needed.
- The ioredis (Node.js) example is titled "connection pool" but ioredis uses a single connection per client instance, not a pool. The configuration advice is still valid for proper connection management, but the framing is slightly misleading.
- The `maxclients` field in `INFO clients` is only available since Redis 6.2. For older versions, `CONFIG GET maxclients` is the only way to retrieve it. The post doesn't specify a minimum Redis version.
- The default `maxclients` value of 10000 and the 32 reserved file descriptors claim are both correct per Redis documentation.
