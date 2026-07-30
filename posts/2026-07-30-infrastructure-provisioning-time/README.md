# How to Measure Infrastructure Provisioning Time from Request to Ready

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Infrastructure as Code, Provisioning, OpenTelemetry, Metric

Description: Measure infrastructure provisioning as an end-to-end request-to-ready journey with stage latency, percentiles, and verified outcomes.

---

Infrastructure provisioning time should answer a developer's question: "How long after I ask will the resource be usable?" Measuring only a Terraform run, cloud API call, or service-desk resolution hides queues, approvals, retries, and post-provisioning setup.

Use an end-to-end clock:

```text
request-to-ready time = ready_at - intent_at
```

Then decompose that duration so the team can improve the actual constraint.

## Define the Start Boundary

Choose the earliest observable event that represents a valid requester's intent. Depending on the interface, this may be:

- a portal workflow started;
- an API request received;
- an infrastructure pull request opened;
- a service ticket submitted; or
- a GitOps declaration merged.

`intent_at` and `accepted_at` answer different questions. Validation may itself be a significant source of friction, so keep both:

```text
request preparation = accepted_at - intent_at
platform fulfillment = ready_at - accepted_at
```

For a ticket baseline and an API replacement, align the semantic boundary. Comparing ticket creation-to-ready with API acceptance-to-cloud-resource-created unfairly favors the new path.

## Define "Ready" From the Consumer's View

A provider reporting "created" is not necessarily ready. Define a capability-specific readiness contract:

**Database:** endpoint resolves, network policy permits the requester, credentials work, required baseline configuration exists, and a test query succeeds.

**Kubernetes namespace:** namespace, quota, identity binding, policy, secrets integration, and a smoke-test workload are ready.

**Cloud account or subscription:** account exists, guardrails are applied, billing and owner tags exist, identity access propagates, and the requester can perform an allowed test.

**Development environment:** compute is running, repositories and toolchain are available, network dependencies resolve, and a standard build passes.

Emit `ready_at` only after automated verification. If verification cannot be automated, report `resource_created_at` and `developer_confirmed_at` separately rather than pretending creation is readiness.

## Model One Intent and Its Attempts

Retries can inflate request counts and distort duration. Use:

```text
journey_id       one developer intent
attempt_id       one execution attempt
resource_id      resulting resource, when created
```

A retried workflow remains one journey with several attempts. An idempotency key, when consistently reused and enforced by every side-effecting component, prevents retries of the same intent from creating duplicate resources. If the developer abandons one request and starts a materially different request, record a new journey and link it as a replacement.

Retain outcome and lifecycle states:

- ready;
- rejected by policy;
- failed;
- canceled;
- timed out;
- abandoned; and
- still running.

Do not calculate latency from successes alone without also reporting the other outcomes.

## Instrument the Stages

A general sequence is:

```text
intent
  -> validation
  -> policy evaluation
  -> approval
  -> queue
  -> provider provisioning
  -> configuration
  -> access propagation
  -> readiness verification
  -> ready
```

Record start and end timestamps, outcome, reason, provider, resource class, region, template version, and whether a human acted at each stage.

OpenTelemetry traces and spans provide a standards-based model for an operation and nested sub-operations. Long-running orchestration may cross processes and queues; preserve the journey identifier even when trace retention or propagation cannot span the entire business workflow.

Separate:

```text
active processing time = duration covered by execution-stage intervals
wait time = total duration - active processing time
```

Avoid blindly adding overlapping child spans. Parallel operations can make their sum greater than wall-clock time. Merge overlapping execution intervals, or use an explicit critical-path analysis, before decomposition.

## Report a Distribution

For each resource class and reporting window, publish:

- eligible requests started;
- ready, failed, rejected, canceled, and still-running counts;
- median request-to-ready;
- p90 or p95 request-to-ready;
- success within a service target;
- median stage durations; and
- manual-touch rate.

The median describes a typical successful journey; the tail reveals uncommon accounts, regions, or policy branches. An arithmetic mean alone is not sufficient.

Recent running requests are right-censored. For workflows lasting hours or days, use a fixed maturity window or time-to-event analysis. Do not drop open requests or assign them zero duration.

Where the sample is small, show raw counts and wider time buckets instead of noisy percentiles.

## Example Metric Contract

```text
Capability: managed PostgreSQL database
Population: valid non-production requests in supported regions
Start: first valid submission received by any approved channel
Ready: successful authenticated query through the consumer network path
Clock: wall-clock elapsed time, 24x7
Retries: grouped by journey_id
Statistics: median, p90, ready within 30 minutes
Outcomes/observation status: ready, rejected, failed, canceled, or still running (right-censored)
Definition version: 1.3
```

Wall-clock and business-hours durations answer different questions. Developers experience wall-clock delay; staffing analysis may also need supported-hours time. Label both clearly if used.

## Compare Channels and Cohorts Fairly

Segment by:

- resource type and size;
- environment and risk tier;
- region and provider;
- self-service, ticket, or other channel;
- template and platform version;
- standard versus exception path; and
- new versus experienced platform users.

Do not aggregate a two-minute namespace and a three-day production account into one "infrastructure provisioning time." If leadership needs a roll-up, report the share meeting capability-specific targets, weighted transparently by request count.

Before-and-after evaluation should use the same eligibility, start, and readiness rules. A phased rollout allows comparison with similar requests not yet using the new path. Check whether demand or request complexity changed.

## Pair Speed With Guardrails

Fast provisioning is not successful when resources are insecure, incorrect, or abandoned. Track:

- readiness verification failure;
- policy exception rate;
- configuration drift;
- rollback or deletion soon after creation;
- resource incidents;
- unused-resource rate;
- cost per ready resource; and
- developer effort or satisfaction.

DORA's flexible-infrastructure guidance emphasizes on-demand self-service rather than merely hosting workloads with a cloud provider. Request-to-ready time makes that property observable. It should sit beside automation and control outcomes, not replace them.

## Use Stage Data to Choose Work

If provider provisioning occupies three minutes of a four-hour journey, optimizing Terraform is unlikely to matter. Rank stages by both volume and an estimate of developer waiting burden:

```text
estimated time-weighted burden =
  number of affected journeys * median added delay
```

Investigate p90 outliers and failure reasons. Common high-leverage changes include pre-authorized policy, clearer validation, capacity pools, parallel independent steps, automated access verification, and removal of redundant approvals.

The metric succeeds when it guides that decision. The goal is not a universally impressive number; it is a faithful measure of how long a developer waits for infrastructure they can actually use.

## Official Documentation

- [DORA: Flexible infrastructure](https://dora.dev/capabilities/flexible-infrastructure/)
- [Microsoft Learn: Design a developer self-service foundation](https://learn.microsoft.com/en-us/platform-engineering/developer-self-service)
- [Microsoft Learn: Self-service with guardrails](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
- [OpenTelemetry Specification: Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
