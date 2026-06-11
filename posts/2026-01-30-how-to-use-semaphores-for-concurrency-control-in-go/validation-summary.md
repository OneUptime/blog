# Validation Summary: How to Use Semaphores for Concurrency Control in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Goroutines
- Buffered channels
- `golang.org/x/sync/semaphore`
- `database/sql`
- Context timeouts
- Semaphore-based rate limiting

## Sources Consulted
- `golang.org/x/sync/semaphore` package documentation: https://pkg.go.dev/golang.org/x/sync/semaphore
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- Go database connection management documentation: https://go.dev/doc/database/manage-connections
- Go rate limiting wiki: https://go.dev/wiki/RateLimiting
- `golang.org/x/time/rate` package documentation: https://pkg.go.dev/golang.org/x/time/rate

## Issues Found
- The database connection pool example declared `Query` as returning `*sql.Rows`, but returned `&poolRows{...}`. A `*poolRows` value is not assignable to `*sql.Rows`, so the example would not compile. Changed the return type to `*poolRows`.
- The database connection pool example used the same timeout context for semaphore acquisition and `QueryContext`, then canceled it before the caller could consume returned rows. Changed the timeout context to apply only to semaphore acquisition and left the query under the caller-provided context.
- The `poolRows.Close` method released the semaphore every time `Close` was called. Multiple `Close` calls could over-release the weighted semaphore and panic. Added `sync.Once` so the permit is released exactly once.

## Review Notes
- The semaphore examples use the current `golang.org/x/sync/semaphore` API: `NewWeighted`, `Acquire`, `Release`, and `TryAcquire`.
- The rate limiting example is technically valid as a simple rolling-window limiter, but production Go code often uses `golang.org/x/time/rate` for token-bucket rate limiting.
- For real database connection limits, `database/sql.DB.SetMaxOpenConns` is the built-in connection-pool mechanism. The semaphore wrapper remains valid as an illustrative custom gating example.
