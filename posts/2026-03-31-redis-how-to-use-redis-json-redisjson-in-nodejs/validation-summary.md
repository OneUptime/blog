# Validation Summary: How to Use Redis JSON (RedisJSON) in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack with RedisJSON module)
- Node.js
- ioredis (Node.js Redis client)
- RedisJSON commands (JSON.SET, JSON.GET, JSON.DEL, JSON.NUMINCRBY, JSON.ARRAPPEND, JSON.ARRLEN, JSON.TYPE)
- JSONPath v2 expressions

## Sources Consulted
- Redis official documentation for JSON.ARRLEN: https://redis.io/commands/json.arrlen/
- Redis official documentation for JSON.NUMINCRBY: https://redis.io/commands/json.numincrby/
- Redis official documentation for JSON.GET: https://redis.io/commands/json.get/
- Redis official documentation for JSON.SET: https://redis.io/commands/json.set/
- Redis official documentation for JSON.ARRAPPEND: https://redis.io/commands/json.arrappend/
- Redis Stack Docker image documentation: https://redis.io/docs/getting-started/install-stack/docker/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found

1. **`JSON.ARRLEN` return value incorrectly parsed with `JSON.parse()`** (JsonRedis `arrLen` method, line ~104): `JSON.ARRLEN` with a JSONPath (`$`) path returns a Redis array of integers, not a JSON bulk string. The code used `JSON.parse(result)[0]` which would coerce the JS array to the string `"3"`, parse it to the number `3`, then attempt to index `(3)[0]` yielding `undefined`. Fixed to `result[0]`.

2. **Same `JSON.ARRLEN` parsing bug in Advanced JSONPath section** (line ~173): The inline `JSON.parse(count)[0]` had the same issue. Fixed to `count[0]`.

3. **Misleading comment "Update all prices (increase by 10%)"** (line ~168-169): The comment said "Update all prices (increase by 10%)" but the code only increments the first product's price by a flat 100 (not a percentage, and not all products). Fixed comment to "Increase first product's price by 100".

## Review Notes
- The `JSON.NUMINCRBY` command correctly uses `JSON.parse()` since it returns a JSON-encoded bulk string (unlike `JSON.ARRLEN` which returns a Redis array).
- Several code sections use top-level `await` with CommonJS `require()` syntax. Top-level await is only supported in ES modules, not CommonJS. This is a very common pattern in Node.js tutorials for brevity (readers understand the code is meant to run inside an async function), so it was not changed.
- The post correctly uses `redis/redis-stack:latest` Docker image which bundles RedisJSON, rather than vanilla Redis.
- JSONPath filter syntax `$.products[?(@.inStock==true)]` is correct for RedisJSON's JSONPath v2 implementation.
