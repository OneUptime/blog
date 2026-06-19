# Validation Summary: How to Handle Rate Limiting Across Services

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Rate limiting algorithms
- Redis and Redis Lua scripting
- Go HTTP middleware and clients
- go-redis v9
- Python, redis-py, and FastAPI middleware
- TypeScript and ioredis
- Kong API Gateway rate limiting plugins
- Prometheus Go client metrics
- HTTP 429 and Retry-After handling

## Sources Consulted
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HMSET deprecation documentation: https://redis.io/docs/latest/commands/hmset/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Go net/http package documentation: https://pkg.go.dev/net/http
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- ioredis official documentation: https://github.com/redis/ioredis
- Kong Rate Limiting plugin documentation: https://developer.konghq.com/plugins/rate-limiting/
- Kong Rate Limiting Advanced plugin documentation: https://developer.konghq.com/plugins/rate-limiting-advanced/
- Kong rate limiting tiers guide: https://developer.konghq.com/how-to/add-rate-limiting-tiers-with-kong-gateway/
- Prometheus Go client promauto documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- MDN Retry-After header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After

## Issues Found
- The Redis Lua token bucket examples used `HMSET`, which Redis marks as deprecated as of Redis 4.0. Updated both Lua scripts to use variadic `HSET`.
- The Go sliding-window Redis example used `math.random()` in the sorted-set member value. Since Redis sorted-set members must be unique and same-millisecond requests are common, this could overwrite entries and undercount traffic. Replaced it with a Redis `INCR` sequence key passed through `KEYS`.
- The Go HTTP client snippet imported unused `context` and `io`, which would prevent the example from compiling. Removed those imports.
- The Go HTTP client retried requests by reusing `req.Body`; `Request.Clone` only shallow-copies the body. Updated the snippet to require and use `req.GetBody()` for replayable request bodies.
- The Kong YAML used deprecated Redis plugin fields (`redis_host`, `redis_port`, `redis_database`). Updated the snippet to the current nested `redis` configuration.
- The Kong `rate-limiting-advanced` example used a non-matching `limits` structure with embedded `consumer_groups`. Updated it to use consumer-group-scoped plugin instances with `limit`, `window_size`, `window_type`, and `namespace`.
- The Prometheus metrics comment described a gauge as a histogram. Corrected the comment.
- Removed unused Python imports (`hashlib` and `HTTPException`) from the examples.

## Review Notes
The examples are now technically valid as implementation sketches. Production deployments should still tune failure behavior, clock assumptions, trust boundaries for forwarded client IP headers, and concurrency/load-test coverage around the chosen rate-limiting policy.
