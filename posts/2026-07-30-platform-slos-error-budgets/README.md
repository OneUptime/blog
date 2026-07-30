# Platform SLOs and Error Budgets for Shared Developer Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, SLO, Error Budget, SLI, Reliability, Developer Experience

Description: Define platform SLOs around successful developer journeys, then use error budgets to make explicit reliability and change decisions.

---

An internal developer platform is a dependency even when no customer calls it directly. If developers cannot deploy, provision an environment, retrieve credentials, or diagnose a failed workflow, product delivery stops.

CPU, pod health, and API uptime help diagnose a platform, but they do not define whether it worked for a developer. Platform reliability should be measured at the boundary where a developer attempts a meaningful task.

## Start with Consumers and Journeys

List the platform’s consumers:

- application developers;
- CI/CD automation;
- service owners;
- security and compliance workflows;
- other platform services.

Then list critical journeys:

- create and register a service;
- provision an environment;
- deploy or roll back a change;
- request or rotate access;
- fetch configuration or secrets;
- view logs and traces;
- evaluate a policy;
- recover from a failed operation.

Choose a few journeys that would materially block delivery. An SLO catalog containing every endpoint is not more user-centered than no catalog.

## Define SLIs at the User Boundary

Google SRE defines an SLI as a carefully defined quantitative measure of a service level, and an SLO as the target for that SLI. For request-style workflows, a ratio is usually easiest to reason about:

```text
availability SLI =
  good eligible events / valid eligible events
```

Every word needs a definition.

Example:

```text
Journey: production deployment submission
Valid event:
  an authenticated request with a valid service and target environment
Good event:
  request accepted, policy evaluated, and execution scheduled within 30 seconds
Exclusions:
  client cancellation before submission and documented load tests
Measurement:
  platform edge event, reconciled with workflow state
Window:
  rolling 28 days
```

Do not exclude platform-caused malformed responses, dependency failures, or maintenance simply because they make the number worse. Exclusions should describe traffic outside the service promise, not inconvenient failure modes.

## Use the Right SLI Type

### Availability

Did a valid request produce a usable result?

```text
good provisioning operations / valid provisioning operations
```

“HTTP 200” is not good if the environment is unusable.

### Latency

Did the workflow finish within the promised time?

```text
operations completed successfully within 10 minutes
/
valid operations
```

Latency SLOs expressed as threshold ratios fit error-budget reasoning better than a monthly average. Keep p50 and tail distributions for diagnosis.

### Freshness

Is catalog, policy, deployment, or ownership data no older than the tolerated age?

```text
minutes in which catalog lag <= 5 minutes / valid minutes
```

### Correctness

Did the platform produce the intended state? Examples include correct policy results, correct environment configuration, and successful post-provision verification.

### Durability

Were workflow state, audit evidence, generated configuration, and recoverable metadata retained as promised?

Correctness and durability are harder to measure but should not be replaced by availability when they are what users actually need.

## Measure End to End and by Component

Maintain two layers:

1. **Journey SLI:** what the developer or automation experienced.
2. **Diagnostic metrics:** API, queue, database, runner, policy engine, identity provider, and cloud-provider behavior.

If a cloud API causes provisioning to fail, the developer journey still failed. Attribution can assign the error-budget consumption to a dependency for prioritization, but should not rewrite user experience as success.

Synthetic probes are useful for low-volume workflows and complete-path coverage. Real event telemetry captures production diversity. Reconcile both; synthetic success alone can miss permission, workload, or tenant-specific failures.

## Choose a Target from User Need

An SLO should reflect the reliability needed by consumers, not the best number the current system happens to achieve.

Example:

> Over a rolling 28-day window, 99.5% of valid standard production-deployment submissions will be accepted, policy-evaluated, and scheduled within 30 seconds.

The error budget is:

```text
1 - 0.995 = 0.005 = 0.5%
```

With 40,000 valid submissions:

```text
40,000 * 0.005 = 200 bad submissions
```

For a time-based 99.9% objective over 28 days:

```text
28 days * 24 hours * 60 minutes * 0.001
= 40.32 minutes
```

Use event-based budgets when events represent user experience accurately. Time-based availability can overstate impact during quiet periods or understate it during peak use.

## Separate Service Classes

One target rarely fits every workload:

| Class | Example expectation |
| --- | --- |
| Interactive | Portal and CLI feedback within seconds |
| Asynchronous standard | Environment ready within a defined number of minutes |
| Bulk | Throughput and completion by a deadline |
| Emergency | Rollback or access path with stricter availability |
| Preview | Explicitly lower or nonproduction objective |

Publish which class each workflow belongs to. Do not mix a two-hour bulk job with an interactive API in one latency SLI.

## Write an Error-Budget Policy

An error budget matters only if it changes a decision. Define:

- who owns each SLO;
- review cadence;
- who validates budget calculations;
- action at healthy, at-risk, and exhausted states;
- allowed emergency and security work;
- dependency attribution rules;
- exceptions and approval authority;
- recovery criteria;
- postmortem triggers.

An example policy:

```text
Healthy: continue planned releases and reliability work.

At risk: review top consuming failure classes, reduce risky change,
and assign owners to immediate reliability actions.

Exhausted: pause nonessential platform changes affecting the journey;
allow security fixes, incident remediation, and approved low-risk work;
resume after agreed recovery criteria are met.
```

Google’s example error-budget policy stresses that stopping change is not punishment. It is permission to focus on reliability when evidence says reliability is the priority.

## Track Budget Consumption, Not Just Remaining Budget

Useful views include:

- budget consumed and remaining;
- burn rate over short and long windows;
- consumption by journey, failure class, platform version, and dependency;
- largest incidents;
- slow chronic failure versus sharp outage;
- percentage of bad events with unknown cause;
- budget impact of planned changes.

A service can have 80% of its budget remaining and still be in immediate danger if the current burn rate would exhaust it tomorrow.

Alert on material threat to the SLO, then use component metrics to diagnose. Paging on every internal error creates noise that is disconnected from the user promise.

## Handle Low-Volume and No-Traffic Periods

For rare workflows:

- run representative synthetic checks;
- use a longer decision window where appropriate;
- supplement the ratio with a maximum bad-event count;
- review every failure;
- avoid treating “no events” as 100% success.

If no eligible events occur, the event-based SLI is undefined for that interval. Display no data, not perfect reliability.

## Avoid Platform SLO Anti-Patterns

- **Kubernetes uptime as the platform SLO:** components can be healthy while workflows fail.
- **Every endpoint gets an SLO:** priorities become unreadable.
- **Averages for latency:** slow tails disappear.
- **100% targets:** teams become unable to take rational change risk.
- **Excluding dependency failures:** user-visible failure is edited out.
- **No error-budget policy:** the SLO becomes decorative reporting.
- **Treating SLOs as team performance scores:** reporting becomes defensive and failures get reclassified.
- **Silent definition changes:** reliability appears to improve without the service changing.

## A Practical First SLO

Begin with one critical, well-instrumented journey:

1. Interview its consumers.
2. Define valid and good events.
3. Reconcile event data with real workflow state.
4. Measure current performance without adopting it blindly as the target.
5. Agree on a target and window.
6. Write a simple budget policy.
7. Add budget and burn views.
8. Review incidents and chronic consumers.
9. Refine the definition as a versioned change.

Platform SLOs turn “the portal seems flaky” into a shared reliability promise. When the SLI measures a real developer journey and the error budget controls decisions, reliability becomes part of platform product management rather than a collection of infrastructure dashboards.

## Official Documentation

- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
