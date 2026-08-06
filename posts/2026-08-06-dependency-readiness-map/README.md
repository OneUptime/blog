# Build a Dependency Readiness Map Before Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Operational Readiness, Service Dependencies, Site Reliability Engineering, Health Checks, Failure Handling, Incident Response

Description: Map runtime and control-plane dependencies with owners, health evidence, failure contracts, capacity limits, and escalation paths.

---

An architecture diagram shows what talks to what. A dependency readiness map shows whether those relationships are safe to operate.

Before launch, every critical dependency needs an owner, a service contract, a way to detect user-relevant failure, a bounded client policy, a tested degraded behavior, and an escalation path. Missing any one of those turns a small upstream fault into an incident discovery exercise.

Google's production guidance includes architecture, interservice dependencies, monitoring, emergency response, capacity, and change management in readiness work. AWS recommends identifying internal and external dependencies and designing tested degraded behavior. The map format and classification in this article are organizational recommendations.

## Start from User Journeys

Do not begin with a cloud-resource inventory. Begin with each critical user journey and trace every synchronous, asynchronous, data, and operational edge that can affect its result.

For an order-placement journey, that could include:

- edge routing and identity validation;
- application and feature-configuration services;
- inventory and payment APIs;
- primary database and cache;
- event broker and order consumer;
- key-management, secret, and certificate services;
- DNS, network, and service discovery;
- deployment, observability, and incident-notification control planes.

Control-plane dependencies matter even when they are not on every request. The service may continue serving during a deployment-system outage but be unable to roll back. Monitoring may be a soft runtime dependency but a hard incident-response dependency.

Trace transitive dependencies far enough to expose shared failure domains. Your payment client may call one endpoint, but the provider may depend on DNS, a regional gateway, a shared quota, and another internal identity service. You may not know the provider's complete implementation. Record the published contract, the unknowns, and the behavior you can control at your boundary.

## Classify Every Edge

Use more than "up" or "down":

| Dependency type | Journey behavior when unavailable | Typical design question |
| --- | --- | --- |
| Hard synchronous | Journey cannot complete correctly | Can it fail fast without corrupting state? |
| Soft synchronous | Journey can return reduced value | What data or feature is safely omitted? |
| Asynchronous | Request can be accepted for later work | How old can backlog become before value is lost? |
| Data authority | Correctness depends on its state | What is safe during stale, partial, or read-only operation? |
| Control plane | Existing serving may continue | Can operators deploy, scale, fail over, or revoke access? |
| Human or external | Resolution needs another team or vendor | Who responds, through which channel, within what expectation? |

A dependency can have different classifications by journey. Recommendations may be soft on a product page but irrelevant to checkout. Identity may be hard for login while cached sessions continue without it for a bounded time.

## Record an Operational Contract

Maintain a structured entry for each material edge:

```yaml
consumer: checkout-api
journey: place-order
dependency: inventory-api
dependency_owner: inventory-platform
relationship: hard-synchronous
interface: grpc Inventory.Reserve v3
traffic:
  expected_rps: 1800
  launch_peak_rps: 3200
  max_attempts_per_user_operation: 2
client_policy:
  overall_deadline_ms: 900
  attempt_timeout_ms: 350
  retry_conditions: [unavailable]
  retry_backoff: exponential-with-jitter
failure_contract:
  timeout: reject order without charging
  explicit_unavailable: reject order without charging
  partial_response: treat as failure
  stale_response: not_accepted
health_evidence:
  user_signal: reserve success and latency SLI
  client_signal: outcomes by status and attempt
  provider_signal: inventory service status dashboard
escalation:
  page_owner: checkout-platform
  dependency_contact: inventory-primary
  incident_channel: incident-coordination
last_failure_test: 2026-07-22
```

The numbers are examples, not recommended defaults. Derive deadlines from the user journey, retry safety, dependency behavior, and measured latency. A remote timeout does not prove that a side effect did not occur, so state-changing operations need an idempotency or reconciliation strategy.

## Define Health at Three Levels

One green health endpoint cannot answer every operational question.

### Process health

Can this process make progress, or is it irrecoverably stuck? In Kubernetes, a failed liveness probe can cause the kubelet to restart a container. Incorrect liveness probes can create cascading failures, so a transient dependency outage normally should not make every consumer fail liveness.

### Traffic readiness

Can this instance serve its assigned traffic correctly now? Kubernetes readiness failures cause matching Service EndpointSlices to mark the Pod endpoint not ready. A strict required backend may be included in readiness, but consider the fleet-wide effect: if the backend fails globally, removing every frontend endpoint can replace a degraded response with total unavailability.

### User-journey health

Can users complete the operation within its SLO? Measure this at the highest practical boundary. A dependency can return HTTP 200 while serving stale or incorrect data, and a process can be ready while all payment calls fail.

Document the purpose and consumer of each signal. Platform probes control routing or restart behavior; SLI measurements and alerts support service decisions. Do not use them interchangeably.

## Write the Failure Contract

For each edge, answer what the consumer does when the dependency is:

- unreachable;
- slow but still responding;
- returning explicit errors;
- returning partial or stale data;
- intermittently failing a subset of calls;
- rate limiting or out of quota;
- duplicating or reordering events;
- serving an incompatible schema;
- recovered after a backlog accumulated.

The contract should state:

1. user-visible outcome;
2. state-change and consistency behavior;
3. timeout and cancellation policy;
4. retry eligibility, count, backoff, and budget;
5. fallback or degradation and its maximum age;
6. overload protection and queue bounds;
7. detection and alert route;
8. recovery and reconciliation steps.

AWS notes that graceful degradation should preserve core functionality when possible and that failure paths should be tested. It also warns that persistent retries against an overloaded dependency can impede recovery. Google documents how retries at several layers multiply load and contribute to cascading failures.

## Make Ownership Operable

A repository `CODEOWNERS` entry is useful for change review but does not establish incident response. For every critical dependency, record:

- provider team and service catalog identifier;
- consumer team that owns the user impact;
- staffed paging route for each environment;
- support contract for an external provider;
- severity translation between teams;
- incident coordination channel;
- executive or vendor escalation for prolonged impact;
- fallback decision authority.

The consumer should page on its user symptom and begin mitigation. It should not wait for a provider alert to decide that its own users are failing. The provider needs enough correlation information to find the affected traffic without receiving customer secrets.

Test the path. Send a non-production escalation or run a scheduled exercise and confirm that a human acknowledges, understands the service name, and can access the relevant evidence.

## Include Capacity and Quotas

A dependency can be healthy and still be unsafe for launch traffic. Record:

- expected average, peak, and launch-spike demand;
- request fan-out and retry amplification;
- documented quota and tested safe throughput;
- connection, concurrency, payload, and rate limits;
- autoscaling lag or manual lead time;
- failover capacity after loss of a zone or region;
- rate-limiting behavior and response codes;
- who can request or approve quota increases.

If one user request fans out to four dependency calls and permits one retry, plan from dependency attempts, not frontend requests. Model the worst legitimate mix, not just the average request.

## Validate the Map with Failure Exercises

For each critical edge, run representative tests in a safe environment:

- add latency beyond the client deadline;
- refuse connections or return documented transient errors;
- return a partial or stale response;
- reduce dependency capacity or trigger rate limiting;
- pause a consumer and build queue backlog;
- revoke or rotate a credential;
- make the control plane unavailable during rollback;
- restore service and observe retry and backlog recovery.

Capture user impact, detection time, page routing, mitigation time, dependency load, and recovery behavior. Stop conditions and rollback for the exercise itself are required, especially in production.

Update the map when the observed behavior differs from the contract. A diagram that says "fallback" while the client continues retrying is a failed readiness control.

## Dependency Readiness Checklist

- [ ] Critical journeys have direct and transitive dependency edges.
- [ ] Runtime, data, control-plane, and human dependencies are included.
- [ ] Each edge has a hard, soft, asynchronous, or control classification.
- [ ] Provider and consumer ownership are explicit and tested.
- [ ] Health signals distinguish process, readiness, and user outcome.
- [ ] Timeouts, retries, idempotency, and cancellation are bounded.
- [ ] Failure and recovery behaviors are written and exercised.
- [ ] Quotas, fan-out, safe capacity, and failover demand are known.
- [ ] Escalation routes work without tribal knowledge.
- [ ] Unknown provider behavior is recorded as risk, not assumed away.

## Official Documentation

- [Google SRE Book: The Evolving SRE Engagement Model](https://sre.google/sre-book/evolving-sre-engagement-model/)
- [Google SRE Book: Launch Coordination Checklist](https://sre.google/sre-book/launch-checklist/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS Well-Architected: Implement Graceful Degradation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_graceful_degradation.html)
- [AWS Well-Architected: Fail Fast and Limit Queues](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

## Conclusion

A dependency is ready only when both sides understand its operational contract. Map each critical journey, classify every edge, separate health semantics, bound retries and capacity, name the people who respond, and test the failure path. The result is more than a diagram: it is evidence that dependency loss will be detected, contained, and coordinated.
