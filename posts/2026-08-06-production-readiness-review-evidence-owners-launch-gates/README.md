# Run a Production Readiness Review with Evidence and Real Gates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Production Readiness Review, Site Reliability Engineering, Operational Readiness, Launch Management, Risk Management, Reliability

Description: Turn a production readiness review into an evidence-backed launch decision with explicit owners, blocking findings, and enforceable gates.

---

A production readiness review should answer one operational question: can this team launch and operate this change within the risk the organization has agreed to accept? A completed checklist is not evidence that the answer is yes.

Google describes a Production Readiness Review as a way to identify a service's reliability needs and verify accepted production standards. AWS describes an Operational Readiness Review as a repeatable, data-driven mechanism informed by incident lessons. Neither source requires a particular ticket system, score, or approval workflow. Those are organizational choices.

The practical design is therefore simple: define the launch decision, require observable evidence for every material claim, assign every gap to a named owner, and make the result enforceable at the deployment boundary.

## Define the Decision Before the Meeting

Record the review scope before collecting answers:

- the service, feature, migration, or infrastructure change being launched;
- production environments, regions, tenants, and user journeys in scope;
- expected traffic, data volume, and launch ramp;
- the release artifact or configuration revision being reviewed;
- the proposed launch window and rollback window;
- the accountable service owner and launch decision owner.

A PRR for commit `abc123` does not automatically cover a later database migration, a new region, or a tenfold traffic event. Write down the assumptions that bound the decision.

The decision should have one of four states:

| State | Meaning |
| --- | --- |
| Ready | All blocking controls have acceptable evidence |
| Ready with conditions | Approved, time-bounded exceptions cover every open blocker |
| Not ready | One or more blocking findings remain unresolved |
| Withdrawn | The launch scope or date changed enough to require reassessment |

These states are a recommended governance model, not a Google, AWS, or Kubernetes platform behavior.

## Make Every Answer an Evidence Claim

Questions such as "Do you have monitoring?" invite a yes. Ask for an artifact and a demonstrated behavior instead.

| Readiness claim | Useful evidence | Weak substitute |
| --- | --- | --- |
| Users can be measured | SLI query, dashboard, sample events, and ownership | Screenshot of CPU usage |
| Paging works | Test notification, route, escalation, and responder acknowledgment | Alert rule exists |
| Rollback is safe | Rehearsal record against a compatible schema and artifact | "We can redeploy" |
| Capacity is sufficient | Load-test report, bottleneck, demand model, and headroom | Instance count |
| Data is recoverable | Timed restore drill with integrity checks | Backup job is green |
| Dependency failure is contained | Failure injection result and observed degraded behavior | Architecture diagram |

Good evidence is attributable, reproducible, scoped, and fresh enough for the launch. A dashboard URL is not sufficient if nobody can explain its query or if it shows a test environment with different limits. A runbook is not sufficient if the on-call engineer lacks permission to execute it.

Store an evidence record in a durable system:

```yaml
control: recovery.restore_proven
status: pass
scope: orders-api production
evidence:
  - url: https://evidence.example.net/drills/orders-2026-07-18
    observed_at: 2026-07-18T10:32:00Z
    environment: isolated-recovery
result:
  measured_rpo_minutes: 4
  measured_rto_minutes: 37
owner: orders-platform
reviewer: reliability-reviewers
artifact_revision: abc123
```

Do not place credentials, customer data, or sensitive log extracts in the review record. Link to access-controlled evidence and retain enough metadata to audit what was reviewed.

## Separate Controls from Findings

A control is a stable expectation, such as "critical user journeys have defined SLIs." A finding is the result for this launch, such as "checkout success excludes gateway timeouts."

For each finding, capture:

- severity and customer or business consequence;
- exact affected scope;
- evidence that produced the finding;
- remediation and named owner;
- due date and verification method;
- whether it blocks launch;
- exception record, if the risk is accepted temporarily.

Avoid a single percentage score. Ninety-nine minor controls cannot cancel one untested destructive migration. Gate on specific critical controls and unresolved risk, not an average.

## Use Gates That Can Actually Stop a Launch

A gate is real only if the release path checks it. A document labeled "blocked" while any engineer can deploy unchanged is advice, not a gate.

A practical gate model has three levels:

1. **Blocking**: required before exposure, unless an authorized exception exists. Examples include missing rollback or forward-recovery paths for a destructive change, no way to detect critical user impact, and an unproven recovery objective.
2. **Conditional**: allowed only under explicit constraints. Examples include a smaller canary, staffed launch window, reduced tenant scope, or temporary capacity reservation.
3. **Advisory**: tracked improvement that does not materially change the current launch risk.

Connect the approved review record to deployment policy using immutable identifiers. The gate should verify the service, environment, artifact revision, decision state, expiry, and any rollout constraints. A new artifact or expanded scope should invalidate or re-open the decision according to local policy.

Keep a controlled emergency path. Emergency access should be audited and should create a follow-up review, but a readiness process must not prevent urgent mitigation during an incident.

## Run the Review as a Verification Session

Distribute the scope, architecture, evidence, and known gaps before the meeting. Use synchronous time for uncertainty and decisions, not for reading every checklist item aloud.

A useful session follows this order:

1. Restate user impact, scope, and assumptions.
2. Walk the critical user journeys and data flows.
3. Examine the highest-consequence failure modes and dependencies.
4. Verify monitoring, paging, mitigation, rollback, and recovery evidence.
5. Review capacity limits and launch ramp.
6. Resolve finding severity, ownership, and gate status.
7. Record the decision and its validity conditions.

The service owner owns readiness. Reviewers challenge evidence and apply policy; they should not become the default owners of every remediation item. An approval meeting with no accountable service owner is itself a readiness gap.

## Build a Minimum Evidence Pack

For a material production launch, require an evidence pack that covers:

- architecture and runtime dependency map;
- top user journeys, SLIs, SLOs, and current measurements;
- dashboards, paging alerts, notification routes, and tested runbooks;
- demand forecast, load-test result, bottleneck, and scaling limits;
- failure-mode inventory and failure-test results;
- deployment stages, abort criteria, rollback or forward-recovery procedure;
- backup, restore, RPO, and RTO evidence where state is persistent;
- access, secrets, audit, and break-glass controls;
- on-call ownership, escalation, and launch-day staffing;
- open findings and approved exceptions.

Tailor this list to the change. Google explicitly describes launch processes that are lightweight for common cases and higher touch for complex launches. Requiring the same evidence from a text-only user-interface change and a cross-region data migration makes teams route around the process.

## Keep the Checklist Alive

AWS recommends deriving ORR questions from incident learning, and Google's launch guidance emphasizes continuously curating questions. Establish a feedback loop:

- add or revise a control when a post-incident action reveals a reusable prevention;
- remove questions that no longer detect meaningful risk;
- automate evidence collection for common controls;
- measure findings that escaped reviews;
- measure exception age and overdue remediation;
- sample approved reviews for evidence quality;
- review false blocks and unnecessary review burden.

Do not add a question merely because something once went wrong. State the failure it prevents, the evidence that answers it, and the launch types for which it applies.

## A Final Decision Checklist

Before recording "Ready," verify:

- [ ] Scope and artifact revision are explicit.
- [ ] Critical claims have reproducible evidence.
- [ ] Blocking controls are satisfied or covered by valid exceptions.
- [ ] Every open action has one accountable owner and due date.
- [ ] Rollout constraints and abort criteria are machine-checkable where practical.
- [ ] On-call responders have tested access and usable procedures.
- [ ] The decision has a reviewer, timestamp, and validity boundary.
- [ ] The deployment system will enforce the decision.

## Official Documentation

- [Google SRE Book: The Evolving SRE Engagement Model](https://sre.google/sre-book/evolving-sre-engagement-model/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Google SRE Book: Launch Coordination Checklist](https://sre.google/sre-book/launch-checklist/)
- [AWS Well-Architected: Operational Readiness Reviews](https://docs.aws.amazon.com/wellarchitected/latest/operational-readiness-reviews/wa-operational-readiness-reviews.html)
- [AWS Well-Architected: The ORR Tool](https://docs.aws.amazon.com/wellarchitected/latest/operational-readiness-reviews/the-orr-tool.html)
- [AWS Well-Architected: Ensure a Consistent Review of Operational Readiness](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_const_orr.html)

## Conclusion

A useful PRR does not certify that a system is failure-proof. It makes the launch risk visible and actionable. Scope the decision, demand evidence, distinguish blockers from improvements, assign owners, constrain exceptions, and enforce the result in the release path. That turns readiness from a meeting into an operational control.
