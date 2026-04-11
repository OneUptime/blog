# Validation Summary: How to Implement Redlock in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (distributed locking via Redlock algorithm)
- Go (golang)
- go-redsync/redsync/v4 library
- redis/go-redis/v9 client library
- Lua scripting in Redis (for atomic release)

## Sources Consulted
- https://pkg.go.dev/github.com/go-redsync/redsync/v4 — redsync package API (confirmed exported types: no `Pool` in main package; `New()` accepts `...redis.Pool` from sub-package)
- https://pkg.go.dev/github.com/go-redsync/redsync/v4/redis — redis sub-package defining the `Pool` interface
- https://pkg.go.dev/github.com/redis/go-redis/v9 — go-redis v9 API (confirmed `SetNX` signature)
- https://redis.io/docs/manual/patterns/distributed-locks/ — canonical Redlock algorithm specification (acquire uses `SET NX PX`, release uses Lua script)

## Issues Found

### Issue 1: `redsync.Pool` type does not exist (compilation error)
- **What was wrong:** Two code examples (Basic Redlock and Helper Function Pattern) used `redsync.Pool` to type a slice of pools. The `Pool` interface is defined in `github.com/go-redsync/redsync/v4/redis`, not in the main `redsync` package. Code using `redsync.Pool` would fail to compile.
- **What was changed:** Added import `redsyncredis "github.com/go-redsync/redsync/v4/redis"` and changed `[]redsync.Pool` to `[]redsyncredis.Pool` in both examples.
- **Why:** The `New()` function signature is `func New(pools ...redis.Pool) *Redsync` where `redis` is the sub-package. A typed slice passed via `...` must match the parameter type.

### Issue 2: Acquire step used unnecessary Lua script instead of canonical `SET NX PX`
- **What was wrong:** The from-scratch implementation used a Lua script (`exists` + `set`) for lock acquisition. The canonical Redlock algorithm specifies a single `SET resource_name my_random_value NX PX 30000` command — no Lua script needed for acquire. The Lua script is only required for the release step (atomic check-and-delete).
- **What was changed:** Removed the `acquireScript` Lua constant and replaced the `client.Eval()` call with `client.SetNX(ctx, resource, value, ttl).Result()`, which maps directly to the `SET ... NX PX` command.
- **Why:** For an educational implementation labeled "from scratch," matching the canonical algorithm is important. Using `SetNX` is simpler, more efficient (no script compilation), and accurately reflects how Redlock works per the specification.

## Review Notes
- The from-scratch implementation's usage example uses only 1 Redis instance, which makes Redlock degenerate to a single-instance lock. This is acceptable as a minimal demo but readers should note that Redlock requires 3+ independent instances for fault tolerance.
- The drift calculation omits an optional `+ 2ms` fixed component that some Redlock descriptions include. The core formula `validity = TTL - elapsed - (TTL * drift_factor)` is correct per the Redis documentation.
- The `TestConcurrentLocks` function is not a standard Go test (no `*testing.T` parameter, no `main()` caller) — it's presented as a standalone demonstration function, which is acceptable for a blog post.
