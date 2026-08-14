# Validation Summary: Test Jittered Retry Logic Without Slow or Flaky Tests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- `math/rand/v2`
- `time` and monotonic clock behavior
- `context` cancellation and deadlines
- Fake clocks and `testing/synctest`
- Exponential backoff and full jitter
- Deterministic and table-driven testing

## Sources Consulted
- Go `math/rand/v2` package documentation: https://pkg.go.dev/math/rand/v2
- Go `math/rand/v2` seeded-stream regression test: https://go.dev/src/math/rand/v2/regress_test.go
- Go 1.22 release notes for `math/rand/v2`: https://go.dev/doc/go1.22#math-rand-v2
- Go `math.Nextafter` documentation: https://pkg.go.dev/math#Nextafter
- Go `time` package documentation, including monotonic clocks, `Duration`, and `Timer.Stop`: https://pkg.go.dev/time
- Go `context` package documentation: https://pkg.go.dev/context
- Go `testing` package documentation: https://pkg.go.dev/testing
- Go `testing/synctest` package documentation: https://pkg.go.dev/testing/synctest
- Go language specification, numeric conversions: https://go.dev/ref/spec#Conversions
- AWS Architecture Blog, “Exponential Backoff And Jitter”: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- AWS SDK retry behavior reference: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- RFC 9110, HTTP Semantics, idempotent methods and `Retry-After`: https://www.rfc-editor.org/rfc/rfc9110.html
- Go `net/http` package documentation for response-body cleanup and request replay: https://pkg.go.dev/net/http

## Issues Found
- A `NaN` draw bypassed both comparisons in `Policy.Delay`; converting the resulting `NaN` to `time.Duration` is implementation-dependent and could violate the documented range invariant. Added `math.IsNaN(unit)` to the lower-bound clamp.
- The shown `RecordingSleeper` has one fixed `Err`, so it cannot succeed on early waits and return `context.Canceled` on an arbitrary later wait. Clarified that a sequence-aware sleeper is needed for a chosen-wait failure.
- The seeded-randomness paragraph implied that future Go algorithm changes could alter seeded `math/rand/v2` streams. Go keeps fixed-seed standard-library value streams stable across releases; updated the text while retaining the warning that auto-seeded top-level functions guarantee no fixed sequence.
- The sequence stub relied on a generic slice-bounds panic when exhausted despite recommending a clear failure. Added an explicit panic that identifies an unexpected extra draw.
- The fake-clock guidance was stated for every fake clock even though Go's `testing/synctest` clock advances automatically when its goroutines are durably blocked. Scoped the explicit-advance rule to manually controlled fake clocks.
- The cleanup table said a Go timer is “canceled.” Go's timer API uses `Stop`, and context cancellation does not automatically stop an unrelated timer. Changed the assertion to verify that the timer is stopped when context cancellation wins the wait.
- The production-seeding warning claimed identical fixed seeds always create synchronized jitter and excluded valid distinct deterministic seeds. Clarified that identical sequences can synchronize retries when draw schedules align and that deployed replicas may use auto-seeding or distinct per-replica seeds.

## Review Notes
The full-jitter calculation, attempt numbering, cap behavior, pre-multiplication overflow guard, `[0, 1)` random range, context cancellation model, monotonic-time guidance, and `math/rand/v2` concurrency statements were verified as correct after the edits. The code snippets are intentionally partial and rely on the stated constructor validation and surrounding imports.

Go 1.25 and later provide `testing/synctest`, which can virtualize standard-library time and context deadlines and wait for concurrent activity to become quiescent. The post's injected policy and sleeper approach remains appropriate, especially for pure unit tests or code supporting earlier Go versions.

For HTTP retries, closing a response body is required. If persistent connection reuse is also important, Go's `net/http` documentation notes that the body generally must be read to EOF as well as closed.
