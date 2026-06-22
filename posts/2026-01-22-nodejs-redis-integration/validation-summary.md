# Validation Summary: How to Use Redis with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Redis
- ioredis
- node-redis
- express-session
- connect-redis
- Socket.IO
- Bull

## Sources Consulted
- Redis node-redis guide: https://redis.io/docs/latest/develop/clients/nodejs/
- node-redis official GitHub documentation: https://github.com/redis/node-redis
- ioredis official GitHub documentation: https://github.com/redis/ioredis
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis SETNX command documentation: https://redis.io/docs/latest/commands/setnx/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- connect-redis official GitHub documentation: https://github.com/tj/connect-redis
- Bull official guide: https://optimalbits.github.io/bull/
- Bull reference documentation: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md
- npm package metadata for redis, ioredis, connect-redis, and bull.

## Issues Found
- The ioredis connection example redeclared `const redis` three times in the same code block. Changed the option and URL examples to `redisWithOptions` and `redisFromUrl` so the snippet is valid JavaScript.
- The heading labeled ioredis as recommended, but current Redis documentation recommends node-redis while still documenting ioredis as a supported older JavaScript client. Removed the recommendation wording.
- The post used deprecated Redis commands `SETEX` and `SETNX`. Replaced them with `SET` using `EX` and `NX` options.
- The sorted-set examples used deprecated Redis commands `ZREVRANGE` and `ZRANGEBYSCORE`. Replaced them with `ZRANGE` using `REV` and `BYSCORE`.
- The connect-redis example used the older default export pattern and an ioredis client. Current connect-redis v9 documentation uses the named `RedisStore` export and a node-redis client, so the example and install command were updated accordingly.
- The custom session manager used `crypto.randomUUID()` without importing `crypto`. Added `const crypto = require('node:crypto');`.
- The transactions example redeclared `const results` in the same code block. Renamed the variables to `pipelineResults` and `transactionResults`.

## Review Notes
The examples are written in ioredis command style unless otherwise noted. node-redis also supports raw Redis command names and camel-cased helpers, but command modifiers in node-redis are commonly shown with JavaScript option objects in current documentation.
