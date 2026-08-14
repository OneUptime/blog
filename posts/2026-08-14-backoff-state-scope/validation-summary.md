# Validation Summary: Scope Backoff State Per Request, Host, or Client Fleet

## Status

validated

## Post Type

Technical architecture guide

## Technologies Covered

- Exponential and decorrelated-jitter backoff
- Retry state and retry-token budgets
- Adaptive rate limiting
- Circuit breakers and concurrency limits
- AWS SDK retry modes
- gRPC client retries and retry throttling
- Multi-tenant and fleet-wide admission control
- Durable retry timing and distributed token leases

## Sources Consulted

- AWS SDKs and Tools Retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS Developer Tools Blog, "Announcing updated retry behavior for AWS SDKs and Tools": https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/
- AWS SDK for Java 2.x retry strategies: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/retry-strategy.html
- AWS Architecture Blog, "Exponential Backoff And Jitter": https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Amazon Builders' Library, "Timeouts, retries, and backoff with jitter": https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- gRPC client retry design, gRFC A6: https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC Deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- RFC 9110 section 10.2.3, Retry-After: https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3
- Google SRE Book, "Addressing Cascading Failures": https://sre.google/sre-book/addressing-cascading-failures/
- Azure Architecture Center, Transient Fault Handling: https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults
- Azure Architecture Center, Circuit Breaker pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
- Azure Well-Architected Framework, throttling guidance: https://learn.microsoft.com/en-us/azure/well-architected/design-guides/throttling
- Finagle MethodBuilder retry documentation: https://twitter.github.io/finagle/guide/MethodBuilder.html
- Linkerd retry-budget design: https://linkerd.io/2019/02/22/how-we-designed-retries-in-linkerd-2-2/
- Temporal History Service architecture: https://github.com/temporalio/temporal/blob/main/docs/architecture/history-service.md
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Go monotonic clock documentation: https://pkg.go.dev/time#hdr-Monotonic_Clocks

## Issues Found

- The post used the invalid phrase "elapsed deadline" and did not distinguish durable timing state from a process-local monotonic timestamp. I separated elapsed time from an absolute deadline and clarified that a restarted durable job must use a persisted expiry or reconstruct its remaining budget from durable wall-clock data; a process-local monotonic timestamp cannot be reused after restart.
- Per-request state treated every server instruction as a delay. I changed it to a server retry directive so it also covers a do-not-retry signal such as negative or invalid gRPC retry pushback.
- The jitter guidance was unconditional. I limited independent jitter to client-computed backoff and required server-directed timing to follow its protocol semantics. Related fleet, admission, and conclusion wording was updated consistently.
- The AWS 2026 opt-in statement did not mention release support. I clarified that <code>AWS_NEW_RETRIES_2026=true</code> applies to supported SDK and tool versions and that the deployed SDK version and active behavior must both be verified.
- The gRPC paragraph implied retry throttling was always active and that every failure depleted its token count. I made it conditional on <code>retryThrottling</code> configuration, explicitly scoped the state to a gRPC client and server name, and limited depletion to retryable or non-fatal failures and do-not-retry pushback.
- The post used "failure domain" for rate, quota, and concurrency state whose correct scopes can instead be throttling, quota, or capacity domains. I corrected the description, core rule, and conclusion to distinguish those domains.
- The central-database warning was too broad for durable workflow systems, which legitimately persist retry timers. I limited the warning to per-request persistence performed merely for fleet coordination.
- The token-lease paragraph implied that leased retry tokens also bound instantaneous traffic. I clarified that a central allocator bounds outstanding token allocation, not send rate, and that clients must stop spending when lease authority expires so reissued capacity cannot overlap.
- A destination-wide retry budget was said to prevent total overload, but it only limits retry amplification within its scope. I corrected that claim and changed the outage test so it requires retries to consume from and be constrained by the aggregate budget rather than requiring every budget implementation to drain to zero.
- Hierarchical admission could leave partial reservations behind when later reservation or concurrency acquisition failed. I made rollback, cancellation, deadline handling, final eligibility checks, permit release, and outcome-specific accounting explicit.

## Review Notes

- The post contains no runnable code, shell commands, or configuration snippets; validation covered its technical architecture and version-specific claims.
- As of 2026-08-14, AWS's updated 2026 retry behavior is still opt-in for supported releases and is scheduled to become the default in November 2026. The dated paragraph should be revalidated after that rollout.
- gRPC retry-throttling state is client-maintained per server name; it is not fleet-wide coordination across processes or independent clients.
- The author link and all three documentation links in the post returned HTTP 200 during validation.
- No technical issues remain after the listed corrections.
