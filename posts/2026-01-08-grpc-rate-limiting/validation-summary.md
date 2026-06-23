# Validation Summary: How to Rate Limit gRPC Services

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- gRPC (Go server interceptors — unary and stream)
- Go (standard library: `sync`, `sync/atomic`, `time`, `context`)
- Rate limiting algorithms (token bucket, sliding window, sliding window counter, leaky bucket, sliding log)
- Redis (distributed rate limiting via `github.com/go-redis/redis/v8`, Lua scripting: `ZADD`/`ZCARD`/`ZREMRANGEBYSCORE`/`HMGET`/`HMSET`/`PEXPIRE`)
- Python (`grpc`, `redis-py`, `threading`, `dataclasses`) gRPC server interceptors
- gRPC status codes (`codes.ResourceExhausted`) and response metadata headers

## Sources Consulted
- gRPC Go interceptor API — https://pkg.go.dev/google.golang.org/grpc (UnaryServerInterceptor, StreamServerInterceptor, ChainUnaryInterceptor, SetHeader)
- gRPC status/codes — https://pkg.go.dev/google.golang.org/grpc/codes and /status (ResourceExhausted is the canonical rate-limit code)
- Go `sync` / `sync/atomic` / `sync.Map` — https://pkg.go.dev/sync
- Go `time` (`UnixMilli` added in Go 1.17) — https://pkg.go.dev/time
- go-redis v8 — https://pkg.go.dev/github.com/go-redis/redis/v8 (NewScript, HMGet/HMSet return types, Pipeline)
- Redis commands & Lua scripting (EVAL) — https://redis.io/docs/latest/commands/ (ZADD, ZCARD, ZREMRANGEBYSCORE, PEXPIRE, HMGET)
- grpc Python ServerInterceptor — https://grpc.github.io/grpc/python/grpc.html (intercept_service, HandlerCallDetails, unary_unary_rpc_method_handler)
- Rate limiting algorithm references (token bucket / sliding window counter) — standard literature

## Issues Found
1. **Go test block missing `sync/atomic` import and carrying an unused `context` import.** The `TestTokenBucketConcurrent` test calls `atomic.AddInt64` but the import list only had `context`, `sync`, `testing`, `time`. In Go, a used-but-unimported package and an imported-but-unused package both fail to compile. Removed `context` and added `sync/atomic`.
2. **`RedisTokenBucket.Tokens()` had a broken type assertion.** It read `result[0].(float64)` / `result[1].(float64)` from `HMGet().Result()`. go-redis returns hash field values as `string`, so the assertions always failed, leaving `tokens`/`lastRefill` at 0 and producing wrong results. Replaced with string assertions parsed via `strconv.ParseFloat`, and added `strconv` to that block's imports.
3. **Distributed interceptor block (`DistributedRateLimiter`) missing `log` and `time` imports.** The code calls `log.Printf` and the constructor signature uses `time.Duration`, but neither was imported. Added both.
4. **`QuotaManager` block missing `fmt` import.** `Consume` and `GetRemainder` call `fmt.Errorf` but `fmt` was not imported. Added it.
5. **`RateLimitInterceptorWithHeaders` block missing imports.** It uses `time.Now()`, `status.Error`, `codes.ResourceExhausted`, and `ratelimit.TokenBucket` but imported only `context`, `strconv`, `grpc`, `metadata`. Added `time`, `google.golang.org/grpc/codes`, `google.golang.org/grpc/status`, and the `your-module/ratelimit` module import.
6. **`PriorityRateLimiter` block had an unused `context` import.** None of its methods take a context. Removed `context` (kept `sync`).
7. **Python example used `grpc` and `futures` without importing them.** The bottom of the Python block calls `grpc.server`, `grpc.StatusCode`, `grpc.unary_unary_rpc_method_handler`, and `futures.ThreadPoolExecutor`. Added `import grpc` and `from concurrent import futures`.

The algorithms themselves were verified as correct: the in-memory token bucket refill math, the sliding-window timestamp pruning, the sliding-window-counter weighting (`prev_weight = 1 - elapsed/window`), the Redis sorted-set sliding-window Lua script, and the Redis token-bucket Lua script are all sound. `codes.ResourceExhausted` is the correct/canonical gRPC status for rate limiting.

## Review Notes
- **go-redis v8 is superseded.** The post imports `github.com/go-redis/redis/v8`. The current maintained line is `github.com/redis/go-redis/v9`. The v8 code as written still compiles and works (the APIs used — `ParseURL`, `NewClient`, `NewScript`, `HMGet`, `Pipeline` — are call-compatible), so this was left as-is, but new projects should prefer v9.
- **Deprecated client dial in the load test.** `grpc.Dial(...)` with `grpc.WithInsecure()` is used in `TestRateLimitUnderLoad`. Both are deprecated in favor of `grpc.NewClient(...)` with `grpc.WithTransportCredentials(insecure.NewCredentials())`. They remain functional. This block is intentionally illustrative and references cross-package symbols (`pb`, `net`, `NewRateLimitInterceptor` from the `interceptors` package) so it is not meant to compile standalone; it was left unchanged beyond noting this.
- **`defaultKeyExtractor` slice `auth[0][:32]`** will panic if the authorization header is shorter than 32 bytes. The author explicitly marks it `// Simplified` and notes JWT parsing belongs in production, so it was left as an intentional simplification.
- **Redis Lua return truncation.** The Redis token-bucket script returns `{1, tokens}` where `tokens` is fractional; Redis truncates Lua numbers to integers on return. The Go code only consumes `result[0]` (the allow/deny flag), so correctness is unaffected, but readers should not rely on the second return value being the precise remaining token count.
- **`SlidingWindowCounter` advances only one window per call.** If more than one full window elapses between requests, the previous-window weighting can be slightly stale. This is a common, acceptable simplification of the algorithm and matches the Python version; behavior is correct under steady traffic.
- The fail-open behavior in the distributed interceptor (allow on Redis error) is called out in a comment with the fail-closed alternative — a reasonable, clearly-flagged design choice.
