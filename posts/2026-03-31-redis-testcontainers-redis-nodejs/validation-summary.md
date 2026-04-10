# Validation Summary: How to Use Testcontainers with Redis in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Testcontainers for Node.js (`testcontainers`, `@testcontainers/redis`)
- Redis (via Docker container)
- node-redis client library (`redis` npm package)
- Jest (test framework with globalSetup/globalTeardown)
- Docker

## Sources Consulted
- `@testcontainers/redis` npm package and source code (https://www.npmjs.com/package/@testcontainers/redis, https://github.com/testcontainers/testcontainers-node)
- `testcontainers` npm package (https://www.npmjs.com/package/testcontainers)
- node-redis v5 documentation and source code (https://www.npmjs.com/package/redis, https://github.com/redis/node-redis)
- Jest globalSetup/globalTeardown documentation (https://jestjs.io/docs/configuration#globalsetup-string)

## Issues Found

1. **`client.quit()` deprecated in node-redis v5** (line 44): The `quit()` method is deprecated in node-redis v5 with a notice to use `close()` instead. Changed `await client.quit()` to `await client.close()`.

2. **Missing import for `GenericContainer`** (Redis Stack section): The code example used `new GenericContainer(...)` without showing the required import statement. Added `import { GenericContainer } from 'testcontainers';` at the top of the code block.

## Review Notes
- The Redis Stack example uses `GenericContainer` and manually constructs the connection URL. `RedisContainer` natively supports redis-stack images (it detects `redis-stack` in the image name and adjusts accordingly), which would provide `getConnectionUrl()` for free. This is a valid alternative approach but not technically wrong as written.
- The install command explicitly lists `testcontainers` alongside `@testcontainers/redis`. Since `testcontainers` is a direct dependency of `@testcontainers/redis`, it gets installed automatically. However, listing it explicitly is justified here because the Redis Stack example imports `GenericContainer` directly from `testcontainers`.
- The Jest globalSetup pattern using `global.__REDIS_CONTAINER__` and `process.env` is correct and matches Jest's documented approach for sharing resources between setup and test files.
- The `setEx()` signature `(key, seconds, value)` is correct for node-redis v4+.
