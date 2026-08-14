# Validation Summary: Partition Multi-Tenant Backoff and Retry Budgets Fairly

## Status
validated

## Post Type
Technical architecture and design guide

## Technologies Covered
- Multi-tenant retry budgets and hierarchical admission control
- Token buckets, circuit breakers, and concurrency limits
- Exponential backoff and jitter
- Weighted deficit round robin and fair queueing
- AWS SDK standard and adaptive retry modes
- Amazon SQS fair queues, standard queues, and FIFO message groups
- Distributed token leases and bounded limiter state
- Retry and fairness observability

## Sources Consulted
- AWS SDKs and Tools retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS Developer Tools Blog, "Announcing updated retry behavior for AWS SDKs and Tools": https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/
- AWS SDK for Java 2.x retry strategies: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/retry-strategy.html
- AWS SDK for Java 2.x best practices: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/best-practices.html
- AWS SDK for Java 2.x singleton service clients: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/singleton-service-clients.html
- Amazon SQS fair queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fair-queues.html
- How Amazon SQS fair queues work: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fair-queues-detailed.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- RFC 9110, HTTP Semantics, section 9.2.2 on idempotent retries: https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2
- Google SRE, "Addressing Cascading Failures": https://sre.google/sre-book/addressing-cascading-failures/
- AWS Architecture Blog, "Exponential Backoff and Jitter": https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- gRPC retry and retry-throttling guidance: https://grpc.io/docs/guides/retry/
- Envoy retry-budget reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto.html
- Prometheus instrumentation and label-cardinality guidance: https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels
- Shreedhar and Varghese, "Efficient Fair Queuing Using Deficit Round-Robin": https://doi.org/10.1145/217382.217453

## Issues Found
- The admission sequence had only one concurrency permit. Fair dispatch by itself does not stop a tenant with long-running attempts from occupying all destination concurrency. Changed the sequence to require both global and tenant or tier attempt-scoped limits, added concurrent-attempt share limits, and clarified that materially different work should consume scheduler credit according to estimated cost.
- Retry tokens and destination health were checked before fair scheduling and backoff, but the final pre-send check covered only cancellation and deadline. Expanded the refund rule to cover later admission failures and added final checks for destination health and reservation validity so stale reservations or a newly opened circuit cannot authorize a send.
- The adaptive retry description omitted AWS's throttling-heavy and latency-tolerant conditions and did not say that the 2026 opt-in flag requires a supporting SDK release. Tightened both statements and required checking the SDK version and active settings.
- A correctly keyed wrapper around a shared adaptive client would not partition the adaptive limiter built into that client. Changed this option to use a shared standard-mode client so the wrapper's keyed limiter is the relevant rate-control state.
- The per-tenant client warning named credentials and DNS state as though they were universally per-client. Qualified the overhead by SDK and transport and limited the examples to connection pools, initialization work, threads, and memory.
- The concurrency example called 40 a retry maximum while also allowing unused capacity to be borrowed. Clarified that 40 is the maximum available to retries without borrowing.
- The progress guarantee and test assertion were unconditional even though an open global gate or exhausted global retry budget must stop all retries. Conditioned minimum tenant progress on global retry capacity being available.

## Review Notes
The post has no executable code or shell commands, but it contains substantial technical implementation detail and is therefore a technical guide rather than a non-code blog. All links in the post resolved to their intended pages. The Amazon SQS claims about `MessageGroupId`, quiet-tenant prioritization, lack of FIFO ordering on standard queues, and FIFO group blocking are correct. AWS currently schedules the updated cross-SDK retry behavior to become the default in November 2026, so the date-specific opt-in paragraph should be rechecked after that rollout. In AWS SDK for Java 2.x, version 2.26.0 introduced `ADAPTIVE_V2`; external `adaptive` configuration selects the corrected behavior, while the older in-code `RetryMode.ADAPTIVE` retains the prior behavior.
