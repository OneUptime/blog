# Validation Summary: How to Use Redis in C with hiredis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- C programming language
- hiredis (official Redis C client library)
- libevent (async adapter)

## Sources Consulted
- hiredis GitHub repository and README: https://github.com/redis/hiredis
- hiredis API reference (hiredis.h header): https://github.com/redis/hiredis/blob/master/hiredis.h
- Redis HSET/HGETALL command documentation: https://redis.io/commands/hset/, https://redis.io/commands/hgetall/
- hiredis async API and adapter headers: https://github.com/redis/hiredis/tree/master/adapters

## Issues Found
- **Misleading section title "Hashing for Consistent Key Distribution"**: The section content demonstrates Redis Hash data structures (HSET, HGETALL) for storing and retrieving field-value pairs, not consistent hashing for key distribution across nodes. These are entirely different concepts. Renamed the section to "Working with Redis Hashes" to accurately reflect the content.

## Review Notes
- The connection error handling calls `redisFree(c)` even when `c` could be NULL. This is safe with hiredis v1.0.0+ (which added a NULL guard in `redisFree`), but would crash on older versions. Since the post installs from the current repository, this is acceptable.
- The pipelining example only prints replies of type `REDIS_REPLY_STRING`, so the first two SET replies (which are `REDIS_REPLY_STATUS`) will be silently skipped. This is technically correct but readers might expect output for all three commands.
- All `redisCommand` format specifiers (`%s`, `%d`) are correctly used and supported by hiredis's internal format parser.
