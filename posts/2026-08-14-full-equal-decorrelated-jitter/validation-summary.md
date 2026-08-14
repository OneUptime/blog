# Validation Summary: Full Jitter, Equal Jitter, or Decorrelated Jitter?

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Capped exponential backoff
- Full, equal, and decorrelated jitter algorithms
- Retry design for distributed clients
- AWS SDK retry modes and retry quotas
- Google Cloud Storage client-library retries
- Go `time.Duration`, integer overflow, random-number generation, and cancellation
- HTTP `Retry-After`

## Sources Consulted
- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [AWS architecture backoff simulator source](https://github.com/aws-samples/aws-arch-backoff-simulator/blob/master/src/backoff_simulator.py)
- [AWS SDKs and Tools retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS Developer Tools Blog: Announcing updated retry behavior for AWS SDKs and Tools](https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/)
- [Amazon Builders Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Well-Architected Framework: Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [Google AIP-4221: Client-side retry](https://google.aip.dev/client-libraries/4221)
- [Google API Extensions for Go: `Backoff` and cancelable `Sleep`](https://pkg.go.dev/github.com/googleapis/gax-go/v2)
- [Go `time.Duration` documentation](https://pkg.go.dev/time#Duration)
- [Go monotonic clock documentation](https://pkg.go.dev/time#hdr-Monotonic_Clocks)
- [Go specification: integer overflow](https://go.dev/ref/spec#Integer_overflow)
- [Go `math/rand/v2` documentation](https://pkg.go.dev/math/rand/v2)
- [Go `context` documentation](https://pkg.go.dev/context)
- [RFC 9110, Section 10.2.3: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 6585, Section 4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)

## Issues Found
1. **Conflated replacing retries with layering retries:** The post said that replacing an SDK's retry behavior could create nested retries. Nesting is caused by adding another retry layer while SDK retries remain active; disabling or replacing the SDK behavior instead risks losing service-specific error classification and retry quotas. The sentence was corrected to distinguish these cases.
2. **Missing domain requirement for the decorrelated-jitter pseudocode:** The shown recurrence is well-defined across retries only when `0 < initial <= cap`. With a smaller cap, clamping can make the next call to `uniform(initial, previous * 3)` invalid or degenerate. The required assumption was added before the pseudocode.

## Review Notes
- The full- and equal-jitter ranges and expected values are mathematically correct. The decorrelated formula matches the AWS simulator, including applying the cap after sampling.
- AWS's simulation supports the stated comparison: equal jitter took longer and did slightly more work than full jitter; decorrelated jitter completed slightly faster than full jitter while doing more work. The post correctly limits those findings to that simulated contention workload.
- The `cappedWindow` Go helper compiles and its pre-multiplication guard prevents both unsafe `uint64` conversion and `time.Duration` multiplication overflow for the documented input domain. Boundary and randomized checks found no discrepancy.
- The `AWS_NEW_RETRIES_2026=true` opt-in is accurate as of 2026-08-14. AWS announced that the updated behavior would become the default in November 2026, so this time-sensitive statement should be revisited after that rollout.
- All documentation links in the post resolve to the intended resources. The Builders Library and Google Cloud Storage URLs redirect to their current canonical locations.
