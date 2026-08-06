# Run a Launch-Day Go/No-Go Decision

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Production Readiness, Launch, SLO, Rollback, Incident Response

Description: Make launch decisions from predeclared health evidence, accountable roles, staged exposure, and unambiguous stop and rollback triggers.

---

A go/no-go meeting should decide whether current evidence supports the next bounded launch step. It should not reopen the entire production readiness review or rely on a room full of people saying that their area feels fine.

Define the required signals, decision roles, unknown-data behavior, and rollback triggers before launch day. Then use a short live record to show what was observed, who decided, and why.

## Separate Readiness from Immediate Launch Conditions

Long-lived readiness evidence belongs in the production readiness review:

- architecture and dependency ownership;
- SLO and alert design;
- load and failure testing;
- rollback and database compatibility;
- on-call coverage and access;
- security review and secret rotation;
- backup and restore evidence.

Launch-day evidence answers whether it is safe to proceed *now*:

- approved artifact and configuration are unchanged;
- no active incident or conflicting high-risk change affects the path;
- service and dependency health are within agreed bounds;
- capacity and quota are available;
- telemetry, paging, and rollout controls are working;
- required operators and approvers are reachable;
- rollback remains executable.

Do not accept a launch-day promise to finish a missing restore drill or implement an alert later. Either the prerequisite is met, an authorized time-bounded exception exists, or the decision is no-go.

## Assign Decision Roles

Name roles rather than inviting a large distribution list:

| Role | Responsibility during the window |
| --- | --- |
| Release commander | runs the plan, records state, and owns pause or abort execution |
| Decision authority | makes the go/no-go call for the current risk tier |
| Service on-call | watches user impact and leads operational response |
| Deployment operator | executes the reviewed rollout and rollback mechanism |
| Dependency representatives | confirm capacity and respond when a critical dependency is in scope |
| Security, data, or compliance owner | participates when the launch crosses that risk boundary |
| Communications owner | handles internal or external updates for high-impact launches |

One person may fill several compatible roles for a low-risk launch. The minimum attendance and separation of duties are organization policy. Define alternates and contact paths so one unavailable person does not force improvisation.

The decision authority must be allowed to say no without pressure from a public deadline. Google SRE launch guidance recommends contingency planning for external events rather than allowing the event to override reliability.

## Use Green, Yellow, Red, and Unknown

For each launch condition, define:

- **green:** evidence is within the predeclared safe range;
- **yellow:** an accepted deviation requires explicit risk ownership;
- **red:** a hard gate failed;
- **unknown:** evidence is absent, delayed, or untrustworthy.

Unknown is not green. Decide in advance whether a specific unknown blocks launch or allows a limited manual stage. User-facing SLI telemetry, rollback control, artifact identity, and critical dependency state should normally be hard gates for a high-risk launch.

## Build the Launch-Day Scorecard

### Artifact and change control

Verify:

- immutable artifact digest and source revision;
- reviewed runtime configuration and feature-flag versions;
- database migration revision and state;
- no unreviewed difference from the tested candidate;
- release record, approvals, and exception status.

### User and service health

Use the exact SLI definitions that drive the service objective:

- success and correctness;
- latency distribution;
- demand and traffic mix;
- error-budget burn;
- queue age and freshness for asynchronous journeys;
- active degraded modes or alert silences.

A healthy baseline must cover representative traffic. `Zero errors` during zero traffic is unknown, not evidence.

### Capacity and scaling

Check:

- current utilization and tested breaking point;
- expected launch peak and confidence range;
- failover or redundancy capacity;
- autoscaler maximum, scale-up latency, and quotas;
- storage, connection, queue, and downstream limits;
- capacity reservation or provider request status where applicable.

The required headroom is service policy based on failure model and demand uncertainty. Google SRE's historical launch checklist includes volume estimates, launch spikes, spare capacity, load testing, and redundancy, but it does not prescribe one percentage for every service.

### Dependencies

For each critical dependency, verify:

- client-observed health and latency;
- owner and escalation contact;
- launch capacity approval when needed;
- quota and rate-limit status;
- no conflicting maintenance or incident;
- tested degradation or abort behavior.

### Operational control plane

Test that:

- the release controller can pause and abort;
- stable capacity can receive returned traffic;
- rollback artifact and commands are available;
- alarms, dashboard data, and paging delivery are current;
- responders can access production with normal roles;
- incident channel, status process, and communications path are ready.

## Predeclare Rollback and Stop Triggers

Write machine-evaluable conditions where possible:

```yaml
abort_policy:
  - signal: checkout_success_ratio
    scope: canary
    condition: "below 99.5% for 5m"
    action: abort-and-route-stable
  - signal: checkout_latency_p99
    scope: canary-versus-stable
    condition: "canary exceeds stable by 25% for 10m"
    action: pause-then-abort-if-confirmed
  - signal: duplicate_charge_count
    scope: launch-revision
    condition: "greater than 0"
    action: abort-and-declare-incident
  - signal: analysis_data
    scope: canary
    condition: "missing for 3 evaluation intervals"
    action: pause
```

All figures and signal names above are illustrative team policy, not SRE or Kubernetes defaults. Choose conditions from SLOs, baseline variance, detection delay, correctness tolerance, and the maximum acceptable blast radius.

Also define non-metric triggers:

- unexpected schema or data state;
- loss of the primary or secondary operator;
- critical dependency incident;
- control-plane inability to pause or roll back;
- security or privacy concern;
- unplanned scope or artifact change.

Do not debate a clear hard trigger while impact grows. Abort first, then investigate, unless abort itself is known to create greater harm.

## Launch in Bounded Stages

A practical sequence is:

```text
verify baseline and controls
deploy dark or zero user traffic where supported
expose a small representative canary
observe for the defined sample and failure latency
make a go/no-go decision for the next stage
increase exposure in bounded steps
hold a final bake period at full exposure
transfer to normal on-call ownership
```

Google SRE describes gradual rollouts with verification between stages. Canary duration and size must be representative. A manual stage should have an owner and maximum pause so it cannot remain in an ambiguous mixed state indefinitely.

## Keep a Live Decision Record

Use a compact document:

```markdown
# Checkout launch 2026-08-06

- Artifact digest:
- Configuration and migration versions:
- Release commander / decision authority / on-call:
- Window and current rollout stage:
- Required dashboards and incident channel:

| Time | Gate | State | Evidence | Owner | Decision |
| --- | --- | --- | --- | --- | --- |

## Active exceptions

## Abort triggers and command

## Final handoff
```

Link evidence rather than pasting screenshots without query or time context. Record yellow-state acceptance, expiry, and decision authority. Timestamp each promotion and abort decision.

## Avoid Common Failure Patterns

- **Consensus ambiguity:** everyone assumes someone else made the decision.
- **Metric shopping:** thresholds are chosen after seeing an unfavorable graph.
- **Executive override without ownership:** a deadline silently replaces a hard gate.
- **Attendance theater:** many people join, but the operator or dependency owner is absent.
- **Rollback theater:** a command exists but has not been tested with the current schema and data.
- **Healthy aggregate masking:** global metrics hide canary or regional failure.
- **Unknown treated as zero:** missing telemetry looks like no errors.
- **Unbounded full launch:** the first production exposure reaches everyone.

## Launch Gate Example

```yaml
launch_day_gate:
  artifact_digest_matches_candidate: true
  configuration_version_verified: true
  active_hard_gate_exceptions: 0
  baseline_sli_state: green
  dependency_state: green
  capacity_state: green
  telemetry_fresh: true
  pause_and_abort_control_tested: true
  rollback_compatible: true
  required_roles_present: true
  decision_authority: vp-engineering-delegate
```

This schema and approver title are example organizational policy. The risk-tier policy should define who can decide, which gates are hard, and which exceptions are permitted.

## Official Documentation

- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/) covers launch checklists, capacity, dependencies, failure modes, rollout planning, owners, and contingency measures.
- [Google SRE Launch Coordination Checklist](https://sre.google/sre-book/launch-checklist/) includes volume estimates, load testing, redundancy, monitoring, canaries, staged rollouts, backup and restore, and external dependencies.
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) defines representative canary exposure and evidence-driven promotion.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) documents rollout status, revision history, pause, resume, and rollback behavior.
- [AWS Well-Architected: Plan for unsuccessful changes](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_mit_deploy_risks_plan_for_unsucessful_changes.html) recommends documented rollback criteria, known-good state, visible change data, and monitoring for rollback decisions.

## Conclusion

A launch-day go/no-go is a controlled decision over the next bounded exposure step. Predeclare hard gates and unknown behavior, name one decision authority, verify service, dependency, capacity, telemetry, staffing, and rollback state, and abort on agreed triggers. The live record should make every decision reproducible after the launch window closes.
