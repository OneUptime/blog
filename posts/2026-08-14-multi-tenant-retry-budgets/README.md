# Partition Multi-Tenant Backoff and Retry Budgets Fairly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Multi-Tenancy, Retry Budget, Backoff, Fairness, Noisy Neighbor, Rate Limiting

Description: Combine global dependency protection with tenant-level retry tokens, fair scheduling, and bounded borrowing so one customer cannot starve others.

---

A shared retry budget protects a dependency from aggregate overload, but it does not guarantee fairness. One tenant with a traffic burst, slow workload, or persistently failing resource can consume every retry token and concurrency permit. Quiet tenants then lose retries even when their operations are healthy enough to recover.

Partition by tenant without abandoning the global ceiling. A useful design is hierarchical: every retry must pass global destination protection and tenant-level fairness before it can send.

## Identify the Shared Bottlenecks

Map each limit to its real scope:

- downstream service or regional capacity;
- API quota by account, table, bucket, project, or method;
- local connection pool and worker concurrency;
- tenant contract or service tier;
- queue consumer capacity;
- fleet-wide retry allowance.

The key is not always the customer ID. A tenant may own several independently throttled resources, or multiple tenants may share one provider account. Use the coarsest bounded key that matches both the downstream failure domain and the fairness requirement:

~~~text
destination + region + throttling resource + tenant or tenant tier
~~~

Normalize and validate keys. Unbounded per-user or raw-resource buckets can exhaust memory and allow attackers to obtain fresh budget by changing identifiers.

## Build Hierarchical Admission

For a retry to start:

1. Verify operation replay safety, deadline, and attempt limit.
2. Check the destination circuit or health gate.
3. Acquire a global destination retry token.
4. Acquire the tenant or tier retry token.
5. Wait for fair scheduling and jittered backoff.
6. Acquire an attempt-scoped concurrency permit.
7. Recheck cancellation and deadline, then send.

Define how reservations are refunded when cancellation occurs between steps. Avoid holding a concurrency permit during backoff. If a global token is reserved well before send, bound reservation time so sleeping work cannot hide all available capacity.

The global bucket protects the dependency. The tenant bucket prevents one tenant from spending the full global bucket. Both can replenish from successful traffic according to a bounded policy.

## Guarantee a Floor and Allow Bounded Borrowing

Static equal partitions waste capacity when most tenants are idle. Unlimited sharing recreates noisy-neighbor starvation. Combine:

- a small guaranteed active-tenant share;
- weighted shares for service tiers when contracts require them;
- borrowing from an idle common pool;
- a maximum burst or retry share per tenant;
- periodic or success-based replenishment with a hard capacity;
- reclamation of unused leases.

Weighted deficit round robin is one scheduling option for queued retries: each active tenant accumulates service credit proportional to its weight, and a send consumes credit. Other fair-queue algorithms can work. The essential property is that a large backlog does not make one tenant the only runnable tenant.

Do not confuse fairness with strict equality. A tenant with ten times the paid capacity may receive a larger weight, while every active tenant still gets a nonzero path to progress.

## Partition State by the Downstream Throttling Dimension

AWS SDK adaptive retry guidance provides a concrete warning. The adaptive limiter operates per SDK client instance, and AWS recommends it for a client targeting a single resource. If one adaptive client serves multiple resources or tenants, throttling on one resource can delay initial requests to unaffected resources. As of August 2026, AWS marks its documented 2026 cross-SDK behavior as opt-in through <code>AWS_NEW_RETRIES_2026=true</code>; confirm the active SDK behavior before depending on exact defaults.

Options are:

- use standard retry mode and implement explicit tenant admission above it;
- create adaptive clients per documented throttling resource when lifecycle and connection costs are acceptable;
- put a correctly keyed limiter in a shared client wrapper;
- avoid adaptive mode when predictable initial-request latency matters.

Do not blindly create one network client per tenant. That can multiply connection pools, credentials, threads, DNS state, and memory. Partition the control state at the required dimension while sharing safe transport resources when the SDK permits it.

## Preserve Tenant Identity Through Delayed Retries

Delayed work must retain a trustworthy tenant identifier. If retries are republished without it, they enter a shared backlog with no way to enforce fairness. Include the tenant in authenticated message metadata or derive it from protected job state, not an untrusted free-form field.

Amazon SQS fair queues are an example of broker-supported noisy-neighbor mitigation for standard queues. Producers set <code>MessageGroupId</code> to identify the tenant; SQS can then prioritize quiet tenants when one group uses a disproportionate share of processing. On standard queues this use does not create FIFO ordering. Fair queues help delivery fairness, but application retry-token and downstream rate controls are still needed.

For FIFO queues, a message group has ordering and concurrency semantics instead. A poison retry can block later work in that tenant's group, so choose grouping granularity and dead-letter behavior deliberately.

## Protect New Work from Waiting Retries

Retries should not automatically outrank first attempts. Otherwise one failing tenant can consume capacity that would have served healthy new work. A useful global policy reserves capacity classes:

~~~text
total destination concurrency: 100
minimum reserved for first attempts: 60
maximum available to retries: 40
unused capacity may be borrowed under bounded rules
~~~

These numbers are illustrative. Measure the tradeoff. First attempts can also overload a dependency, so normal admission and rate limiting still apply.

When a service recovers, thousands of due retries may become eligible together. Fairly interleave tenants, enforce destination concurrency, and ramp the retry share gradually. Jitter alone does not guarantee fairness.

## Prevent Budget Evasion

Tenant partitions create abuse and lifecycle questions:

- a tenant can rotate subresource IDs to obtain fresh buckets;
- evicting an active tenant's empty bucket can reset it to full;
- one customer can create many accounts or queues;
- retries can be mislabeled as first attempts;
- premium weights can be spoofed in message metadata.

Anchor identity in authenticated account state. Use bounded active-tenant caches whose eviction persists or reconstructs recent debt, group tiny tenants into cohorts, and apply a global cap that remains effective even if tenant state is missed.

Admission updates must be atomic enough to prevent concurrent overspend. Distributed fleet enforcement can lease token blocks to processes, but leases need expiry and conservative partition behavior.

## Measure Fairness and Protection Separately

Track:

- attempts, retries, and retry-budget rejections by bounded tenant tier;
- per-tenant or top-N queue dwell time and attempt wait;
- quiet-tenant versus total backlog;
- global and tenant token balances;
- borrowed capacity and reclaimed leases;
- destination concurrency and throttle rate;
- logical success and latency by tenant cohort;
- active tenant count and limiter-state evictions.

Do not export every tenant ID as a metrics label. Maintain a protected top-N diagnostic view, logs keyed by tenant for investigations, and stable tier or cohort metrics for dashboards.

A fairness objective can be expressed as a bound on quiet-tenant dwell time or on each active tier's minimum service share. Aggregate throughput alone can look excellent while small tenants starve.

## Test Noisy, Quiet, and Churning Tenants

Simulate:

1. one tenant generating most failures while several quiet tenants retry occasionally;
2. all tenants failing because the shared dependency is down;
3. only one downstream resource being throttled;
4. idle tenants lending capacity and then becoming active;
5. many short-lived tenant IDs trying to reset budget;
6. a fleet restart with all local buckets initially full;
7. a large delayed backlog becoming due during recovery.

Assert the global send ceiling, minimum active-tenant progress, maximum noisy-tenant share, bounded memory, and no permit held during backoff. Test service-tier weights without allowing a high tier to bypass the dependency safety ceiling.

## Official Documentation

- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS SDK for Java 2.x retry strategies](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/retry-strategy.html)
- [Amazon SQS fair queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fair-queues.html)
- [How Amazon SQS fair queues work](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fair-queues-detailed.html)

## Conclusion

Use a global budget to protect the dependency and tenant-level budgets plus fair scheduling to protect customers from one another. Allow bounded borrowing so idle partitions do not waste capacity, preserve tenant identity through delayed work, and prevent churn or eviction from resetting retry debt.
