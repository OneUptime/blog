# Validation Summary: How to Use Redis with NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (TypeScript framework)
- `@nestjs/cache-manager` (caching abstraction)
- `cache-manager` v6 + Keyv (underlying cache library)
- `@keyv/redis` + `keyv` (Redis storage adapter)
- `redis` (node-redis v4 client, for pub/sub)
- `@nestjs/bull` and `bull` (legacy Bull queue integration)
- Redis (cache store, pub/sub broker, queue backend)
- TypeORM (referenced in repository injection example)

## Sources Consulted
- [NestJS official docs — Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS official docs — Queues](https://docs.nestjs.com/techniques/queues)
- [@nestjs/cache-manager GitHub repository](https://github.com/nestjs/cache-manager)
- [@nestjs/cache-manager v3.0 release notes & migration guide](https://docs.nestjs.com/migration-guide)
- [cache-manager v6 docs on cacheable.org](https://cacheable.org/docs/cache-manager/)
- [@keyv/redis npm](https://www.npmjs.com/package/@keyv/redis)
- [Keyv docs — NestJS integration guide](https://keyv.org/docs/caching/caching-nestjs/)
- [cache-manager-redis-yet npm (deprecated notice)](https://www.npmjs.com/package/cache-manager-redis-yet)
- [@nestjs/bull GitHub repository](https://github.com/nestjs/bull)

## Issues Found

1. **Outdated Redis store package (`cache-manager-redis-yet`).** As of `@nestjs/cache-manager` v3 (released April 2026), the underlying `cache-manager` v6 switched to Keyv-based storage adapters. The maintainers of `cache-manager-redis-yet` have explicitly stated the package is no longer supported and that `@keyv/redis` is the replacement. The post's original config (`store: await redisStore({...})`) will not work with the current default install of `@nestjs/cache-manager`. I replaced the install command and the `app.module.ts` example with the current Keyv-based pattern (`stores: [new Keyv({ store: new KeyvRedis({...}) })]`), preserving the original env-var handling for host/port/password.

2. **`cache.reset()` no longer exists.** In `cache-manager` v6, the `reset()` method was removed in favor of `clear()`. Updated `clearAllUserCache()` in `users.service.ts` to call `this.cache.clear()` and updated the comment accordingly.

3. **Cache Configuration Options table was specific to `cache-manager-redis-yet`.** Replaced with the current `@keyv/redis` / Keyv options (`url`, `password`, `username`, `database`, `ttl`, `namespace`). Removed the misleading `max` row (that option applied only to the in-memory store, not Redis).

## Review Notes

- **`@nestjs/bull` is the legacy package.** The post uses `@nestjs/bull` + `bull`, which still works but is now in maintenance mode. The actively developed alternative is `@nestjs/bullmq` + `bullmq`, which uses a different decorator style (`WorkerHost` + `@OnWorkerEvent`). Since `@nestjs/bull` still functions correctly, the code in this section was left unchanged, but a future revision could mention BullMQ as the modern replacement.
- **TTL is in milliseconds.** This has been the case since `cache-manager` v5 and remains true in v6. The post correctly uses milliseconds throughout (`30000`, `60000`, `300000`, `5000`).
- **Pub/Sub section is correct.** The `redis` v4 client API (`createClient`, `duplicate`, `connect`, `quit`, `publish`, `subscribe`, `unsubscribe`) is used correctly, including the important detail that subscribers need a separate connection from publishers.
- **Description mentions session storage**, but the post body does not cover session storage. Minor metadata inconsistency, not a technical error — left as-is.
- **`parseInt(process.env.REDIS_PORT)` lacks a radix** in the original; the rewrite removed this call entirely by using template-literal interpolation in the connection URL.
- The post's `findById` returns `User` but can return `null` (when the record is not found) — this is a typing imprecision common in tutorial code, not introduced by the review, and not technically incorrect at runtime.
