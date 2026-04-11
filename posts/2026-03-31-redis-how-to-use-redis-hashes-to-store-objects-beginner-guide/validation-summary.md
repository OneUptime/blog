# Validation Summary: How to Use Redis Hashes to Store Objects (Beginner Guide)

## Status
validated

## Post Type
Tutorial / Beginner Guide

## Technologies Covered
- Redis (hash data structure, CLI commands)
- Python with redis-py client library
- Node.js with node-redis v4 client library

## Sources Consulted
- Redis official documentation for HSET: https://redis.io/docs/latest/commands/hset/
- Redis official documentation for HGET: https://redis.io/docs/latest/commands/hget/
- Redis official documentation for HMGET: https://redis.io/docs/latest/commands/hmget/
- Redis official documentation for HGETALL: https://redis.io/docs/latest/commands/hgetall/
- Redis official documentation for HEXISTS: https://redis.io/docs/latest/commands/hexists/
- Redis official documentation for HDEL: https://redis.io/docs/latest/commands/hdel/
- Redis official documentation for HLEN: https://redis.io/docs/latest/commands/hlen/
- Redis official documentation for HINCRBY: https://redis.io/docs/latest/commands/hincrby/
- Redis official documentation for HINCRBYFLOAT: https://redis.io/docs/latest/commands/hincrbyfloat/
- Redis official documentation for HSCAN: https://redis.io/docs/latest/commands/hscan/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- node-redis documentation: https://github.com/redis/node-redis

## Issues Found
1. **Node.js example missing `await client.connect()`**: In node-redis v4, the client must be explicitly connected before issuing any commands. Without calling `await client.connect()` after `redis.createClient()`, all subsequent commands will throw a `ClientClosedError`. Added the missing connect call. This is especially important in a beginner guide where readers are likely to copy-paste the code directly.

## Review Notes
- All Redis CLI commands are accurate and use current syntax. HSET with multiple field-value pairs is valid since Redis 4.0 (which deprecated HMSET).
- The Python redis-py examples correctly use the `mapping=` parameter for `hset()` and the `hscan()` iterator pattern.
- The Node.js example correctly uses camelCase method names (`hSet`, `hGetAll`, `expire`) which are the node-redis v4 convention.
- The claim about memory efficiency of hashes vs JSON strings is accurate — small hashes use listpack (formerly ziplist) encoding which is more compact.
- The HSCAN recommendation for large hashes is good advice and technically correct.
