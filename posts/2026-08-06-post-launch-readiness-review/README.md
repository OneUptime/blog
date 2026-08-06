# Run a Post-Launch Readiness Review

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Post-Launch Review, SRE, Alerting, Capacity Planning, Runbook, Production Readiness

Description: Compare launch assumptions with production evidence, then fix alert noise, capacity errors, dependency surprises, and runbook gaps.

---

A production readiness review predicts how a service will behave. A post-launch readiness review compares those predictions with real traffic, operators, dependencies, and failure signals while the launch context is still fresh.

This is not automatically an incident postmortem. It is a planned verification step for every material launch, including launches that appeared successful. If a significant incident occurred, run the organization's postmortem process as well and link the two records rather than replacing one with the other.

## Schedule Reviews Around Evidence

One meeting immediately after reaching 100 percent exposure is often too early. Use evidence windows based on the workload:

- **immediate:** confirm rollout completion, health, active mitigations, and clean handoff;
- **early:** include peak traffic, autoscaling, on-call, and normal operational cycles;
- **representative:** include weekly, monthly, billing, batch, cache-expiry, or data-retention behavior relevant to risk.

For one service, that might mean reviews after 24 hours and after one weekly peak. For another, it may require a month-end close. These windows are team policy, not Google SRE requirements. Choose them from known failure latency and usage cycles, and set calendar owners before launch.

Keep rollback-compatible schema, artifacts, and configuration until the agreed observation window ends. Do not let a successful first hour trigger destructive cleanup that removes the safest recovery path.

## Reconstruct What Actually Launched

Start with an evidence-backed timeline:

```text
artifact and source revision
configuration and feature-flag versions
database migrations and backfills
traffic steps with timestamps
manual promotions, pauses, and exceptions
alarms and automated analysis results
rollbacks, forward fixes, or hot changes
start and end of active launch staffing
```

Compare this with the reviewed plan. A launch can be healthy while still revealing process drift, such as an undocumented configuration change or a stage promoted before its intended bake period.

Record exact versions, actors, and immutable change links. `Same as planned` should be supported by a diff or release record.

## Compare User Outcomes with Forecasts

Use the service's SLI definitions and split data by launch revision, region, journey, and other bounded risk dimensions.

| Outcome | Predicted | Observed | Follow-up question |
| --- | --- | --- | --- |
| success or correctness | objective and expected baseline | distribution over launch window | Were errors concentrated in one cohort? |
| latency | load-test range | percentile distribution | Did caches, dependencies, or payload mix differ? |
| traffic | launch forecast | rate and mix | Was demand or fanout underestimated? |
| freshness or queue delay | processing objective | oldest age and completion rate | Did asynchronous work accumulate? |
| support impact | expected contact volume | tickets and complaints | Did monitoring miss a visible problem? |

Do not reduce the review to whether the SLO was violated. A large regression can consume future error budget or remove capacity margin while remaining technically inside the objective.

Look for silent correctness failures. Successful HTTP status codes do not prove that prices, permissions, generated data, or business side effects were correct.

## Audit Alert Quality

List every page, ticket alert, suppressed alert, and manually discovered issue during the observation window. For each one, ask:

- Did it represent user impact or an imminent threat requiring action?
- Did it fire early enough to change the outcome?
- Did it identify the affected service, scope, and severity?
- Were duplicates grouped?
- Did the linked dashboard and runbook work?
- Was the threshold, window, and missing-data behavior correct?
- Did an expected alert fail to fire?
- Did a silence hide unrelated impact or remain active too long?

Track:

```text
pages per launch and per on-call shift
duplicate and false-positive pages
time to acknowledge
time from page to useful hypothesis
alerts without runbooks
issues discovered by users or support before monitoring
```

Google SRE advises that pages be actionable and that new alerts be tested before paging the rotation. A launch is a useful test, but it should not be the first time the query, notification route, and runbook are exercised.

Fix the signal or the service rather than merely relaxing thresholds to silence a noisy launch.

## Reconcile the Capacity Model

Compare every input to measured production behavior:

- demand peak, growth, and traffic mix;
- requests generated per user action;
- CPU, memory, storage, connection, and queue cost per unit of demand;
- cache hit ratio and warmup behavior;
- horizontal and vertical scaling trigger and delay;
- quota and provider limits;
- dependency fanout and retry amplification;
- redundancy margin after a zone, node pool, or dependency failure.

For a nonzero prediction, calculate signed relative forecast error:

```text
forecast error = (observed - predicted) / predicted
```

When the prediction is zero, report the absolute difference instead because relative error is undefined. Use the formula consistently, but do not hide important dimensional errors in one aggregate. Total traffic may match while one expensive endpoint is several times larger than expected.

Re-run the model with observed values and the required failure scenario. If current load needs six replicas but loss of one zone leaves only four ready, a green steady-state CPU graph does not prove readiness.

Review whether autoscaling arrived before the SLI degraded. A scaler that eventually reaches the right replica count can still be too slow for a launch spike.

## Review Dependency Surprises

For each critical dependency, compare:

- forecast request rate versus observed client calls;
- expected and observed error, latency, timeout, and throttle rates;
- quota and capacity approval versus real consumption;
- retry and fallback behavior;
- owner responsiveness and escalation accuracy;
- whether the dependency's maintenance or release changed your outcome.

Update the dependency map when production reveals an indirect or hidden dependency. If one page view produced five unexpected calls to a shared service, fix the architecture or capacity model rather than only raising quota.

## Replay Operator Experience

Interview the launch operator and on-call while details are fresh. Reconstruct each decision:

```text
signal observed
hypothesis formed
tool or runbook opened
action attempted
access or information missing
result verified
escalation made
```

A runbook gap is any step that depended on memory, private access, an undocumented command, an ambiguous dashboard, or a person who was not in the escalation directory.

Classify the fix:

- add missing decision context to the runbook;
- make a command safe and copyable;
- add read-only diagnosis before mutation;
- automate a deterministic sequence;
- pre-provision scoped access;
- surface feature-flag or degraded-mode state;
- correct the alert-to-dashboard-to-runbook link;
- train through a game day when judgment is required.

Do not write a longer runbook to compensate for an unnecessarily complex system when the safer fix is automation or simplification.

## Inspect Security and Data Operations

Verify that launch-time privileges, temporary roles, and vendor access were revoked. Review:

- production permission and secret changes;
- use of break-glass or emergency roles;
- sensitive-data and audit-log events;
- failed authentication or authorization patterns;
- secret rotation and configuration versions;
- backfill and migration invariants;
- retention or deletion tasks activated by the launch.

Close temporary access and alert silences even when the service remained healthy.

## Separate Product Defects from Readiness-System Defects

A bug in the launched code needs a product fix. Also ask why the readiness system did or did not contain it:

- Was the risk absent from the failure inventory?
- Did the canary sample exclude the affected traffic?
- Was the right SLI missing?
- Did the abort trigger tolerate too much impact?
- Did rollback fail because schema compatibility ended early?
- Was ownership or escalation stale?
- Did an exception remain after its expiry?

This second layer improves future launches rather than fixing only one symptom.

## Create Concrete Action Items

Every action should have:

- one accountable owner;
- priority based on user and operational risk;
- due date or release gate;
- measurable completion condition;
- evidence link when complete;
- classification such as prevent, detect, mitigate, or learn.

Bad:

```text
Improve dashboards.
```

Better:

```text
Owner: team-checkout
Due: before 2026-08-20 release
Action: add canary/stable success-ratio and p99 latency splits to the
        checkout incident landing dashboard
Done when: dashboard test fixture and game-day record are linked
```

Google SRE postmortem guidance similarly emphasizes owners, tracking, priority, and measurable end states. Use a blameless approach focused on the system conditions that made actions reasonable at the time.

## Define Launch Closure

Do not close the launch merely because the meeting ended. Example policy:

```yaml
post_launch_closure:
  representative_window_observed: true
  sli_comparison_attached: true
  alerts_reviewed: true
  capacity_model_updated: true
  dependencies_reconciled: true
  temporary_access_revoked: true
  alert_silences_expired: true
  rollback_window_decision_recorded: true
  high_risk_actions_closed_or_gated: true
  owner: release-commander
```

This schema is example team policy. A lower-risk action may remain open in normal backlog; a finding that invalidates rollback, SLO, or security assumptions should gate the next exposure or release.

## Official Documentation

- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/) covers capacity assumptions, dependency review, monitoring, rollout planning, and maintaining launch practices over time.
- [Google SRE Workbook: Monitoring](https://sre.google/workbook/monitoring/) discusses SLI-first dashboards, dependency and saturation metrics, testing alert logic, and adding metrics identified through postmortems.
- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/) covers actionable pages, playbooks, pager load, and testing alerts before they enter the rotation.
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/) documents blameless learning, quantifiable impact, and concrete action items with ownership, priority, and measurable completion.

## Conclusion

A post-launch readiness review closes the loop between launch assumptions and production evidence. Compare user outcomes, alerts, capacity, dependencies, and operator experience over a representative window. Preserve rollback until that evidence arrives, convert surprises into measurable owned work, and update the readiness controls that allowed each gap.
