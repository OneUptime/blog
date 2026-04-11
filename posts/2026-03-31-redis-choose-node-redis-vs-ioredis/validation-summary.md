# Validation Summary: How to Choose Between node-redis and ioredis

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Redis
- Node.js
- node-redis (v4+, official Redis client for Node.js)
- ioredis (community Redis client for Node.js)
- Redis Cluster
- Redis Sentinel
- Lua scripting in Redis

## Sources Consulted
- node-redis GitHub repository and README — https://github.com/redis/node-redis
- node-redis clustering documentation — https://github.com/redis/node-redis/blob/master/docs/clustering.md
- node-redis programmability (Lua scripting) documentation — https://github.com/redis/node-redis/blob/master/docs/programmability.md
- ioredis GitHub repository and README — https://github.com/redis/ioredis
- ioredis API documentation (Cluster class) — https://redis.github.io/ioredis/classes/Cluster.html
- Official Redis Node.js client documentation — https://redis.io/docs/latest/develop/clients/nodejs/

## Issues Found

### 1. Misleading MOVED/ASK redirect claim (line 94)
- **What was wrong:** The post stated "ioredis cluster handles `MOVED` and `ASK` redirects automatically and has more tuning options out of the box," implying that node-redis does not handle these redirects. In fact, node-redis also handles MOVED and ASK redirects automatically (its cluster implementation has a `maxCommandRedirections` option defaulting to 16).
- **What was changed:** Reworded to "Both clients handle `MOVED` and `ASK` redirects automatically. ioredis exposes more cluster tuning options out of the box."
- **Why:** The original phrasing was misleading and could cause readers to incorrectly believe node-redis requires manual redirect handling.

### 2. Inaccurate node-redis custom command API reference (line 114)
- **What was wrong:** The post stated "node-redis uses `client.sendCommand()` or the `redis.defineCommand` equivalent for custom scripts." node-redis does not have a method called `defineCommand`. The correct API is `defineScript`, which is passed via the `scripts` option in `createClient`.
- **What was changed:** Reworded to "node-redis supports custom Lua scripts via `defineScript`, which is passed through the `scripts` option in `createClient`. For ad-hoc commands, use `client.sendCommand()`."
- **Why:** Referencing a non-existent `defineCommand` equivalent is factually incorrect and would confuse readers trying to implement Lua scripting with node-redis.

## Review Notes
- The ioredis repository has been moved under the `redis` GitHub organization. The table lists the maintainer as "Luin / community" which is historically accurate (Luin Zhang is the original author), but the repo is now under Redis's org with best-effort community maintenance. The ioredis README itself recommends node-redis for new projects.
- All code examples for both client libraries are syntactically correct and use current, non-deprecated APIs.
- The comparison table entries (auto-pipelining, TypeScript support, Sentinel, Streams, etc.) are all accurate for both libraries.
- The node-redis `defineScript` API is more verbose than ioredis `defineCommand` (requiring `NUMBER_OF_KEYS`, `FIRST_KEY_INDEX`, `parseCommand`, and optionally `transformReply`), which reinforces the post's recommendation to use ioredis for heavy Lua scripting use cases.
