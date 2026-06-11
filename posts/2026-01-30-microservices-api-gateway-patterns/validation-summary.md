# Validation Summary: How to Build API Gateway Patterns

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- Express
- Axios
- JSON Web Tokens with jsonwebtoken
- Redis and ioredis
- API gateway routing, authentication, authorization, rate limiting, aggregation, transformation, caching, circuit breakers, and logging
- Docker Compose

## Sources Consulted
- Express routing guide: https://expressjs.com/en/guide/routing/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- jsonwebtoken package documentation: https://www.npmjs.com/package/jsonwebtoken
- ioredis project documentation: https://github.com/redis/ioredis
- Redis command documentation for sorted sets and counters: https://redis.io/docs/latest/commands/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose Deploy specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The install command installed `redis` and `rate-limiter-flexible`, but the code uses `ioredis` directly and does not use `rate-limiter-flexible`. Updated the command to install `ioredis` instead.
- The base service registry did not include the `notifications` service used by the BFF aggregation example. Added a notifications service URL.
- The header-routing usage example passed a single object to a constructor that iterates over routing rules. Changed it to an array of rule objects.
- The RBAC implementation split route keys with `pattern.split(':')`, which broke parameterized paths such as `/users/:id`, and its wildcard example `/admin/*` did not match as shown. Updated the split logic and wildcard/parameter conversion.
- `TokenBucketRateLimiter.middleware()` was declared `async`, so `app.use(rateLimiter.middleware())` would receive a Promise instead of middleware. Removed `async` from the factory method.
- The token bucket refill used `Math.floor`, losing fractional refill time on each request and producing inaccurate limits under steady traffic. Changed refill accounting to keep fractional tokens.
- The sliding-window limiter counted before adding the current request but returned the old count, and it recorded rejected requests. Updated it to add only allowed requests and report the current accepted count.
- The field-selection aggregator used `axios` without importing it. Added the missing import.
- The field-selection aggregator mapped responses back to `fields[index]`, which produced incorrect keys when unknown fields were requested. Added a `selectedFields` array so responses map to the fields actually fetched.
- The combined gateway exposed public `/auth/login` and `/auth/register` paths but had no `auth` service target. Added an auth service mapping.
- The combined gateway imported and instantiated `ioredis` without using that instance. Removed the unused import and variable.
- The combined gateway used `app.use('*', ...)`, which fails under current Express 5 routing. Replaced it with pathless catch-all middleware.
- The post described the snippets as "production-ready starting points." Adjusted that claim to "practical starting points" because several examples still require production hardening for concurrency, observability, security policy, and failure handling.

## Review Notes
- JavaScript code blocks were syntax-checked with Node.js after edits.
- A temp install of current packages resolved Express 5.2.1, Axios 1.17.0, ioredis 5.11.1, and jsonwebtoken 9.0.3; Express 5 rejected `app.use('*', ...)`, confirming the catch-all fix.
- The sliding-window limiter is now correct for the tutorial flow, but a production-grade distributed limiter should use a Redis Lua script or another atomic operation to avoid races under high concurrency.
- The Docker Compose snippet is valid Compose syntax. `deploy.replicas` is part of the Deploy specification, but support depends on the Compose implementation and deployment target.
