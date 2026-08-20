# Validation Summary: Ramp Traffic Up Gradually After an Outage

## Status

validated

## Post Type

Technical resilience and traffic-management guide

## Technologies Covered

- Distributed-system outage recovery and capacity discovery
- Concurrency limits and token-bucket rate limiting
- Additive-increase, multiplicative-decrease recovery control
- Exponential backoff and jittered retries
- AWS SDK standard and adaptive retry modes
- Backlog management, traffic classes, and fleet-wide admission control
- HTTP `Retry-After`

## Sources Consulted

- [AWS SDKs and Tools retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS announcement of updated 2026 SDK retry behavior](https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/)
- [AWS Well-Architected: Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [AWS Well-Architected: Fail fast and limit queues](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)
- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)
- [Amazon ECS request throttling: token-bucket burst and sustained rates](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/request-throttling.html)
- [RFC 9110 Section 10.2.3: `Retry-After`](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 3290 Section 5.1.3: token-bucket parameters](https://www.rfc-editor.org/rfc/rfc3290.html#section-5.1.3)
- [RFC 2914: Congestion Control Principles](https://www.rfc-editor.org/rfc/rfc2914.html)
- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)

## Issues Found

- The token-bucket guidance discussed only refill rate, although bucket capacity controls the permitted burst and stored tokens can create a recovery spike. The post now distinguishes sustained rate from burst capacity and advises keeping the recovery burst small or draining stored tokens.
- The pseudocode consumed a rate token before waiting for a concurrency permit. Token-holding waiters could then begin together when permits became available, defeating the intended start-rate bound. It now acquires concurrency first and consumes a rate token immediately before sending.
- The pseudocode released the concurrency permit only on the normal path. The release now occurs in `finally` so timeouts, errors, and cancellation do not leak permits.
- The jitter explanation said randomization prevents simultaneous contention. Because jitter only reduces the probability and size of synchronized spikes, the wording now says that it reduces synchronized contention.
- The 2026 AWS opt-in statement applied the environment flag to SDKs generally, but AWS limits it to SDK and tool releases that have shipped support. The post now scopes the claim to supported releases and uses AWS's precise categories for the pre-2026 differences.
- The retry-layer recommendation did not state that an operation must be safe to repeat. It now limits the advice to retry-safe work before recommending a single deliberate retry layer.
- The `Retry-After` guidance said to cap the signal and add dispersion without ensuring that the result could not be earlier than the server-indicated delay. It now treats the value as a no-earlier-than signal, adds only non-negative jitter afterward, and advises failing or deferring when a local wait limit is shorter.

## Review Notes

- The language-neutral pseudocode is an AIMD sketch, and the post correctly warns that its window sizes, thresholds, and step values require workload-specific tuning.
- AWS's August 2026 documentation confirms full jitter and a retry-quota token bucket in standard mode, the additional client-side rate limiter in adaptive mode, and the need to scope adaptive clients to a shared throttling dimension.
- AWS announced that the 2026 retry behavior would become the default in November 2026. The post correctly dates the opt-in statement to August 2026, but that statement should be rechecked if the post is updated after the rollout.
- All four external documentation links in the post returned HTTP 200 and pointed to the described AWS or RFC resources during validation.
