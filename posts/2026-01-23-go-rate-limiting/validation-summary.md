# Validation Summary: How to Implement Rate Limiting in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- `golang.org/x/time/rate`
- Token bucket rate limiting
- Leaky bucket rate limiting
- Sliding window rate limiting
- Go HTTP middleware
- Redis sorted sets
- `github.com/redis/go-redis/v9`

## Sources Consulted
- Go `golang.org/x/time/rate` package documentation: https://pkg.go.dev/golang.org/x/time/rate
- Go `net/http.Request.RemoteAddr` documentation: https://pkg.go.dev/net/http#Request
- Go `net.SplitHostPort` documentation: https://pkg.go.dev/net#SplitHostPort
- Redis go-redis guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis `EVAL` command documentation: https://redis.io/docs/latest/commands/eval/
- Redis `INCR` command documentation: https://redis.io/docs/latest/commands/incr/
- Redis `ZADD` command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis `ZCARD` command documentation: https://redis.io/docs/latest/commands/zcard/
- Redis `ZREMRANGEBYSCORE` command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis `PEXPIRE` command documentation: https://redis.io/docs/latest/commands/pexpire/
- GitHub author profile link: https://github.com/nawazdhandala
- OneUptime link: https://oneuptime.com

## Issues Found
- The custom token bucket `AllowN` method accepted zero or negative request counts. A negative count would increase the token balance because the code subtracted `float64(n)`. Added a guard that rejects `n <= 0`.
- The sliding window section said the in-memory example was "More accurate for distributed systems." The example is process-local, not distributed. Changed the wording to "More accurate than fixed windows."
- The summary table described sliding windows as having "No burst." A sliding window restricts bursts within a rolling window but can still allow up to the configured limit immediately when the window is empty. Changed this to "Restricts bursts."
- The HTTP middleware used `r.RemoteAddr` directly as the visitor key. The Go HTTP server sets `RemoteAddr` to an `IP:port` address, so using it directly can create a separate limiter for each client source port. Updated the middleware to extract the host with `net.SplitHostPort`, falling back to `RemoteAddr` if parsing fails.
- The Redis distributed limiter used a non-transactional pipeline and added the request before returning the allow/deny result. That meant denied requests were still inserted into the sorted set, and concurrent callers could overshoot the limit. Replaced it with a Redis Lua script that removes expired entries, counts the current window, and only adds a unique member when the request is allowed.
- The Redis `Remaining` helper ignored errors from `ZRemRangeByScore`. Updated it to return cleanup errors before counting.

## Review Notes
Go is not installed in this environment, so I could not run local `go build` verification for the snippets. The examples were reviewed against current official package and command documentation instead. The Redis Lua example is suitable for a single Redis instance; Redis Cluster deployments should ensure all script keys are in the same hash slot.
