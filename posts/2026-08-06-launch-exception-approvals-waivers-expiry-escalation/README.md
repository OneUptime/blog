# Govern Launch Exceptions with Owners, Expiry Dates, and Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Production Readiness Review, Risk Acceptance, Launch Management, Governance, Operational Readiness, Change Management

Description: Define who can accept launch risk, what a waiver must contain, when it expires, and how unresolved production-readiness gaps escalate.

---

A launch exception is not permission to ignore a production-readiness control. It is a documented decision to accept a specific residual risk for a limited scope under stated conditions.

Without clear authority and expiry, exceptions become permanent architecture by accident. Without compensating controls and evidence, an approver cannot know what risk is being accepted. The solution is to separate roles, define approval by consequence, and make every exception expire automatically.

CISA guidance for industrial control environments distinguishes variances, waivers, and exceptions, recommends a risk assessment and appropriate acceptance authority, and says exceptions should be temporary and periodically reviewed. AWS risk guidance asks who owns the risk and who owns the mitigation. The exact workflow, approval levels, and time limits below are organizational recommendations, not vendor-mandated rules.

## Distinguish Three Different Decisions

Use precise terms in local policy:

| Decision | Meaning | Example |
| --- | --- | --- |
| Not applicable | The control does not apply to this scope | A stateless proxy has no application data to restore |
| Compensating control | The requirement is met through a different control | Manual two-person rollout replaces unavailable automation for one launch |
| Risk exception | The control applies but remains unsatisfied, and residual risk is accepted temporarily | Restore duration exceeds the target during a bounded beta |

Do not call a failed control "not applicable" because remediation is inconvenient. The control owner or qualified reviewer should validate applicability, while a risk owner accepts residual risk.

## Separate the Roles

At minimum, define these roles:

- **Requester**: explains the need, scope, duration, evidence, and alternatives.
- **Remediation owner**: is accountable for closing the underlying gap.
- **Control owner or subject-matter reviewer**: evaluates whether the control applies and whether compensating controls are credible.
- **Risk owner**: owns the affected business or service outcome and can accept its consequence.
- **Approver**: has delegated authority for the risk level and verifies the record is complete.
- **Launch decision owner**: confirms all exceptions are valid for the exact launch.

One person may hold multiple roles in a small organization, but the requester should not silently self-approve material risk. For high-consequence exceptions, require independent technical review and business risk acceptance.

The remediation owner and risk owner are not interchangeable. The engineer who can fix a missing regional failover may not have authority to accept a region-wide outage. The executive who can accept the business risk may not be qualified to judge whether the proposed circuit breaker works.

## Match Approval Authority to Consequence

Define an approval matrix before a launch is under deadline pressure. For example:

| Residual consequence | Minimum acceptance authority | Additional review |
| --- | --- | --- |
| Limited internal inconvenience | Service owner | Control owner |
| Material SLO or customer impact | Product or business owner | Reliability reviewer |
| Broad data, security, regulatory, or financial impact | Designated executive risk owner | Security, legal, compliance, or data owner as applicable |
| Outside stated organizational appetite | No normal approver | Executive escalation or no launch |

Titles and thresholds are local policy. Base them on the plausible consequence, not the cost of fixing the issue or the seniority of the requester.

Security, privacy, legal, contractual, financial, and safety risks may have separate mandatory authorities. A general launch approver should not override those domains unless policy explicitly delegates that authority.

## Require a Complete Exception Record

An exception should be machine-readable enough to validate at launch time:

```yaml
id: PRR-EX-2026-0142
control: recovery.rto_proven
service: checkout
environment: production-eu
artifact_revision: 4f9c2ab
requested_by: checkout-platform
risk_owner: vp-commerce
remediation_owner: checkout-platform
reason: >-
  Restore rehearsal completed in 68 minutes against a 45 minute objective.
  Beta exposure is limited to five percent of EU tenants.
residual_consequence: >-
  A regional data-loss event may keep checkout unavailable for up to 23 minutes
  beyond the objective.
compensating_controls:
  - keep previous region warm for the beta
  - staff database and service responders during exposure
  - stop expansion if recovery validation fails
scope_constraints:
  max_traffic_percent: 5
  regions: [eu-west]
approved_by: commerce-risk-council
approved_at: 2026-08-02T14:00:00Z
expires_at: 2026-08-16T14:00:00Z
remediation_due_at: 2026-08-12T17:00:00Z
evidence_url: https://evidence.example.net/prr/PRR-EX-2026-0142
```

The reason should state why the launch must proceed now and which alternatives were considered. "Business priority" alone conveys no usable risk information.

Record the worst credible outcome in plain language. If the approver cannot understand the affected users, data, duration, and containment, the record is not ready for approval.

## Make Scope Narrow and Verifiable

Bind an exception to concrete dimensions:

- service and environment;
- artifact, schema, or configuration revision;
- feature cohort or tenant population;
- region and traffic percentage;
- launch window;
- specific unmet control;
- maximum duration.

An exception for a five-percent beta must not authorize a global rollout. The deployment gate should compare current rollout parameters with the exception and reject expansion beyond its bounds.

A major code, architecture, dependency, or risk change should invalidate the exception. State those invalidation conditions in policy rather than negotiating them after a change.

## Use Expiry, Not a Review Reminder

Every risk exception should have an `expires_at` value. At expiry, the default state becomes blocked unless the control is satisfied or a new exception is explicitly approved.

A reminder to review an exception is weaker than expiry because a missed calendar event leaves the risk active. Build automation that:

- notifies the remediation owner before the due date;
- notifies the risk owner before expiry;
- exposes exception age and renewal count;
- prevents new deployments after expiry;
- opens escalation when remediation is overdue;
- preserves the immutable approval history.

Do not silently extend an exception. A renewal is a new risk decision with current evidence, incident history, changed scope, and a new expiry. Repeated renewal should trigger a higher approval level or an explicit decision to change the underlying standard.

## Evaluate Compensating Controls as Controls

A compensating control needs an owner, activation condition, evidence, and failure mode. "Watch the dashboard" is not a control unless someone is assigned, the relevant signal exists, and a tested action follows.

Ask:

- Does it reduce likelihood, impact, exposure time, or all three?
- Is it active for the entire exception window?
- Can responders observe when it fails?
- Does it introduce another dependency or permission requirement?
- Was it tested under representative conditions?
- Can the deployment gate verify it where practical?

Examples include reducing the cohort, maintaining extra capacity, requiring staffed rollout coverage, shortening stages, enabling a kill switch, and preserving an old read path. None automatically makes the residual risk acceptable.

## Design an Escalation Ladder

Escalate conditions, not personalities. A recommended ladder is:

1. Remediation owner and service owner receive the finding.
2. Risk owner reviews if it will miss the launch gate or due date.
3. Higher authority reviews broad impact, repeated renewal, or risk outside the owner's delegated limit.
4. The launch decision owner blocks exposure when no authorized acceptance exists.

Escalate immediately when the exception affects protected data, contractual commitments, a critical shared service, safety, or a risk category reserved by policy.

Create a separate path for active incidents. An incident commander may need emergency authority to reduce current harm. Log the decision and require retrospective review, but do not force the normal launch-exception workflow into the critical mitigation path.

## Review the Portfolio, Not Only Individual Requests

Individually reasonable exceptions can combine into systemic risk. Review the portfolio for:

- multiple exceptions depending on the same fallback or responder;
- repeated exceptions against one control;
- concentrated expiry near a major event;
- services operating under several simultaneous degradations;
- remediation owned by teams without available capacity;
- accepted risks that invalidate another team's assumptions.

Publish aggregate metrics without encouraging gaming. Useful measures include active exceptions, age, renewals, overdue remediation, incidents involving excepted controls, and scope expanded after approval.

## Approval Checklist

- [ ] The control applies and the current evidence shows a gap.
- [ ] Scope, artifact, cohort, region, and duration are explicit.
- [ ] The residual consequence is understandable and plausible.
- [ ] Alternatives and compensating controls were evaluated.
- [ ] Risk and remediation have separate named owners.
- [ ] The approver has authority for the consequence.
- [ ] Domain-specific approvals are present where required.
- [ ] Expiry and invalidation are automatically enforced.
- [ ] Renewal cannot occur silently.
- [ ] The exception is visible in the final launch decision.

## Official Documentation

- [AWS Well-Architected Tool: Identify and Understand Risks](https://docs.aws.amazon.com/wellarchitected/latest/userguide/identify-and-understand-risks.html)
- [AWS Well-Architected: Operational Readiness Reviews](https://docs.aws.amazon.com/wellarchitected/latest/operational-readiness-reviews/wa-operational-readiness-reviews.html)
- [Google SRE Book: The Evolving SRE Engagement Model](https://sre.google/sre-book/evolving-sre-engagement-model/)
- [CISA: Recommended Practice for Improving Industrial Control System Cybersecurity](https://www.cisa.gov/sites/default/files/recommended_practices/NCCIC_ICS-CERT_Defense_in_Depth_2016_S508C.pdf)
- [NIST SP 800-39: Managing Information Security Risk](https://csrc.nist.gov/pubs/sp/800/39/final)

## Conclusion

An exception is a controlled, temporary risk decision, not a softer checkbox. Separate applicability, technical review, remediation, and risk acceptance. Bind approval to narrow scope, require evidence and compensating controls, enforce expiry automatically, and escalate by consequence. The launch can then proceed only when the right person has accepted the exact risk being taken.
