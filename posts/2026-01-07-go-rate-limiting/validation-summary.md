# Validation Summary: How to Implement Rate Limiting in Go Without External Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- Go modules
- sync.Map and sync.Mutex
- net/http middleware
- Gin middleware
- Redis
- go-redis/v9
- Redis Lua scripting
- Redis hashes and sorted sets
- Token bucket and sliding window rate limiting

## Sources Consulted
- Go sync package documentation: https://pkg.go.dev/sync
- Go modules reference: https://go.dev/ref/mod
- Go module tutorial: https://go.dev/doc/tutorial/create-module
- Gin package documentation: https://pkg.go.dev/github.com/gin-gonic/gin
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis Go client guide: https://redis.io/docs/latest/develop/clients/go/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/

## Issues Found
- The in-memory token bucket cleanup logic checked `TokensRemaining()` without refilling first, so idle buckets would not necessarily appear full and could remain in memory indefinitely. Updated `TokenBucket` to use a shared refill helper and made `TokensRemaining()` refill before returning the token count.
- The sliding window `GetCount()` method did not advance stale windows before calculating the weighted count, which could produce incorrect or negative weighting after idle periods. Added a shared `advanceWindow` helper and used it from both `Allow()` and `GetCount()`.
- The Redis token bucket Lua script used `HMSET`, which Redis documents as deprecated as of Redis 4.0. Replaced it with multi-field `HSET`.
- The Redis sliding window Lua script used `math.random()` to generate sorted-set members and claimed it prevented duplicates. Replaced this with an atomic Redis `INCR` sequence key so same-millisecond requests receive unique members deterministically.
- The Gin middleware snippet used `fmt.Sprintf` but did not import `fmt`. Added the missing import.
- The Gin IP extractor manually returned the raw `X-Forwarded-For` header. Updated it to use Gin's `ClientIP()`, which handles trusted proxy headers according to Gin's documented behavior.
- The standard `net/http` middleware snippet imported `context` without using it. Removed the unused import.
- The complete example referenced `ratelimit` and `middleware` packages without importing them. Added imports using the module path introduced in the setup section.
- The Redis connection warning said the application was falling back to in-memory limiting, but the example still used the distributed Redis middleware. Updated the warning to match the middleware's fail-open behavior.
- The test snippet referenced the `ratelimit` package without importing it. Added the missing package import.
- The sliding window accuracy test slept for 500 ms after filling the current fixed counter window, which would not reliably roll into the next weighted window. Updated the sleep to wait until the next window is half elapsed before checking the expected approximate allowance.

## Review Notes
- The code snippets are suitable as tutorial starting points, but a production implementation should add cancellation/shutdown handling for background cleanup goroutines and more precise `Retry-After`/remaining-limit headers.
- The standard `net/http` IP extractor still treats `X-Forwarded-For` as trusted input. In production, proxy trust boundaries should be configured explicitly before using forwarded headers for rate-limit keys.
