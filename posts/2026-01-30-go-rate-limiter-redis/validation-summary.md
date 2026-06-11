# Validation Summary: How to Build a Rate Limiter with Redis in Go

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- Redis
- go-redis v9
- Redis Lua scripting
- HTTP middleware with net/http
- Fixed window, sliding window, and token bucket rate limiting

## Sources Consulted
- Redis Go client guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis connection guide: https://redis.io/docs/latest/develop/clients/go/connect/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API return type documentation: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis HMSET deprecation documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The description mentioned leaky bucket even though the article covers fixed window, sliding window, and token bucket. Updated the description to match the actual algorithms.
- The Redis setup snippet imported `context` without using it, which would not compile. Removed the unused import.
- The Redis setup snippet treated `REDIS_URL` as a raw `Addr` value. Updated it to use `redis.ParseURL` when `REDIS_URL` is provided, while preserving the same pooling and timeout settings.
- The fixed-window implementation used separate `INCR` and `EXPIRE` calls. Updated it to use a Lua script so the counter increment and first-expiration setup run atomically.
- The sliding-window limiter was used with the middleware but did not implement `GetRemaining`, so the middleware example would not compile. Added `GetRemaining` for the sliding-window limiter.
- The token bucket Lua script used deprecated `HMSET`. Replaced it with variadic `HSET`.
- The token bucket Lua script returned a Lua number for remaining tokens, but Redis converts Lua numbers to integer replies. Updated the script to return the token count as a string and parse it with `strconv.ParseFloat` in Go.
- The HTTP middleware snippet used `context.Context` in the `RateLimiter` interface but did not import `context`. Added the missing import.

## Review Notes
The post is technically relevant and suitable as a Redis-backed Go rate limiting tutorial. Static validation was completed against official documentation, but the local environment did not include the Go toolchain or Redis server, so the snippets could not be compiled or exercised in this container.
