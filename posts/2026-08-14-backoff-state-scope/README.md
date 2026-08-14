# Scope Backoff State Per Request, Host, or Client Fleet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Retry State, Rate Limiting, Circuit Breaker, Multi-Tenancy, Distributed System

Description: Keep attempt progression local while sharing only health, rate, and retry-budget signals at the failure-domain scope that actually needs coordination.

---

There is no single correct scope for all backoff state because the phrase mixes several different kinds of state:

- the attempt number and next delay for one logical request;
- health evidence about a destination;
- a rate limiter or retry-token budget;
- a circuit breaker's open and probe state;
- fleet-wide coordination during an outage.

Putting all of these in one shared counter creates coupling. Keeping all of them per request provides no protection against a coordinated fleet. Separate them, then scope each to the failure, throttling, quota, or capacity domain it represents.

## Keep Attempt Progression Per Logical Request

The attempt number, previous decorrelated-jitter delay, elapsed time, absolute deadline, and last failure belong to one operation. Request A should not enter its fourth-delay backoff because unrelated request B failed three times.

Per-request state should include:

~~~text
logical operation identity
attempts started
first attempt time and absolute deadline
previous delay when the algorithm needs it
last retryable failure
server retry directive from the latest response, including any delay or do-not-retry signal
idempotency and conditional-write data
~~~

Resetting this state means the logical operation completed or a genuinely new operation began. A later retry of the same durable job after process restart may need to restore the attempt count and a persisted expiry, or reconstruct the remaining budget from a persisted first-seen wall time and the original total budget, rather than pretend it is new. A process-local monotonic timestamp cannot be reused after restart.

Add independent jitter to client-computed per-request backoff. When a protocol supplies server-directed retry timing, follow its semantics rather than applying jitter unconditionally. A shared host failure timestamp plus a deterministic delay can make every request wake together.

## Share Health State by Destination Failure Domain

A circuit breaker and retry-token budget need observations across requests. Scope them to the smallest group expected to fail or throttle together:

~~~text
service + region + endpoint group or documented resource dimension
~~~

If a database primary and read replica fail independently, one combined breaker unnecessarily blocks healthy reads. If every endpoint in a regional service shares fate, one breaker per socket address may allow excessive probes.

The correct key comes from the dependency contract. AWS adaptive retry documentation warns that its rate limiter operates per SDK client instance and assumes a single resource. Using one adaptive client across multiple resources lets throttling on one resource slow all of them. That is evidence to partition client or limiter state by the service's throttling dimension. As of August 2026, AWS marks the documented 2026 cross-SDK retry behavior as opt-in on supported SDK and tool versions through <code>AWS_NEW_RETRIES_2026=true</code>, so verify which behavior the deployed SDK version is using.

Expire inactive state and bound the number of keys. A per-URL map with unnormalized paths can become a memory leak and allow attackers to create unlimited limiter buckets.

## Distinguish Backoff from Rate Control

These controls should not share one timestamp:

| Control | Typical scope | State |
| --- | --- | --- |
| attempt backoff | logical request | attempt number, previous delay |
| retry-token budget | destination and optionally tenant | tokens, success and failure updates |
| adaptive rate limiter | documented throttling resource | send rate, throttle observations |
| circuit breaker | shared dependency failure domain | rolling outcomes, open time, probes |
| concurrency limit | resource pool or destination | permits and waiters |

Backoff spaces repeat attempts from one operation. A rate limiter controls all traffic, including first attempts when designed to do so. A circuit breaker rejects work based on aggregate health. Conflating them can make a successful request reset every failed request's attempt delay or make one request monopolize the only recovery probe.

## Use Per-Host State Carefully

The term host can mean DNS name, resolved IP, load-balancer cluster, authority, or API resource. Choose deliberately.

Per-origin state is useful when failures and quotas are defined at the origin. It is too coarse when one origin fronts many independently throttled tenants or tables. Per-IP state is dangerous behind dynamic load balancing: addresses churn, different IPs may share one backend, and retries may naturally select another endpoint.

When <code>retryThrottling</code> is configured, a gRPC client maintains its token state per server name under the retry design, not per individual RPC. Successful RPCs replenish the counter, while retryable or non-fatal failures and pushback that says not to retry deplete it, helping protect a service from retry overload. This does not replace each RPC's own attempt counter or deadline.

## Add Fleet Coordination Only for Fleet Problems

A process-local budget is fast, available, and isolated from a coordination-store outage. Across thousands of processes, however, every full local bucket can permit a large aggregate burst.

Fleet-shared controls are appropriate when:

- the downstream quota is global and strict;
- clients cannot independently infer a safe share;
- a coordinated failover or recovery ramp must bound total traffic;
- high-value tenants need centrally enforced allocations.

They add failure modes and latency. A central limiter that is unavailable needs an explicit fail-open or fail-closed policy. Its clock and lease semantics must tolerate partitions. Do not write every request's next backoff timestamp to a central database merely for fleet coordination; coordinate admission or token allocation at a coarser level and keep any final client-side jitter local.

A hybrid design can lease a bounded block of retry tokens to each process. The central allocator limits the fleet's total outstanding allocation while local acquisition stays fast; this bounds aggregate token consumption, not instantaneous send rate. Leases need expiry, and clients must stop spending when their authority expires so reissued capacity cannot overlap.

## Isolate Tenants Within a Shared Destination

A destination-wide retry budget limits aggregate retry load, but one tenant can spend all of it. Use hierarchical admission:

1. wait through a cancellation-aware retry delay without holding scarce capacity, applying server-directed timing and client-side jitter according to the protocol;
2. recheck the deadline, cancellation, and retry eligibility;
3. reserve admission from the global destination and tenant budgets atomically, or roll back every partial reservation if a later reservation fails;
4. acquire an attempt-scoped concurrency permit with cancellation and deadline awareness, resolving the admission reservations according to their cancellation or refund policies if acquisition fails;
5. recheck the deadline, cancellation, and retry or breaker eligibility; if no attempt will be sent, resolve each reservation according to its cancellation or refund policy and release the permit, otherwise send, release the permit on every path, and account for each control according to its defined outcome.

Allow controlled borrowing of idle tenant capacity so fixed partitions do not waste throughput. Preserve a minimum share or maximum retry fraction so one noisy tenant cannot starve quiet tenants.

Avoid a permanently retained object for every customer. Use active-tenant caches, bounded tiers, and eviction that cannot reset a noisy tenant into a fresh unlimited budget repeatedly.

## Define Success and Reset Semantics

A successful request can:

- end its own per-request backoff state immediately;
- add evidence to a shared circuit breaker;
- replenish a bounded number of retry tokens;
- update an adaptive rate controller.

It should not necessarily reset shared health to fully healthy after one probe. Circuit breakers normally require a defined transition from open to limited probes to closed. Retry budgets should refill gradually enough that intermittent successes do not unleash every waiting retry.

For a long-lived polling client, success ends the failure streak for that poll operation. The next scheduled poll uses its normal cadence, not the maximum failure delay and not necessarily an immediate request.

## Test Cross-Talk Explicitly

Create scenarios with two operations, two destinations, and two tenants:

- failures for request A must not increment request B's attempt number;
- destination A outage must not block independent destination B;
- retries during a shared dependency outage must consume from the aggregate retry budget, which must constrain their load;
- tenant A exhaustion must leave tenant B a usable share;
- one success must not release an unlimited recovery wave;
- state eviction must not grant unlimited retries to a repeatedly recreated key.

Measure logical calls, attempts, budget rejections, breaker state, and wait time by bounded scope. Unexpected correlation between unrelated dimensions reveals over-shared state.

## Official Documentation

- [AWS SDK retry behavior and adaptive scope](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS SDK for Java 2.x retry strategies](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/retry-strategy.html)
- [gRPC client retry design gRFC A6](https://github.com/grpc/proposal/blob/master/A6-client-retries.md)

## Conclusion

Keep attempt progression and any locally generated jitter per logical request. Share retry tokens, rate observations, circuit state, and concurrency only across calls that truly share the relevant failure, throttling, quota, or capacity domain. Add tenant and fleet coordination as separate admission layers, not as one global backoff counter.
