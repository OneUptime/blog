# Validate On-Call Runbooks with a 3 A.M. Game Day

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Runbook, On-Call, Game Day, Incident Response, Site Reliability Engineering, Operational Readiness, Disaster Recovery

Description: Test whether an unfamiliar on-call responder can detect, diagnose, mitigate, verify, and escalate a production failure safely.

---

A runbook is usable at 3 a.m. when a tired responder who did not write it can take a safe first action without guessing which dashboard, account, region, or command the author meant.

Formatting alone cannot prove that. Validation needs a game day with realistic alert delivery, current access, production-like evidence, bounded failure injection, and an observer who records where the responder hesitates or deviates.

AWS describes game days as exercises that use the people, tools, procedures, and environments involved in real events. Google SRE emphasizes sustainable on-call, actionable alerts, and practiced incident response. The checklist and timing targets below are local recommendations, not platform guarantees.

## Define the Runbook's Contract

One runbook should address one alert or tightly related failure family. At the top, state:

- service, environment, regions, and owning team;
- alert or symptom that invokes the runbook;
- user consequence and urgency;
- safe actions the responder is authorized to take;
- dangerous actions that require a second person or incident commander;
- expected mitigation and verification signals;
- escalation conditions and contacts;
- last validated date, revision, and owner.

Do not title a document "Database Problems." Use a concrete contract such as "Checkout write latency fast burn caused by primary database saturation." If several causes share the first safe mitigation, document that decision point explicitly.

## Put Safety Before Diagnosis

The first screen should prevent the responder from making the incident worse. Include:

- a prominent production and region check;
- read-only commands before mutating commands;
- impact and stop conditions for every mitigation;
- required approvals or two-person steps;
- rollback for the mitigation itself;
- links that do not expose credentials in URLs;
- warnings about destructive, irreversible, or data-changing actions.

Use placeholders that force confirmation:

```bash
kubectl --context "${TARGET_CONTEXT}" --namespace "${TARGET_NAMESPACE}" get deployment
kubectl --context "${TARGET_CONTEXT}" --namespace "${TARGET_NAMESPACE}" get events \
  --sort-by=.metadata.creationTimestamp
```

The commands are illustrative. The runbook must define how `TARGET_CONTEXT` and `TARGET_NAMESPACE` are selected and verified in your environment. Never rely on a responder's current default context.

If a mitigation is safe and deterministic enough to perform without human judgment, automate it. Keep the runbook for verifying the automation, handling its failure, and making decisions outside its authority.

## Design a First-Five-Minutes Path

A useful opening sequence is:

1. **Acknowledge and orient**: confirm alert, time, service, region, and user journey.
2. **Verify impact**: inspect the SLI or direct user symptom, not only the triggering resource metric.
3. **Check recent changes**: deployments, configuration, schema, traffic, dependency, and infrastructure events.
4. **Bound the failure**: identify affected regions, cohorts, operations, and dependencies.
5. **Choose mitigation or escalate**: stop a rollout, isolate a cell, shed optional load, fail over, or declare an incident.

Do not make root cause a prerequisite for mitigation. The responder needs enough diagnosis to choose a safe action. Detailed cause analysis can continue after impact is contained.

Each decision should have a branch:

```text
If user impact began within the active rollout and canary health is worse than control:
  stop progression
  execute the tested rollback or disable the feature
  verify the user SLI recovers

If no change correlates and one region is isolated:
  evaluate fail-away criteria
  escalate to the regional dependency owner

If impact is broad or the safe branch is unclear:
  declare an incident and page the incident commander
```

This is a structure, not a universal mitigation. Use service-specific signals and tested procedures.

## Make Evidence Easy to Reach

Link directly to scoped views rather than a monitoring home page:

- user-journey SLI and error-budget view;
- traffic, errors, latency, and saturation dashboard;
- recent deployment and configuration timeline;
- dependency and regional breakdown;
- structured log query with service and environment filters;
- trace search for the affected operation;
- queue age, backlog, and consumer state;
- status of rollback, failover, and feature controls.

Include a short statement of what normal looks like and which comparison answers the decision. A chart named `p99` without unit, operation, population, or normal range slows response.

Avoid static screenshots as primary instructions. They become stale and cannot show current state. A screenshot can illustrate navigation, but pair it with a durable query and expected fields.

## Define Mitigation, Verification, and Exit

For every mutating step, specify:

- precondition;
- exact scope;
- command or approved automation;
- expected completion time;
- telemetry that proves it worked;
- adverse signal that triggers stop or rollback;
- how to undo the action;
- who must be informed.

Verification must return to the user outcome. A deployment rollback completing successfully does not prove checkout recovered. Confirm SLI recovery, error distribution, backlog behavior, and data consistency as applicable.

State when to leave the runbook and enter incident command. Useful triggers include multi-team impact, uncertain data integrity, security implications, failed mitigation, broad customer communication needs, or a severity threshold defined by policy.

## Prepare a Safe Game Day

Choose a failure mode the runbook claims to handle. Define:

- objective, such as "an unfamiliar primary responder safely stops a harmful canary";
- environment and blast-radius boundary;
- synthetic users or non-sensitive test data;
- facilitator, observer, responder, and safety owner;
- inject method and expected signals;
- abort conditions and restoration procedure;
- prohibited actions;
- stakeholder notification;
- evidence to capture.

Start in a non-production or production-equivalent environment. A later production exercise can expose real permission, routing, and observability gaps, but it needs formal change control, containment, and a tested abort. AWS warns that production game days should take precautions to avoid customer impact. Google Cloud recommends communicating scope, timing, and expected behavior and gradually escalating failure scenarios.

The facilitator should not coach the responder through missing instructions. If safety is at risk, stop the exercise. Otherwise, let the gap become evidence.

## Use a Cold Responder

The best validator is an on-call engineer qualified for the service but not involved in writing the runbook or scenario. Give them only what the real page provides.

Observe whether they can:

- receive and acknowledge the correct notification;
- identify service, environment, region, and user impact;
- authenticate without borrowing access;
- find the relevant dashboard and recent changes;
- select the correct branch;
- execute a safe mitigation;
- verify user recovery;
- escalate with useful context;
- record an incident timeline.

Do not measure typing speed. Measure decision latency, missing information, unsafe ambiguity, tool failure, and dependence on tribal knowledge.

## Capture a Validation Scorecard

Record timestamps and outcomes:

| Milestone | Evidence |
| --- | --- |
| Alert generated | Rule state and source event |
| Notification received | Paging delivery timestamp |
| Acknowledged | Responder acknowledgment |
| Impact verified | SLI or synthetic transaction |
| Correct branch selected | Observer record |
| Mitigation started | Audit event or command record |
| User outcome recovered | SLI and functional check |
| Escalation completed | Acknowledgment from target |

Suggested quality ratings are pass, pass with finding, and fail. Avoid one aggregate score that lets fast acknowledgment cancel an unsafe mitigation.

A runbook fails validation if the responder needs undocumented privileged access, copies a command into the wrong scope, cannot distinguish cause from impact, cannot verify recovery, or reaches an obsolete contact. Treat those as system findings, not responder mistakes.

## Turn Deviations into Improvements

After the exercise, compare expected and actual steps. For each deviation, decide whether to:

- fix the runbook;
- fix access or tooling;
- automate a safe action;
- change the alert payload or routing;
- add missing telemetry;
- simplify the service or mitigation;
- train responders;
- remove an invalid branch.

Assign an owner and due date. Re-run the affected path after material corrections. AWS guidance recommends feeding game-day lessons back into procedures, and Google Cloud recommends updating playbooks from test findings.

Expire validation when the service architecture, permissions, deployment system, dependency, alert, or mitigation changes materially. A date alone does not keep a runbook current.

## 3 A.M. Validation Checklist

- [ ] The page contains enough context to find the correct runbook.
- [ ] Scope and production identity are explicit before commands.
- [ ] Initial checks are read-only and user focused.
- [ ] Each branch names a safe action and decision evidence.
- [ ] Mutations have stop conditions, verification, and reversal.
- [ ] Access works for the actual on-call identity.
- [ ] Escalation reaches a staffed, informed owner.
- [ ] A cold responder completed the path without coaching.
- [ ] The exercise used realistic tools and signals.
- [ ] Deviations became owned findings and were retested.

## Official Documentation

- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/)
- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE Book: Testing for Reliability](https://sre.google/sre-book/testing-reliability/)
- [AWS Well-Architected: Conduct Game Days Regularly](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_game_days_resiliency.html)
- [AWS Well-Architected: Run Security Game Days](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_incident_response_run_game_days.html)
- [Google Cloud Well-Architected: Test Recovery from Failures](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-failures)

## Conclusion

A runbook becomes trustworthy through observed use, not publication. Give a cold responder a realistic page, current access, bounded failure, and no coaching. Measure whether they verify impact, choose a safe mitigation, confirm recovery, and escalate. Fix every point where the document, tooling, or service requires memory that the next 3 a.m. responder may not have.
