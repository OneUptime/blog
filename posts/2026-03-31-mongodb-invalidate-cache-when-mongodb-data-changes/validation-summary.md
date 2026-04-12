# Validation Summary: How to Invalidate Cache When MongoDB Data Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (Node.js driver, Change Streams)
- Redis (ioredis/node-redis)
- JavaScript/Node.js (async/await)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver API (Collection.watch, Collection.updateOne): https://www.mongodb.com/docs/drivers/node/current/
- Redis command reference (DEL, SETEX, KEYS, SADD, SMEMBERS, EXPIRE): https://redis.io/docs/latest/commands/
- ioredis API documentation: https://github.com/redis/ioredis
- node-redis v4 API documentation: https://github.com/redis/node-redis

## Issues Found
No technical issues found.

## Review Notes
- `redis.keys()` is used in Strategies 1 and 3. While technically correct, `KEYS` is an O(N) command that blocks the Redis server and is generally discouraged in production with large key spaces. `SCAN` is the recommended alternative. This is a performance consideration rather than a correctness error.
- MongoDB Change Streams require a replica set or sharded cluster deployment. The post does not mention this prerequisite. Readers using a standalone MongoDB instance would encounter an error.
- `redis.setex()` is still supported but the Redis documentation recommends using `SET` with the `EX` option (available since Redis 2.6.12). This is a style preference, not a deprecation issue.
- The `const listKeys` declaration inside a `switch` `case` block (Strategy 3, line 91) without block scoping braces is valid JavaScript but may trigger linter warnings in some configurations.
