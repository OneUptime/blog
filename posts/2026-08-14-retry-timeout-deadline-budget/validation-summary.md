# Validation Summary: Budget Per-Attempt Timeouts Within One Overall Retry Deadline

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Go
- Go `context`, `time`, and `net/http` standard-library packages
- gRPC deadlines, cancellation, propagation, and retries
- HTTP deadline propagation and `Retry-After` guidance
- Retry budgeting, per-attempt timeouts, exponential backoff, and jitter
- Service-mesh and SDK retry layers

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go `time` package documentation, including monotonic clocks, `Until`, and timers: https://pkg.go.dev/time
- Go `net/http` package documentation, including request contexts and `Transport.ResponseHeaderTimeout`: https://pkg.go.dev/net/http
- Go language specification, select statements: https://go.dev/ref/spec#Select_statements
- Go `testing/synctest` package documentation: https://pkg.go.dev/testing/synctest
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC cancellation guide: https://grpc.io/docs/guides/cancellation/
- gRPC retry guide: https://grpc.io/docs/guides/retry/
- gRPC client retry design (gRFC A6): https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- RFC 9110, `Retry-After`: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- Envoy router retry and route-timeout documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The remaining-budget formula subtracted an absolute deadline directly from `monotonic_now`. Monotonic readings are process-local and are not universally present in absolute timestamps. Changed the formula to `time_until(D)` and documented that Go's `time.Until` uses monotonic subtraction when the `time.Time` retains a monotonic reading, otherwise falling back to wall time.
- The post described deadlines as hard bounds without noting that Go context cancellation is cooperative. Added the qualification that transports and local processing must observe cancellation because a context cannot preempt arbitrary computation.
- `runAttempt` returned `context.DeadlineExceeded` when the finish reserve consumed the remaining budget even though the parent deadline could still be in the future. It now checks `ctx.Err()`, distinguishes an actually elapsed deadline from insufficient attempt budget, and returns a dedicated budget error.
- The sample discussed a minimum useful attempt duration but did not enforce it when deriving the final attempt timeout. Added `minAttempt` to `runAttempt` so the helper refuses attempts whose derived budget is below it.
- The finish reserve was said to cover response decoding even though `send(attemptCtx)` must return before that reserved interval begins. Clarified that body reading and decoding performed by `send` are charged to the attempt budget, while the reserve is for post-attempt cleanup, bookkeeping, and returning the result.
- `waitForRetry` returned success for a zero or negative delay even when the parent context was already canceled. It now checks `ctx.Err()` before the fast path and rechecks it when the timer fires, covering the case where both timer and cancellation are ready.
- The HTTP timeout wording implied generic transport-level limits for both headers and body reads. Replaced it with the precise `http.Transport.ResponseHeaderTimeout` behavior and retained the request context as the outer bound for response-body reads.
- The gRPC propagation wording implied universal automatic propagation. Clarified that deadline-to-timeout conversion applies where automatic propagation is supported and enabled; official documentation notes that support and defaults vary by language.
- The testing advice mentioned injecting only a clock and sleeper, which would not control context deadline timers. Updated it to require a virtual-time facility that controls both `time` and context timers, or injection of all time dependencies.
- The original test assertion required that no `send` start after the overall deadline, but the deadline can expire in the small race between a budget check and the call. Reworded it to test refusal when the deadline is already exhausted at the budget check and to verify that child deadlines never exceed their parent.

## Review Notes
- The Go snippets are syntactically valid with imports for `context`, `errors`, and `time`, and they use current, non-deprecated APIs.
- The duration configuration should be validated at its boundary: `maxAttempt` and `minAttempt` should be positive, `finishReserve` should be non-negative, and `maxAttempt` should not be shorter than `minAttempt`.
- Go's `net/http` does not automatically transmit a context deadline to another HTTP service. The post correctly requires a trusted framework or protocol-specific propagation mechanism instead of accepting an arbitrary end-user header.
- On Go 1.25 or later, `testing/synctest` is an available standard-library option for virtual-time tests that include context deadline timers.
- No technology versions are pinned in the post, and no deprecated APIs or obsolete URLs remain.
