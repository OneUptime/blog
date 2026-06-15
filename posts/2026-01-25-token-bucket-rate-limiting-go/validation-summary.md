# Validation Summary: How to Implement Token Bucket Rate Limiting in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http middleware
- Token bucket rate limiting
- HTTP 429 responses
- Rate limit response headers
- Redis-backed rate limiting

## Sources Consulted
- Go `builtin` package documentation for predeclared `min`: https://pkg.go.dev/builtin
- Go `net/http` package documentation for `Request.RemoteAddr` and HTTP server behavior: https://pkg.go.dev/net/http
- Go `net` package documentation for `SplitHostPort`: https://pkg.go.dev/net
- Go `sync` package documentation for `Mutex` and `RWMutex`: https://pkg.go.dev/sync
- Go `time` package documentation for `Time`, monotonic clock behavior, and `NewTicker`: https://pkg.go.dev/time
- RFC 6585 section 4 for HTTP 429 Too Many Requests: https://www.rfc-editor.org/rfc/rfc6585#section-4
- RFC 9110 section 10.2.3 for `Retry-After`: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- go-redis/redis_rate package documentation: https://pkg.go.dev/github.com/go-redis/redis_rate/v10

## Issues Found
- The middleware used `r.RemoteAddr` directly while describing it as a client IP. Go's `net/http` server sets `RemoteAddr` to an `IP:port` address, so using it directly can create a different bucket per connection. Updated the middleware and expensive endpoint example to extract the host with `net.SplitHostPort`, falling back to `RemoteAddr` if parsing fails.
- The middleware calculated `Retry-After` with `int(1/rl.refillRate)`, which returns `0` for common refill rates greater than one token per second. Updated it to use `math.Ceil` so the delay-seconds value is a useful whole-second value.
- The post called `X-RateLimit-*` headers "standard" in the middleware comment. `Retry-After` is standardized by HTTP, while `X-RateLimit-*` headers are common/de facto conventions. Updated the wording to "common rate limit headers."

## Review Notes
- The `min` built-in used in the examples requires Go 1.21 or newer. That is current Go syntax, but readers on older Go versions would need `math.Min`.
- `go-redis/redis_rate` is a Redis-backed rate limiting package, but its documentation describes its algorithm as GCRA/leaky bucket rather than token bucket.
