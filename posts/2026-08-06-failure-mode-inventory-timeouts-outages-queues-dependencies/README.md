# Build a Failure-Mode Inventory Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Failure Mode Analysis, Resilience Engineering, Timeouts, Queue Backlog, Distributed Systems, Operational Readiness, Site Reliability Engineering

Description: Inventory credible failures at every system boundary, then define detection, containment, recovery, ownership, and test evidence.

---

An architecture review asks how the system should work. A failure-mode inventory asks what happens when each part is slow, partial, stale, duplicated, overloaded, unreachable, or wrong.

That shift matters because distributed systems rarely fail as a clean binary. One partition can be unavailable, one tenant can hit a poisoned record, a dependency can accept a write after the caller times out, and a queue can remain technically available while its oldest message becomes useless.

NIST describes failure mode analysis as a systematic way to examine a component failure and its effect on the system. Google and AWS document concrete distributed-system risks such as cascading overload, retry amplification, dependency loss, and unbounded backlog. The inventory structure and gating policy below are organizational recommendations.

## Set the Scope and System Boundaries

Start from critical user journeys and persistent state. Draw boundaries around:

- clients, edge, and network paths;
- each service and process;
- synchronous dependency calls;
- queues, streams, and consumers;
- caches and authoritative datastores;
- schedulers, control planes, and deployment systems;
- identity, secret, certificate, and key services;
- zones, regions, accounts, and external providers;
- human escalation and operational access.

For each boundary, list the inputs, outputs, state changes, owner, and assumptions. A service diagram that omits retrying clients, background workers, or the recovery control plane will omit important failure modes.

Use observed incidents, provider documentation, load tests, and architecture changes as inputs. Do not claim the inventory is complete. Record unknown behavior as a risk to investigate.

## Use a Failure Record That Leads to Action

A practical record contains:

| Field | Question |
| --- | --- |
| Component or edge | What fails? |
| Mode | Slow, unavailable, partial, stale, duplicated, corrupt, overloaded, or unauthorized? |
| Trigger | What credible event initiates it? |
| Local effect | What happens immediately at this component? |
| User or business effect | Which journey, data, or obligation is affected? |
| Detection | Which signal distinguishes this mode? |
| Containment | What prevents spread or unsafe work? |
| Mitigation | What action reduces current impact? |
| Recovery | How does normal service and state return? |
| Owner and escalation | Who acts and who accepts residual risk? |
| Test and evidence | How was behavior demonstrated? |

Example:

```yaml
id: FM-checkout-inventory-timeout
edge: checkout-api -> inventory-api
mode: partial-timeout-after-possible-write
trigger: inventory latency exceeds client attempt timeout
user_effect: order result may be ambiguous
detection:
  - checkout outcomes by region and operation
  - inventory reservations without order correlation
containment:
  - one idempotency key reused across retries for the logical order attempt
  - bounded attempts within the journey deadline
mitigation: stop checkout expansion and disable affected route
recovery: reconcile reservation and order ledgers before retrying failures
owner: checkout-platform
dependency_owner: inventory-platform
test_evidence: https://evidence.example.net/failures/FM-checkout-inventory-timeout
```

Do not store sensitive production payloads in the inventory. Link to controlled evidence.

## Analyze Timeouts as Ambiguous Outcomes

A timeout means the caller stopped waiting. It does not prove that the server did no work. The request can commit just before the connection fails, and an immediate retry can duplicate the side effect.

For every remote call, inventory:

- connection, TLS, request, and total operation deadlines;
- whether the timeout covers DNS and connection setup;
- cancellation propagation to downstream work;
- operation idempotency and idempotency-key retention;
- which errors are retryable;
- maximum attempts and backoff with jitter;
- behavior when the deadline expires after a possible commit;
- reconciliation for ambiguous state.

Start with the user-journey deadline and allocate a budget across work, attempts, backoff, and response overhead:

```text
sum(attempt_timeouts) + sum(backoff_delays) + local_work + response_overhead + safety_margin
  <= remaining_journey_deadline
```

Do not copy a timeout from another service. Measure latency distributions under normal, peak, and impaired conditions, then choose a value that limits wasted resources without turning normal tail latency into retries.

AWS's Builders' Library notes that retries can add load to an already failing system and recommends backoff, jitter, and idempotent operations where side effects matter. Google recommends bounded retries and warns against retrying at several layers.

If three layers each make up to four attempts, one user operation can cause up to:

```text
4 * 4 * 4 = 64 deepest-layer attempts
```

Centralize retries at the layer that can judge the operation and its deadline, or enforce a shared retry budget.

## Model Partial and Gray Outages

Whole-service health can hide failures isolated by:

- zone or region;
- partition, shard, replica, or broker;
- tenant, account, or permission;
- operation, payload size, or key range;
- network path or address family;
- old versus new application version;
- warm versus cold cache;
- one dependency endpoint returning intermittent errors.

For each important slice, ask whether aggregate SLIs can hide it. A one-percent global error rate can mean every user fails occasionally or one percent of users fail every time. The mitigation differs.

Test gray behavior: delayed responses, intermittent connection refusal, only one bad partition, stale success responses, and a subset of corrupt payloads. Verify that health checks, load balancing, outlier handling, and alerts do not create more load on healthy capacity.

Kubernetes liveness failure can restart a container, while readiness failure removes its endpoint from ordinary Service traffic. A dependency-wide problem copied into every liveness probe can cause restarts and cascading load. Treat probe configuration as a failure-mode decision, not only a deployment detail.

## Treat Queue Backlog as a Failure Mode

A queue can accept messages while the journey is already outside its freshness objective. Inventory:

- arrival, successful completion, retry, and dead-letter rates;
- oldest message age and age distribution;
- maximum useful message age;
- poison-message and hot-partition behavior;
- ordering and head-of-line blocking;
- consumer concurrency and downstream capacity;
- redelivery and idempotency;
- retention, capacity, and dead-letter limits;
- recovery drain rate.

When completion rate is `P`, new arrival rate is `A`, and backlog is `B`:

```text
net_drain_rate = P - A
estimated_drain_time = B / net_drain_rate
```

If `P <= A`, adding time does not recover the queue. Reduce intake, add safe processing capacity, or prioritize work according to business semantics. Validate that catch-up does not overload the datastore or external dependency.

AWS Well-Architected recommends measuring message age, managing stale work, and using dead-letter or spillover strategies where appropriate. Those are patterns, not permission to discard work. Product and data requirements determine whether dropping, reordering, or replaying a message is safe.

## Inventory Dependency Loss and Recovery

For each hard and soft dependency, cover:

- complete unavailability;
- slow responses and overload rejection;
- quota exhaustion and rate limiting;
- stale, partial, or inconsistent responses;
- authentication or certificate failure;
- regional loss;
- recovery after clients accumulated retries;
- changed API or data contract.

Define a failure contract for the consumer:

- fail closed, fail open, serve stale data, omit optional data, or queue work;
- maximum stale age and consistency limits;
- circuit-breaker and half-open behavior;
- retry budget and overload status handling;
- user response and operator signal;
- reconciliation after recovery.

AWS recommends preserving core functionality through graceful degradation where the business permits it and testing failure pathways. A fallback should be simpler and independently testable. A rarely exercised fallback that shares the failed dependency is not meaningful protection.

## Include Resource and Control-Plane Exhaustion

Inventory finite resources even when autoscaling exists:

- CPU, memory, threads, file descriptors, and ephemeral ports;
- database sessions, locks, IOPS, and storage;
- node, address, load-balancer, API, and provider quotas;
- queue and stream retention;
- certificate lifetime and key-service availability;
- deployment, rollback, and failover control planes;
- monitoring and paging delivery.

Record the saturation signal, safe limit, time to exhaustion, self-protection, and recovery. Autoscaling can amplify a dependency failure if blocked requests consume resources and every new instance adds more calls.

Test what happens at and beyond the limit. The desired behavior is usually bounded rejection or cheaper degraded work, not an unresponsive process that continues accepting requests.

## Rank Without Hiding Catastrophic Modes

Use separate dimensions such as:

- user or business consequence;
- likelihood or exposure frequency;
- detectability before harm;
- containment difficulty;
- recovery complexity;
- confidence in the evidence.

Avoid relying only on a multiplied risk-priority number. Different combinations can produce the same score, and a catastrophic but rare data-loss mode can disappear beneath frequent low-impact issues.

Set hard readiness gates. For example, no launch when a critical mode lacks detection, safe containment, recovery ownership, and a test or authorized time-bounded exception.

## Test Single and Compound Failures

Begin with one controlled fault, then test credible combinations:

- traffic spike while one zone is unavailable;
- dependency latency during a deployment;
- primary failure while the failover control plane is inaccessible;
- consumer outage followed by catch-up against a degraded database;
- monitoring loss during a regional incident;
- expired credential on the recovery path.

Define blast radius, abort conditions, safety owner, and restoration procedure for the test itself. Capture user SLIs, resource signals, alert delivery, mitigation, state correctness, and recovery time.

Update the inventory from every incident, near miss, game day, and architecture change. Remove obsolete modes and re-test changed controls.

## Readiness Checklist

- [ ] Critical journeys and state transitions define the scope.
- [ ] Runtime, asynchronous, data, control-plane, and human boundaries are included.
- [ ] Slow, partial, stale, duplicate, corrupt, overload, and loss modes are considered.
- [ ] Timeouts fit the journey deadline and ambiguous outcomes are reconciled.
- [ ] Retries are bounded, jittered, and safe for side effects.
- [ ] Queue age, drain, poison work, and downstream limits are covered.
- [ ] Every critical mode has detection, containment, recovery, and owners.
- [ ] Aggregate signals cannot hide important failure slices.
- [ ] Single and credible compound failures were exercised safely.
- [ ] Residual risk is explicit and accepted by authorized owners.

## Official Documentation

- [NIST CSRC Glossary: Failure Mode Effects Analysis](https://csrc.nist.gov/glossary/term/failure_mode_effects_analysis)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Google SRE Book: Launch Coordination Checklist](https://sre.google/sre-book/launch-checklist/)
- [AWS Builders' Library: Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Well-Architected: Fail Fast and Limit Queues](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)
- [AWS Well-Architected: Implement Graceful Degradation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_graceful_degradation.html)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

## Conclusion

A failure-mode inventory turns vague resilience claims into testable operating decisions. Work boundary by boundary, include partial and ambiguous behavior, quantify retry and backlog effects, and give every critical mode detection, containment, recovery, and ownership. Then inject the failures safely. Readiness comes from observed behavior, not confidence that a dependency will probably stay up.
