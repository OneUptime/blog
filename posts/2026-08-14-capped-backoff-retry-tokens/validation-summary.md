# Validation Summary: Stop Capped Backoff from Hammering Services with Retry Tokens

## Status
validated

## Post Type
Technical reliability guide

## Technologies Covered
- Exponential backoff and jitter
- Success-replenished retry budgets and token buckets
- Go (`sync.Mutex` and concurrent retry-budget accounting)
- AWS SDK standard and adaptive retry modes
- gRPC retries, deadlines, retry throttling, and server pushback
- Load shedding, concurrency limits, and circuit breakers

## Sources Consulted
- AWS SDKs and Tools retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS announcement for the updated 2026 retry behavior: https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/
- AWS Architecture Blog, "Exponential Backoff and Jitter": https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- AWS Prescriptive Guidance, circuit breaker pattern: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html
- gRPC retry guide: https://grpc.io/docs/guides/retry/
- gRPC A6 client-retries design: https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- gRPC service-config schema: https://github.com/grpc/grpc-proto/blob/master/grpc/service_config/service_config.proto
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- Go `sync.Mutex` documentation: https://pkg.go.dev/sync#Mutex
- Go language specification, integer overflow: https://go.dev/ref/spec#Integer_overflow

## Issues Found
1. **The opening description and rate estimate did not distinguish a capped backoff interval from total caller wait, and the formula ignored jitter and request duration.** A backoff cap stops the interval from growing; it does not bound the logical operation's total duration. Different jitter algorithms also produce different mean delays at the cap. The text and formulas now use the mean post-jitter delay plus mean attempt duration, and the numerical example now states that its post-jitter delay averages 10 seconds.
2. **The AWS 2026 opt-in sentence could imply that every SDK version recognizes the opt-in flag.** AWS documents `AWS_NEW_RETRIES_2026=true` only for SDK versions that have released support. The sentence now includes that version-support qualification while retaining the documented pre-2026 fallback behavior.
3. **The Go budget had no safe initialization path, and `b.tokens += amount` could overflow.** The zero value had zero capacity and could never acquire tokens, while a sufficiently large positive refill could wrap a signed `int` to a negative value before the capacity check. Added `NewRetryBudget` to start a positive-capacity bucket full (with nonpositive capacity disabling retries), and changed `Refill` to compare the refill against remaining capacity before adding. The revised code was formatted and passed a focused Go test covering spend, saturation with `math.MaxInt`, and disabled zero capacity.
4. **The deadline and attempt-cap descriptions overstated or obscured what each control bounds.** A deadline bounds how long the caller waits but does not by itself guarantee that spawned server work has stopped, and an attempt cap bounds the number of attempts rather than the duration of the whole operation. Both descriptions were corrected.
5. **The “nonblocking” heading and reservation discussion were imprecise.** `sync.Mutex.Lock` may briefly block under contention even though `TrySpend` does not queue for token replenishment. The heading now calls this a non-queuing gate, the text states the mutex caveat, and the pre-backoff reservation path now requires exactly one transition to either sent or refunded. The alternative post-backoff spend path now correctly explains that callers can wake to find no token rather than referring to a token “snapshot.”
6. **Two descriptions incorrectly grouped variable behavior.** The conclusion's “fixed retry cadence” did not account for jitter and now says “steady retry-rate regime.” The metrics guidance also incorrectly grouped replenishment under failure class; it now separates token spending by failure class from replenishment by success or attempt class.

## Review Notes
- The AWS retry-quota, adaptive-mode scoping, and August 2026 opt-in claims are otherwise consistent with current AWS documentation. AWS announced November 2026 as the planned default rollout date, and SDK support remains version-specific.
- AWS long-polling operations are a documented exception to immediate return: when quota is depleted, the SDK applies a backoff delay before returning the error, but it still sends no retry. The post's AWS wording only claims that no additional retry is sent, so no correction was needed.
- gRPC retry throttling is analogous to the post's health-sensitive retry budget but uses different accounting: qualifying failed RPCs reduce the per-server-name token count and successful RPCs replenish it. The post does not claim that gRPC uses the illustrated spend-before-retry implementation.
- `RetryBudget` should continue to be used through pointers and must not be copied after first use because it contains a `sync.Mutex`. The constructor and pointer-receiver methods support that usage.
- The author profile resolves correctly, and the external AWS SDK, gRPC retry, and AWS circuit-breaker links resolve to the intended official documentation.
