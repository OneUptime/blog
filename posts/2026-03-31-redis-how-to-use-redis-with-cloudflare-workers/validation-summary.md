# Validation Summary: How to Use Redis with Cloudflare Workers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (via Upstash REST API)
- Cloudflare Workers
- Upstash Redis SDK (`@upstash/redis`)
- Upstash Ratelimit SDK (`@upstash/ratelimit`)
- Wrangler CLI

## Sources Consulted
- Upstash Redis Cloudflare Workers Quickstart: https://upstash.com/docs/redis/quickstarts/cloudflareworkers
- Upstash Redis SDK documentation: https://upstash.com/docs/redis/howto/connectwithupstashredis
- Upstash Pipeline & Transaction docs: https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction
- Upstash Ratelimit Getting Started: https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted
- Upstash Ratelimit Algorithms: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms
- Cloudflare Workers TCP Sockets docs: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
- Cloudflare blog - Announcing connect() TCP Socket API: https://blog.cloudflare.com/workers-tcp-socket-api-connect-databases/
- Redis SETEX deprecation (Redis 6.2 release notes): https://redis.io/docs/latest/commands/setex/

## Issues Found

1. **Incorrect claim about TCP support in Cloudflare Workers**: The post stated "Cloudflare Workers cannot use TCP connections" in two places (introduction and summary). This was true historically but became incorrect in May 2023 when Cloudflare introduced the `connect()` API for outbound TCP sockets. Updated both instances to correctly state that while TCP is now supported, HTTP-based clients like Upstash are preferred in serverless environments due to connection management overhead.

2. **Use of deprecated `redis.setex()` command**: The caching example used `redis.setex(cacheKey, 300, JSON.stringify(data))`. The Redis `SETEX` command has been deprecated since Redis 6.2 (February 2021) in favor of `SET` with the `EX` option. Updated to `redis.set(cacheKey, JSON.stringify(data), { ex: 300 })` which uses the current, non-deprecated approach.

## Review Notes
- The claim "Sub-millisecond edge caching" in the opening bullets is optimistic. HTTP-based Redis calls via Upstash typically have single-digit millisecond latency at best, not sub-millisecond. This is more of a marketing nuance than a code error.
- All other code examples (rate limiting, feature flags, pipelining) are correct and use current APIs.
- The `@upstash/ratelimit` usage including `Ratelimit.slidingWindow(10, '10 s')` and the destructured response `{ success, limit, remaining, reset }` are accurate.
- The `wrangler.toml` configuration and `wrangler secret put` commands are correct.
- The import path `@upstash/redis/cloudflare` is the correct Cloudflare-specific subpath export.
