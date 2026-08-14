# Validation Summary: Choose Fixed, Linear, or Exponential Backoff

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Fixed, linear, and exponential backoff
- Jitter, retry budgets, and circuit breakers
- HTTP 429 Too Many Requests and Retry-After
- Polling and server-directed retry timing
- Optimistic concurrency, lock contention, and database deadlocks
- Client-side rate limiting, deadlines, and cancellation

## Sources Consulted
- AWS SDK retry behavior — https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS Well-Architected retry guidance — https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html
- Google Cloud Storage retry strategy — https://docs.cloud.google.com/storage/docs/retry-strategy
- gRPC connection backoff protocol — https://github.com/grpc/grpc/blob/master/doc/connection-backoff.md
- Kubernetes wait and backoff utilities — https://pkg.go.dev/k8s.io/apimachinery/pkg/util/wait
- RFC 6585, Section 4: 429 Too Many Requests — https://www.rfc-editor.org/rfc/rfc6585.html#section-4
- RFC 9110, Section 10.2.3: Retry-After — https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3
- RFC 9110, Section 9.2.2: Idempotent Methods — https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2
- AWS DynamoDB optimistic locking with version numbers — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_OptimisticLocking.html
- PostgreSQL serialization failure handling — https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html
- PostgreSQL explicit locking and deadlocks — https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS
- MySQL 8.4 InnoDB error handling — https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html
- Google SRE, Addressing Cascading Failures — https://sre.google/sre-book/addressing-cascading-failures/
- Microsoft Azure Well-Architected transient-fault guidance — https://learn.microsoft.com/en-us/azure/well-architected/design-guides/handle-transient-faults

## Issues Found
- The post said that capped exponential backoff becomes a fixed fleet cadence. That is incorrect when jitter remains enabled: the raw delay window stops growing, but effective delays remain randomized. The comparison table and outage section now state that retry-frequency reduction stops at the cap while jitter continues to prevent synchronized cadence. The example sequence was also clarified to continue exponentially until it reaches the cap.
- The post required every schedule to have both a maximum attempt count and a maximum elapsed deadline. Long-lived pollers and reconnectors can intentionally run until cancellation or shutdown. The stop-condition section and conclusion now require an explicit policy appropriate to the operation lifetime, which may use attempt count, elapsed time, maximum age, cancellation, or a combination.
- The retry-token guidance implied a fleet-wide guarantee without identifying token scope. Because retry quotas may be local to a client instance, the guidance now says to enforce retry-token budgets at the intended protection scope.

## Review Notes
- The post contains formulas and language-neutral pseudocode rather than executable, language-specific code, CLI commands, or configuration snippets.
- All external links in the post resolved to their intended resources; the author URL redirects to the canonical GitHub profile.
- The linked AWS retry page currently describes updated 2026 behavior that requires opting in with `AWS_NEW_RETRIES_2026=true` until it becomes the default. The post does not claim AWS-specific defaults, so no version-specific correction was needed.
- The unversioned Kubernetes package link resolved to v0.36.3 during review. Several legacy polling and backoff-manager APIs on that page are deprecated, but the post does not call those APIs.
- Symmetric polling jitter is suitable for a client-chosen nominal interval. If a server-defined interval is a minimum, clients must not jitter below it; the post already directs readers to prefer the server contract.
