# Validation Summary: How to Use Redis CLI --scan for Safe Key Enumeration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server and CLI)
- Redis SCAN, HSCAN, SSCAN, ZSCAN commands
- Redis KEYS, DBSIZE, INFO, TTL, DEL, LRANGE commands
- redis-cli command-line interface (--scan, --pattern, --count flags)
- Node.js with ioredis library
- Bash scripting (xargs, wc, while loops)

## Sources Consulted
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis CLI documentation: https://redis.io/docs/latest/develop/connect/cli/
- Redis DBSIZE command documentation: https://redis.io/docs/latest/commands/dbsize/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis HSCAN/SSCAN/ZSCAN command documentation: https://redis.io/docs/latest/commands/hscan/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
No technical issues found.

## Review Notes
- The `xargs` patterns for key deletion can break if key names contain spaces or special characters. This is a common pattern in Redis tutorials and acceptable for typical key naming conventions, but production scripts may want to use null-delimited output (`--no-newline` is not available in redis-cli, so a programmatic approach may be safer for unusual key names).
- The `--count` flag for `redis-cli --scan` is available in Redis 6.x and 7.x. Users on very old Redis versions (3.x/4.x) should verify availability.
- The ioredis code example correctly uses string comparison for the cursor (`cursor !== '0'`), which matches ioredis behavior of returning cursors as strings.
