# Validation Summary: How to Build a Rate Limiter from Scratch in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (standard library: `sync`, `time`, `net/http`, `strings`, `context`, `strconv`)
- Redis (via `github.com/redis/go-redis/v9` client)
- Rate limiting algorithms: Fixed Window, Sliding Window, Token Bucket
- HTTP middleware patterns

## Sources Consulted
- Go standard library docs: https://pkg.go.dev/sync, https://pkg.go.dev/time, https://pkg.go.dev/net/http, https://pkg.go.dev/strconv
- go-redis/v9 documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis sorted set commands (ZADD, ZCARD, ZREMRANGEBYSCORE, EXPIRE): https://redis.io/commands/
- HTTP status code 429 Too Many Requests (RFC 6585): https://www.rfc-editor.org/rfc/rfc6585
- Rate limiting algorithm references: token bucket (RFC 2697-style description), sliding window log, fixed window counter

## Issues Found
- **Missing `strconv` import in the Redis sliding window snippet.** The `floatToString` helper at the bottom of that code block calls `strconv.FormatFloat`, but the imports listed only `context`, `time`, and `github.com/redis/go-redis/v9`. As written, the file would fail to compile with "undefined: strconv". Fixed by adding `"strconv"` to the import block.

## Review Notes
- The `go-redis/v9` API usage (`Pipeline()`, `ZRemRangeByScore`, `ZCard`, `ZAdd`, `Expire`) matches the current library signatures, including the `redis.Z` struct used in `ZAdd`.
- `time.Time.UnixMicro()` is correctly used (available since Go 1.17). Converting it through `float64` is a roundabout but functionally valid way to produce the sorted-set score/member; using `strconv.FormatInt` on the raw int64 would be more idiomatic, but this is a style preference, not a correctness issue.
- The race-condition caveat noted in the Redis section (check-then-add not being atomic) is accurate; the suggestion to wrap in a Lua script for strict guarantees is the standard remedy.
- The token-bucket `cleanup` goroutine never calls `ticker.Stop()`. Since the goroutine is expected to run for the lifetime of the process, this is not a leak in practice, but a `defer ticker.Stop()` would be preferable in production code.
- The IPv6 port-stripping logic in `extractClientKey` skips stripping when more than one `:` is present, which leaves `[::1]:8080`-style addresses untrimmed. This is a minor limitation but the author's intent (avoiding mangling bare IPv6 addresses) is reasonable and the comment makes the trade-off explicit.
- HTTP `429 Too Many Requests` and the `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` header conventions are correctly described.
- All other code (Fixed Window, Token Bucket, Tiered Limiter, middleware integration) compiles and behaves as described.
