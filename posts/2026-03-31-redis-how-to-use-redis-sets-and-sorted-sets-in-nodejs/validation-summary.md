# Validation Summary: How to Use Redis Sets and Sorted Sets in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, Sorted Sets)
- Node.js
- ioredis (Redis client library for Node.js)

## Sources Consulted
- Redis official documentation for SET commands: https://redis.io/docs/latest/commands/?group=set
- Redis official documentation for Sorted Set commands: https://redis.io/docs/latest/commands/?group=sorted-set
- Redis SINTERCARD documentation (Redis 7.0+): https://redis.io/docs/latest/commands/sintercard/
- Redis SMISMEMBER documentation (Redis 6.2+): https://redis.io/docs/latest/commands/smismember/
- ioredis GitHub repository and API documentation: https://github.com/redis/ioredis
- Node.js documentation on top-level await and CommonJS modules: https://nodejs.org/api/esm.html#top-level-await

## Issues Found
1. **Top-level `await` in CommonJS module context (Leaderboard section):** The code after the `Leaderboard` class definition used bare `await` statements (e.g., `await lb.addScore(...)`) outside of any async function. Since the file uses `const Redis = require('ioredis')` (CommonJS syntax), top-level `await` is not supported and would throw a `SyntaxError`. Fixed by wrapping the usage code in an `async function main() { ... }` and calling `main()`.

## Review Notes
- `zscore` and `zincrby` in ioredis return string values (e.g., `'2300'` not `2300`). The inline comments show numeric values for readability, which is a common tutorial convention. Not changed since the code that actually processes these values (e.g., in `getTopN`) correctly uses `parseFloat()`.
- `SMISMEMBER` requires Redis 6.2+ and `SINTERCARD` requires Redis 7.0+. The post does not mention these version requirements, which could cause confusion for users on older Redis versions. Consider adding version notes in a future update.
- The `zrevrange` command used in the Leaderboard class was deprecated in Redis 6.2 in favor of `ZRANGE` with `REV` option, but it remains functional and ioredis supports both. Not changed since it is still widely used and works correctly.
