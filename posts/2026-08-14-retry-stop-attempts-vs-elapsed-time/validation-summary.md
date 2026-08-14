# Validation Summary: Should Retries Stop by Attempt Count or Elapsed Time?

## Status
validated

## Post Type
Technical guide / distributed systems design guide

## Technologies Covered
- Retry policies and exponential backoff
- Attempt ceilings, elapsed deadlines, and per-attempt timeouts
- HTTP `Retry-After` semantics
- gRPC deadlines and deadline propagation
- AWS SDK retry modes, maximum attempts, and retry quotas
- Google Cloud Storage retry behavior
- Go contexts, deadlines, timers, and monotonic time
- Batch retries, queue workers, dead-letter handling, and reconnect loops

## Sources Consulted
- [AWS Well-Architected Framework: Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [AWS SDKs and Tools: Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Boto3: Retries](https://docs.aws.amazon.com/boto3/latest/guide/retries.html)
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Google Cloud Storage: Retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [gRPC: Deadlines](https://grpc.io/docs/guides/deadlines/)
- [RFC 9110 Section 9.2.2: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Section 10.2.3: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [Go `context` package](https://pkg.go.dev/context)
- [Go `time` package](https://pkg.go.dev/time)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)

## Issues Found
1. **The AWS `max_attempts` statement was too broad.** The cross-SDK shared configuration and `AWS_MAX_ATTEMPTS` count the initial request, but language-specific in-code APIs can differ. In particular, Boto3's `Config` object treats `max_attempts` as retries after the initial request and provides `total_max_attempts` for total-call semantics. Qualified the statement accordingly.
2. **The non-idempotent-operation bullet could imply that a ceiling makes retries safe.** An attempt limit bounds duplicate attempts but does not make an operation safe to retry. Changed the bullet to state that distinction explicitly, consistent with RFC 9110's automatic-retry requirements.
3. **The gRPC deadline-propagation wording implied manual propagation everywhere.** Official gRPC guidance says propagation is automatic by default in Java and Go, requires explicit enabling in C++, and varies elsewhere. Changed the text to describe both automatic and explicitly enabled or handled propagation.
4. **The retry-loop pseudocode did not enforce its own budget rules for every call.** The initial attempt was sent without a cancellation/deadline check or a budget-derived attempt timeout. The pre-sleep fit test also omitted the return margin, and the loop did not recheck the minimum useful attempt budget after a wait that could overshoot. Added those checks while preserving the pseudocode structure.
5. **The AWS retry-quota sentence overgeneralized fail-fast behavior.** The `standard` mode normally stops retrying when its quota is depleted, but the documented 2026 behavior still applies a backoff before returning for certain long-polling operations. Changed the sentence from an unconditional fail-fast claim to the precise normal behavior.
6. **`invalid server hint` contradicted the post's earlier fallback policy.** The post correctly says an invalid `Retry-After` value falls back to local backoff, so the invalid hint alone is not a stop reason. Removed it from the stop-reason list.

## Review Notes
- The remaining guidance on combined attempt and elapsed limits, per-attempt timeouts, cancellation, monotonic elapsed-time measurement, server pushback, layered retry amplification, durable rescheduling, and virtual-time testing is technically correct.
- `Retry-After` can contain either an HTTP date or a non-negative decimal delay in seconds. Taking the larger of a valid server delay and local backoff is a conservative client policy; RFC 9110 does not mandate that combination.
- Go's monotonic-time behavior depends on retaining the monotonic component attached to values returned by `time.Now`; parsing, serialization, and several wall-time transformations strip it, and the monotonic clock can pause during system sleep on some platforms. The post correctly tells readers to follow their language's documented primitives.
- The current cross-SDK AWS retry documentation describes updated 2026 behavior that remains opt-in at the validation date. The post does not depend on the changed backoff values, quota costs, or service-specific defaults.
- The fenced examples are language-neutral pseudocode and structured diagnostic data. There are no executable commands or version-specific code snippets to compile or run.
- All cited documentation links resolved. The Amazon Builders' Library and Google Cloud Storage URLs redirect to their current canonical official pages.
