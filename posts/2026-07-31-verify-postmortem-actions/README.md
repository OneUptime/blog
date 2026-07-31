# How to Verify That Postmortem Actions Actually Prevented a Repeat Incident

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Postmortem Actions, Reliability Testing, Chaos Engineering, SRE

Description: Verify both implementation and effectiveness by replaying the failure mechanism, observing the new control, and retaining evidence for future incidents.

---

A merged pull request proves that code changed. It does not prove that the postmortem action controls the failure that caused customer impact.

Verification needs two separate answers:

1. **Implementation:** Was the specified change deployed everywhere it was required?
2. **Effectiveness:** When the relevant failure condition occurs, does the change prevent, detect, contain, or shorten it as intended?

Google’s SRE Workbook treats a verifiable end state as a core characteristic of an action item. Microsoft’s incident-management guidance recommends drills, chaos engineering, and fault injection to validate failure and mitigation procedures.

## Preserve the Original Failure Contract

Before implementing the action, capture:

- triggering event;
- necessary preconditions;
- amplifiers;
- failed barrier;
- measured customer impact;
- detection and mitigation times;
- proposed control;
- expected observable result.

Example:

```text
Original path:
An empty host filter was interpreted as "all hosts."

Impact:
The maintenance workflow drained three regions.

Action:
Reject empty filters and routine scopes larger than one region.

Expected result:
The workflow makes no state change, returns a typed validation error,
emits an audit event, and directs authorized emergency work to a
separate workflow.
```

Without this contract, a team may implement “input validation” that checks syntax but leaves the dangerous empty-list meaning unchanged.

## Write the Verification Plan with the Action

Define:

- test environment and safety boundary;
- exact inputs or fault to introduce;
- preconditions;
- expected system behavior;
- expected telemetry and alert behavior;
- rollback or stop condition;
- evidence to retain;
- accepting reviewer;
- production follow-up, if any.

Do not wait until delivery to decide whether the action is testable. If no safe verification is possible, define the strongest available evidence and record the residual uncertainty.

## Use Layers of Evidence

### Static and configuration checks

Verify:

- the new control is enabled;
- policy applies to every intended account, region, or cluster;
- permissions do not retain an unguarded path;
- defaults are safe;
- monitoring and audit events are configured.

This catches incomplete rollout but does not exercise behavior.

### Unit and property tests

Test input boundaries and invariants:

```text
empty target -> reject
one approved region -> allow
two regions -> reject routine path
emergency authorization + two regions -> allow audited path
malformed inventory response -> fail closed
```

For a retry budget, generate different timeout and concurrency combinations and assert the maximum amplification.

### Integration tests

Exercise the real components around the control:

- deployment service and inventory;
- application and dependency;
- alert rule and representative time series;
- backup and restore;
- router and failover target.

Mocks may prove logic while missing permission, serialization, routing, or rollout defects.

### Staging or isolated failure injection

Reproduce the incident mechanism in a safe environment with representative scale and configuration. Observe both the primary control and telemetry.

### Game day or production-safe exercise

Some properties require the real routing, authorization, or operational environment. Use a bounded canary, synthetic request, shadow workload, or scheduled game day with stop conditions and incident authority.

Do not recreate customer harm merely to close a ticket. Increase realism only when the expected learning justifies the risk.

## Verify the Whole Control Path

For a new alert, check:

1. instrumentation emits the intended metric;
2. the rule expression aggregates at the correct service and region boundary and preserves the labels needed for routing;
3. if the rule has a `for` clause, it enters the pending state at the expected time;
4. it fires within the detection target;
5. Alertmanager routes to the current on-call destination;
6. the notification contains impact, scope, dashboard, and runbook;
7. the responder can take a safe first action;
8. the alert becomes inactive after recovery and any configured `keep_firing_for` duration.

For a rollback action, verify:

1. a known-bad canary is detected;
2. the rollback target is compatible;
3. rollback stops further rollout;
4. service health returns;
5. data state remains valid;
6. automation reports success or a clear failure;
7. responders can identify the final state.

Testing one function is not enough when the action promises an operational outcome.

## Compare Against a Baseline

Use incident measurements as the baseline:

| Measure | Incident | Verification target |
| --- | ---: | ---: |
| Affected regions | 3 | 0 for rejected routine input |
| Time to detection | 14 min | Under approved alert target |
| Retry amplification | 6.2× | At or below configured budget |
| Manual recovery steps | 11 | Tested runbook target |

Targets must be chosen from service risk and design, not copied from this example.

For performance or capacity actions, test at representative load and include enough headroom for expected growth. A fix that works on an idle staging service may not control the production failure mode.

## Retain an Evidence Packet

Attach to the tracked action:

- test case or experiment plan;
- versions and configuration tested;
- timestamps and environment;
- query and dashboard links;
- logs or audit event;
- observed result versus expected result;
- anomalies and follow-up work;
- reviewer acceptance;
- residual risk.

Keep evidence durable. A dashboard link that opens a moving time window does not preserve the incident view for a repeat investigation six months later.

## Do Not Use “No Repeat” as the Only Proof

Absence of another incident is weak evidence when:

- the trigger is rare;
- traffic or architecture changed;
- the observation period is short;
- the control has not been exercised;
- a different barrier happened to hold.

Use positive evidence from tests and drills. Production history can supplement it:

- how often the new guard rejected unsafe input;
- whether the new page preceded legacy alerts;
- whether blast radius stayed within the intended boundary;
- whether mitigation duration improved;
- whether operators successfully followed the updated runbook.

These leading observations show the control engaging.

## Test for Bypass and Regression

Ask:

- Is there another API, credential, region, or legacy workflow that bypasses the guard?
- Can a default or empty value still mean broad scope elsewhere?
- Does the control fail open when a dependency is unavailable?
- Can configuration drift disable it?
- Does a future deployment replace the protected path?
- Is there monitoring for the control itself?

Add regression tests to the normal delivery path. A one-time game day cannot protect a control that later disappears.

## Classify the Verification Outcome Honestly

Use:

- **verified:** expected behavior observed in representative conditions;
- **partially verified:** implementation is present, but scale or one dependency was not exercised;
- **failed:** observed behavior did not meet acceptance;
- **inconclusive:** evidence or environment was insufficient;
- **superseded:** another control now addresses the factor.

Do not close partial or inconclusive work as “done” without a residual-risk decision and follow-up.

## Reopen When Evidence Changes

Reopen or replace an action when:

- a matching incident recurs;
- a test finds a bypass;
- production scale invalidates the assumption;
- the control increases a different risk;
- ownership or architecture moves;
- telemetry shows the control never engages;
- the action addressed the trigger but not an amplifier or recovery gap.

Closing an action is not declaring the analysis permanently correct. It records the evidence available at that point.

## A Verification Checklist

```text
[ ] Failure mechanism and intended control are explicit.
[ ] Acceptance criteria were written before implementation.
[ ] Deployment scope and configuration were checked.
[ ] Automated tests exercise boundaries and failure behavior.
[ ] Integration test uses the real dependent components where feasible.
[ ] Representative fault was introduced inside a safe boundary.
[ ] Customer, system, telemetry, and routing outcomes were observed.
[ ] Bypass, fail-open, and regression paths were assessed.
[ ] Evidence is durable and linked from the action.
[ ] Reviewer recorded verified, partially verified, failed, inconclusive, or superseded.
[ ] Residual risk and next review date are recorded.
```

An action prevents repeats only when a relevant failure meets a control that demonstrably changes the outcome. Make that observation part of “done.”

## Official Documentation

- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Microsoft Azure Well-Architected Framework: Incident Management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
- [Microsoft Power Platform Well-Architected: Emergency Response](https://learn.microsoft.com/en-us/power-platform/well-architected/operational-excellence/emergency-response)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Prometheus: Unit Testing Rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
