# Validation Summary: How to Set Up Redis Search (RediSearch) Module

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- Redis Stack
- Docker / Docker Compose
- Python (redis-py)
- Node.js (ioredis)

## Sources Consulted
- Redis Stack documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/
- RediSearch commands reference: https://redis.io/docs/latest/commands/?group=search
- RediSearch configuration: https://redis.io/docs/latest/develop/interact/search-and-query/basic-constructs/configuration-parameters/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/redismodules.html
- ioredis documentation: https://github.com/redis/ioredis
- RedisGraph deprecation notice: https://redis.io/blog/redisgraph-eol/

## Issues Found

1. **RedisGraph listed as part of Redis Stack**: RedisGraph was deprecated and removed from Redis Stack in 2024. Removed "and RedisGraph" from the Redis Stack description.

2. **Docker command in `redis` code block**: The `docker run` shell command was placed in a code block tagged as `redis` with `--` comment syntax. Changed to a `bash` code block with `#` comment syntax, since this is a shell command, not a Redis CLI command.

3. **Node.js code missing ioredis import**: The code example used `new Redis()` without importing the constructor from ioredis. Added `const Redis = require("ioredis");` to the code snippet.

4. **Misleading MINPREFIX comment**: The comment "Allow longer prefix searches" for `FT.CONFIG SET MINPREFIX 2` was inaccurate — MINPREFIX sets the minimum number of characters required in a prefix query, and 2 is the default value. Changed the comment to "Set minimum prefix length for wildcard queries" which accurately describes the parameter.

## Review Notes
- The Docker Compose file uses `version: "3.9"` which is deprecated in Docker Compose V2 but still accepted without errors. Not changed since it remains functional.
- The `FT._LIST` command is used throughout; `FT._LIST` works but the non-underscore form `FT.LIST` is also available in newer RediSearch versions. Both are valid.
- The `FT.CONFIG SET WORKERS 4` command may only be settable at module load time in some RediSearch versions, not at runtime via `FT.CONFIG SET`. Users should check their version's documentation if this command returns an error.
- Python code uses `r.ft("products").search("redis")` which passes a raw string — this works in redis-py but for complex queries, using a `Query` object is recommended.
