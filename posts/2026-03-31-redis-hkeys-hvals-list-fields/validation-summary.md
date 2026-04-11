# Validation Summary: How to Use HKEYS and HVALS in Redis to List Hash Fields and Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HKEYS, HVALS, HSET, HGETALL, HLEN, HMGET, HSCAN commands)
- Bash scripting (redis-cli usage)

## Sources Consulted
- Redis official documentation for HKEYS: https://redis.io/commands/hkeys/
- Redis official documentation for HVALS: https://redis.io/commands/hvals/
- Redis official documentation for HSET: https://redis.io/commands/hset/
- Redis official documentation for HGETALL: https://redis.io/commands/hgetall/
- Redis official documentation for HSCAN: https://redis.io/commands/hscan/
- Redis official documentation for HLEN: https://redis.io/commands/hlen/
- Redis official documentation for HMGET: https://redis.io/commands/hmget/

## Issues Found
No technical issues found.

## Review Notes
- All command syntax, time complexities, and return behaviors are accurate per Redis documentation.
- The HSET multi-field syntax used in examples requires Redis 4.0+; this is not explicitly noted but is unlikely to be an issue since Redis 4.0 was released in 2017.
- The bash script example correctly uses `redis-cli HKEYS` which outputs field names one per line, making the grep-based field check valid.
- The comparison table accurately reflects the complexity and return types of all listed commands.
- The recommendation to use HSCAN for large hashes is sound advice for production use.
