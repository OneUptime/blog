# Design Graceful Dependency Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Resilience, Distributed Systems, Timeout, Retry, Circuit Breaker, Graceful Degradation

Description: Allocate end-to-end deadlines, bound retries, apply backpressure, and define useful degraded behavior when a dependency fails.

---

When a dependency slows down, an unprepared service often waits, retries, fills queues, exhausts workers, and turns a partial dependency fault into a system-wide outage. The resilience controls are familiar: deadlines, retries, backoff, jitter, circuit breakers, concurrency limits, load shedding, and fallback behavior. The difficult part is making them share one budget.

Design from the user journey inward. Decide how much time and capacity the dependency may consume, which operations can be repeated, and what useful result remains when the dependency is unavailable.

## Start with the End-to-End Contract

For each user operation, record:

- response-time objective and caller deadline;
- critical and optional dependencies;
- correctness and freshness requirements;
- whether the operation changes state;
- allowed degraded result;
- queueing and asynchronous alternatives;
- user-visible error and retry guidance.

Example:

| Operation | Dependency | Critical? | Failure response |
| --- | --- | --- | --- |
| View product | recommendations | no | return product without recommendations |
| View product | price | yes | use only a policy-approved fresh cache, otherwise fail clearly |
| Place order | fraud check | yes | reject or hold for review; never silently bypass |
| Send receipt | email provider | no for request | commit order and enqueue bounded delivery work |

Graceful degradation must preserve product and security invariants. Returning a stale price or bypassing authorization can be worse than an explicit failure.

## Allocate a Deadline Budget

A timeout is a local duration. A deadline is the absolute point after which the overall result is no longer useful. Propagate the remaining deadline through the call tree so downstream work stops when the caller has stopped waiting.

An illustrative budget for a 2-second user deadline might be:

```text
end-to-end deadline             2000 ms
edge and application work       350 ms
response serialization reserve  150 ms
dependency budget              1500 ms
  attempt 1 timeout              500 ms
  randomized backoff          50-150 ms
  attempt 2 timeout              500 ms
remaining contingency        350-450 ms
```

These numbers are example team policy. Select timeouts from measured latency distributions, network behavior, connection setup, failure-detection needs, and load tests. Include DNS, TLS, pool waits, and response reads if the client library's timeout does not cover them automatically.

Before each downstream stage, compare the remaining deadline with the minimum useful execution time. Stop work that cannot complete in time. Propagate cancellation so abandoned requests do not continue consuming resources.

gRPC does not set a deadline by default. Its documentation recommends explicit realistic deadlines and notes that server application code must stop work it spawned when a call is cancelled.

## Retry Only a Defined Failure Contract

A retry is additional load on a dependency that may already be overloaded. Permit it only when all of these are true:

- the failure is classified as transient;
- enough end-to-end deadline remains;
- the operation is idempotent or carries a tested idempotency key;
- the retry budget and attempt limit allow it;
- the caller honors server pushback or throttling;
- one selected layer owns the retry policy.

Do not retry authentication failures, invalid input, failed preconditions, or other permanent outcomes. A timeout does not prove that a mutating operation did not happen. The response may have been lost after the server committed it.

For state changes, define semantic idempotency. A unique client request ID should return or converge on the same intended operation, while a later operation with different intent must not be mistaken for a duplicate.

## Prevent Retry Multiplication

If three layers each make an initial attempt plus three retries, one user request can create:

```text
4 x 4 x 4 = 64 downstream attempts
```

Choose one retry layer where failure semantics and remaining deadline are understood. Other layers should surface a clear outcome. Track attempts per logical request and total retry traffic as a fraction of normal calls.

Use exponential backoff with jitter so clients do not retry in synchronized waves. Cap both attempts and elapsed retry time. A retry budget or throttling mechanism should reduce retries when failures dominate, allowing the dependency room to recover.

## Bound Concurrency and Queues

Timeouts limit duration but do not stop a large arrival rate from exhausting resources. Add limits for:

- concurrent requests or connections to each dependency;
- pending requests waiting for a connection;
- active retry attempts;
- queue length and oldest-item age;
- per-tenant or priority consumption where noisy neighbors matter.

When a limit is reached, fail early or shed low-priority work instead of building an unbounded queue. Google SRE notes that queued requests consume memory and latency, and recommends failing early and cheaply when overloaded.

Envoy exposes cluster limits for connections, pending requests, active requests, and retries. A shortened example is:

```yaml
circuit_breakers:
  thresholds:
    - priority: DEFAULT
      max_connections: 200
      max_pending_requests: 40
      max_requests: 400
      retry_budget:
        budget_percent:
          value: 10.0
        min_retry_concurrency: 3
```

These limits are illustrative, not Envoy recommendations for an unknown workload. Envoy circuit breakers are distributed per proxy process rather than globally coordinated, and their live overflow statistics must be monitored. Envoy uses "circuit breaking" for these resource limits; this is distinct from a failure-triggered closed/open/half-open breaker. Load-test the aggregate behavior across all proxy instances.

## Know What Each Control Does

Do not use the terms interchangeably:

| Control | Primary purpose |
| --- | --- |
| Deadline | stop work after the result is no longer useful |
| Retry | recover from selected transient failures |
| Backoff and jitter | spread retry load over time |
| Circuit breaker | block calls likely to fail, then allow bounded recovery probes |
| Rate limit | control admitted request rate |
| Bulkhead | isolate capacity so one dependency or tenant cannot consume all of it |
| Load shedding | reject lower-value work to preserve useful service |
| Fallback | return an explicitly acceptable alternative result |

A circuit breaker does not repair a dependency. A fallback does not automatically reduce load if the service still calls the failing dependency first on every request. A timeout that exceeds the caller's remaining deadline only creates wasted work.

## Make Degraded Behavior Explicit

For every dependency, document a state machine:

```text
healthy
  -> elevated failures: reduce retry budget
  -> open/limited: stop optional calls, serve approved fallback
  -> probe: allow bounded recovery checks
  -> recovered: increase traffic gradually
```

Specify:

- trigger and reset conditions;
- whether state is per instance, zone, region, or global;
- fallback freshness and correctness limits;
- response status and user message;
- backlog handling and maximum age;
- operator override and expiry;
- telemetry showing degraded mode is active.

Recovery can be the most dangerous transition. Releasing a large retry or queue backlog into a newly healthy dependency may immediately overload it again. Drain with rate limits and observe saturation.

## Test Faults, Not Just Fallback Functions

Run production-like experiments for:

```text
connection refused
DNS failure
TLS or authentication failure
slow connection establishment
responses slower than the deadline
partial errors from one zone
dependency overload and throttling
lost response after a committed write
stale or missing fallback data
retry storm from multiple callers
dependency recovery with an existing backlog
```

Verify user SLIs, useful work rate, concurrency, pool waits, queue age, retry amplification, breaker overflow, and dependency load. Confirm that cancellations actually stop application work rather than only closing the network call.

## Operational Readiness Gate

```yaml
dependency_failure_gate:
  end_to_end_deadline_propagated: true
  timeout_scope_verified: true
  retryable_failures_documented: true
  mutating_calls_idempotent: true
  retry_owner_layer: checkout-api
  concurrency_and_queue_limits_tested: true
  degraded_product_behavior_approved: true
  recovery_backlog_tested: true
  dependency_owner: team-pricing
  escalation_path_verified: true
```

This schema is example policy. Official documentation supplies mechanisms and warnings, while the owning teams must choose correctness rules, numerical budgets, and acceptable degradation.

## Official Documentation

- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) explains timeout selection, bounded retries, exponential backoff, jitter, and retry amplification.
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) describes request identifiers and the side-effect risks of retrying state-changing operations.
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) covers overload, load shedding, graceful degradation, retry budgets, and deadline propagation.
- [gRPC deadlines](https://grpc.io/docs/guides/deadlines/) documents explicit deadlines, propagation, cancellation, and application responsibility for stopping work.
- [Envoy circuit breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking) documents connection, pending request, active request, and retry limits plus their statistics.

## Conclusion

Graceful dependency failure comes from one end-to-end budget. Propagate deadlines and cancellation, retry only classified idempotent operations, randomize and cap attempts, bound concurrency and queues, and define a product-safe fallback. Finally, test overload and recovery together, because an uncontrolled backlog can turn recovery into the next failure.
