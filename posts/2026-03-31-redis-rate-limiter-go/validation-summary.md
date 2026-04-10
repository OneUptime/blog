# Validation Summary: How to Build a Rate Limiter in Go with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (Golang)
- Redis (sorted sets, INCR, EXPIRE, ZADD, ZCARD, ZREMRANGEBYSCORE, PEXPIRE)
- go-redis v9 (`github.com/redis/go-redis/v9`)
- Lua scripting for Redis atomicity
- HTTP middleware pattern in Go

## Sources Consulted
- go-redis v9 documentation: https://redis.uptrace.dev/guide/go-redis.html
- Go standard library `net/http` package: https://pkg.go.dev/net/http
- Go standard library `net` package (`SplitHostPort`): https://pkg.go.dev/net#SplitHostPort
- Redis command reference (INCR, EXPIRE, ZADD, ZCARD, ZREMRANGEBYSCORE, PEXPIRE): https://redis.io/commands/
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/

## Issues Found
1. **`r.RemoteAddr` includes the port number** — In Go's `net/http`, `r.RemoteAddr` is always in `IP:port` format (e.g., `"192.168.1.1:54321"`). Using it directly as the rate limit key means each TCP connection from the same IP address gets a separate rate limit bucket (since source ports differ per connection), rendering the rate limiter ineffective. Fixed by replacing `clientIP := r.RemoteAddr` with `clientIP, _, _ := net.SplitHostPort(r.RemoteAddr)` to extract only the IP address.

## Review Notes
- **Sorted set member collision at same millisecond**: The sliding window Lua script uses `tostring(now)` (the millisecond timestamp) as the sorted set member. If two requests arrive within the same millisecond, `ZADD` will update the existing member's score rather than adding a new entry, so only one request gets counted. This is a common pattern in rate limiter tutorials and acceptable for most use cases, but under very high concurrency it could allow slightly more requests than the configured limit. A more robust approach would append a unique suffix (e.g., a random value or request counter) to the member.
- **Fixed window INCR/EXPIRE non-atomicity**: The `INCR` and `EXPIRE` calls in the fixed window limiter are not atomic. If the process crashes after `INCR` (when count == 1) but before `EXPIRE`, the key would persist indefinitely without a TTL. A Lua script wrapping both commands would eliminate this edge case. The post does not claim atomicity for the fixed window approach, so this is a design trade-off rather than an error.
- **Open-fail policy**: The middleware allows requests through when Redis is unavailable, which is a reasonable design choice for availability but should be a conscious decision in production systems.
