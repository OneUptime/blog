# Validation Summary: How to Build Custom Retry Middleware in Go

## Status
validated

## Post Type
Tutorial / Technical guide (Go HTTP middleware implementation)

## Technologies Covered
- Go (standard library)
- `net/http` package (`http.RoundTripper`, `http.Client`, `http.DefaultTransport`)
- `math/rand` for jitter
- `sync/atomic` for concurrent metrics counters
- `context` for cancellation propagation
- Exponential backoff and jitter patterns (Full Jitter, Equal Jitter, Decorrelated Jitter)

## Sources Consulted
- Go standard library docs: `net/http` `RoundTripper` — https://pkg.go.dev/net/http#RoundTripper
- Go standard library docs: `http.Request.Clone` — https://pkg.go.dev/net/http#Request.Clone
- Go standard library docs: `io.ReadAll`, `io.NopCloser`, `io.Discard` — https://pkg.go.dev/io
- Go standard library docs: `math/rand` `Int63n` — https://pkg.go.dev/math/rand#Int63n (auto-seeded since Go 1.20)
- Go standard library docs: `sync/atomic` — https://pkg.go.dev/sync/atomic
- Go `net.Error` interface docs: https://pkg.go.dev/net#Error (notes deprecation of `Temporary()` since Go 1.18)
- AWS Architecture Blog: "Exponential Backoff And Jitter" — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ (source of Full/Equal/Decorrelated jitter formulas)
- HTTP status codes per RFC 9110: 408, 429, 500, 502, 503, 504

## Issues Found
1. **Unused `errors` import in the basic retry function block.** The first code snippet imported `"errors"` but never referenced it. In Go, unused imports cause a compile error. Removed the `"errors"` import line.
2. **Unused `context` and `math/rand` imports in the Transport code block.** The `Transport` snippet imported `"context"` and `"math/rand"` but neither was used in that file: `req.Context()` returns `context.Context` via a method call (no import needed), and `rand` is referenced only inside `calculateJitter` (defined in a separate snippet/file). Removed both imports from the Transport block.

## Review Notes
- The `IsRetryableError` function relies on the `Temporary()` interface check. As of Go 1.18, `net.Error.Temporary()` is documented as deprecated ("Not all errors in the net package satisfy the Temporary interface."). The code still compiles and runs correctly, but in modern Go a more robust approach uses `errors.Is(err, context.DeadlineExceeded)`, `net.Error.Timeout()`, and connection-specific checks. Left as-is since it still works and the author's intent is clear.
- The post uses `math/rand` (v1) rather than `math/rand/v2` (introduced in Go 1.22). `math/rand` is still fully supported and is auto-seeded since Go 1.20, so the code works without manual seeding. Not strictly an error; v2 would be the modern preference.
- The post's `Description:` front-matter mentions "circuit breaker patterns," but the post does not actually cover circuit breakers — only retries with exponential backoff and jitter. Left unchanged since it is metadata wording, not a technical-correctness issue, and the task instructions limit edits to technical fixes.
- Edge case in `calculateJitter`: `rand.Int63n` panics when its argument is non-positive. With the default `InitialDelay` of 100ms this is not reachable, but if a user supplied `InitialDelay = 0` (or with `EqualJitter` where `half` could be 0) it would panic. Not patched because it is outside the documented usage.
- The Decorrelated Jitter formula matches the AWS guidance (`min(cap, random_between(base, prev*3))`) — verified against the AWS Architecture Blog reference.
- The HTTP status codes flagged as retryable (408, 429, 500, 502, 503, 504) are appropriate and conventional choices.
- `http.Request.Clone(ctx)` is the correct API for safely producing a deep-enough copy of a request for retries (introduced in Go 1.13, current and recommended).
