# Who Owns an SLO That Spans Multiple Teams? Designing Alerts and Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, On-Call, Alerting, Incident Response, Error Budget, Runbook

Description: Give a cross-team journey one accountable owner while routing diagnosis and remediation to component teams through evidence-based escalation.

---

An SLO that belongs to “everyone” usually belongs to no one. Give the end-to-end objective one accountable service or journey owner with authority to maintain its definition, convene incidents, and enforce the error-budget policy. Component teams still own their service SLIs and fixes.

Ownership follows the decision, not whichever system emits the metric.

## Split Accountability from Contribution

For a checkout journey spanning edge, identity, cart, payment, and orders:

| Responsibility | Accountable party |
|---|---|
| User promise, target, and eligibility | Checkout product/journey owner |
| SLI implementation and telemetry contract | Journey owner with observability reviewers |
| Error-budget policy and release decision | Journey owner plus product/SRE approvers |
| First response to journey-budget page | Checkout on-call |
| Component diagnosis and remediation | Relevant component owner |
| Shared monitoring platform | Observability platform team |
| Cross-team dispute or prolonged incident | Named incident commander/duty manager |

Record a primary team, backup team, escalation policy, and approvers in the SLO definition. A mailing list without decision authority is not an owner.

## Route by Signal Type

### Fast User-Impact Burn

Page the journey on-call. That responder confirms user impact, starts coordination, and uses component evidence to bring in the smallest relevant set of teams. Paging every dependency team simultaneously creates duplicated investigation and unclear command.

### Component Failure with Clear Attribution

If a component alert has high precision and an actionable runbook, route it directly to that component team and notify the journey incident. The journey owner remains accountable for the user outcome and communication.

### Slow Budget Burn

Create a ticket in the journey owner's backlog with an attributed breakdown. The owner assigns reliability work across teams and tracks it to the policy deadline.

### Missing SLI Telemetry

Route first to the telemetry producer or observability platform according to evidence. Keep this alert separate from a service-failure page; missing data must not silently resolve the journey alert.

## Build an Escalation Runbook

The page should include:

- SLO ID, target, rolling window, and current burn rates;
- affected regions, customer cohorts, and operations;
- numerator, denominator, and no-data state;
- top bounded failure reasons and dependency SLIs;
- recent deployments and configuration changes;
- links to rollback, failover, and degraded-mode procedures;
- each component's current owner and escalation target;
- authority for customer communication and change freeze.

Define time-based escalation: for example, page the journey primary immediately, the secondary after five minutes without acknowledgement, and the incident commander after 15 minutes or a severe impact threshold. Evidence can override the timer when a known dependency is clearly failing.

## Make the Budget Policy Cross-Team

Before launch, all participating teams and product stakeholders approve what happens when budget is nearly or fully exhausted. The policy should answer:

- Which repositories and releases are frozen?
- Can one component continue unrelated low-risk changes?
- Who decides an emergency exception?
- Who funds work when a dependency repeatedly spends the budget?
- How are external-provider causes handled?
- What evidence ends the restriction?

Google SRE recommends documenting authors, reviewers, approvers, actions, and a clear escalation path. Without pre-agreement, every breach becomes a political renegotiation during an incident.

## Handle Organizational Change

Validate team and on-call references in CI. Block an SLO deployment when the primary owner has no active escalation policy. When a service transfers teams, update the SLO, dashboards, alerts, runbooks, and service catalog in one reviewed change. Test notification routing with a non-paging exercise.

Run periodic cross-team game days. A redundant dependency is not an operational fallback if the journey responder cannot reach its owner or invoke it.

## Avoid Ownership Failure Modes

- The observability team owns the dashboard, so it is incorrectly made responsible for product reliability.
- Every component team receives the same page and assumes another will lead.
- The journey team counts dependency failures but has no escalation or architectural authority.
- Component teams optimize their own SLOs while the journey remains broken.
- A release freeze applies only to the front end even though a backend repeatedly burns the budget.
- The named owner is a person rather than a durable team and policy.

One accountable owner does not mean one team fixes everything. It means one team ensures the right work happens and the user promise remains coherent.

## References

- [Google SRE Workbook: Documenting the SLO and Error Budget Policy](https://sre.google/workbook/implementing-slos/#documenting-the-slo-and-error-budget-policy)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [OpenSLO specification: labels and alert policies](https://github.com/OpenSLO/OpenSLO)

## Conclusion

Assign the journey SLO to one durable, empowered owner. Page that owner on user impact, route component evidence to specialist teams, and predefine escalation and budget authority so cross-team reliability has a clear control loop.
