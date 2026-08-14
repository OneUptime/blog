# Validation Summary: Make Backoff Sleep Respect Cancellation and Deadlines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- `context.Context` cancellation, deadlines, and cancellation causes
- `time.Timer`, duration arithmetic, and monotonic time
- `os/signal.NotifyContext` and graceful shutdown
- Retry and backoff control flow
- HTTP and database resource lifecycle
- Cancellation and leak testing

## Sources Consulted
- Go `context` package documentation — https://pkg.go.dev/context
- Go `time` package documentation — https://pkg.go.dev/time
- Go `os/signal` package documentation — https://pkg.go.dev/os/signal
- Go `errors` package documentation — https://pkg.go.dev/errors
- Go language specification, Select statements — https://go.dev/ref/spec#Select_statements
- Go 1.23 release notes, Timer changes — https://go.dev/doc/go1.23
- Go 1.26 release notes, `os/signal` and timer compatibility changes — https://go.dev/doc/go1.26
- Go Concurrency Patterns: Context — https://go.dev/blog/context
- Go `net/http` package documentation — https://pkg.go.dev/net/http
- Go `database/sql` package documentation — https://pkg.go.dev/database/sql

## Issues Found
- The timer-success branch returned `nil` without performing the final cancellation check described immediately after the example. Because Go chooses pseudo-randomly when both `timer.C` and `ctx.Done()` are ready, the timer case can win after cancellation. Changed the timer branch to return `ctx.Err()`, clarified that the wait—not the timer itself—wakes on cancellation, and noted that the next attempt must still use the same context because no standalone check can eliminate a later cancellation race.
- `waitWithinDeadline` checked deadline feasibility before `ctx.Err()`. An explicitly canceled context that also retained a future deadline could therefore be misreported as `context.DeadlineExceeded`. Added an initial cancellation check so an existing `context.Canceled` or `context.DeadlineExceeded` result is preserved.
- The deadline check added two signed `time.Duration` values, which can overflow, and a negative delay could incorrectly offset the `minAttempt` reserve even though `waitBackoff` treats that delay as immediate. The helper now normalizes negative durations to zero, uses subtraction-based comparisons, and rechecks the reserve after the wait because timers may fire late.
- The helper returned `context.DeadlineExceeded` before the context deadline had actually passed, conflating an insufficient-budget policy decision with real deadline expiry. Added a distinct `ErrInsufficientDeadline` sentinel for policy rejection while retaining `context.DeadlineExceeded` for an elapsed deadline, and included the new outcome in the caller-visible error categories.
- The timer-version caveat referred only to the deployed Go version. For Go 1.23 through Go 1.26, timer-channel compatibility behavior can also depend on the main module's `go` directive and `GODEBUG=asynctimerchan`. Updated the caveat to name those controls.

## Review Notes
- The post contains Go code examples and technical implementation guidance; it has no terminal commands or configuration snippets.
- The one-shot timer is not reset or reused, so its `Stop` usage is safe under both legacy and current timer-channel semantics. Go 1.27 removes the legacy behavior.
- As of Go 1.26, `signal.NotifyContext` records the received signal in `context.Cause`. On older supported Go releases, applications that need a shutdown-specific cause must arrange that cause separately.
- `time.Until` uses monotonic subtraction when the deadline retains a monotonic reading. Parsed or serialized `time.Time` values do not retain that reading, which is consistent with the post's instruction to preserve the monotonic component.
- `syscall.SIGTERM` is platform-specific; the shutdown example is appropriate for the Unix-like server and worker environments where SIGTERM is conventionally used.
