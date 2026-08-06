# Which Changes Need a Full Production Readiness Review?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Production Readiness Review, Change Management, Risk Assessment, Site Reliability Engineering, Deployment Safety, Operational Readiness

Description: Route features, services, migrations, and routine changes through proportionate readiness reviews using explicit risk triggers and evidence.

---

Applying a full production readiness review to every change creates delay without equal risk reduction. Applying one only to brand-new services misses migrations, dependency swaps, and configuration changes that can be more dangerous than a new binary.

The answer is a risk-tiered intake process. Low-risk, well-understood changes follow a fast path backed by automation. Novel, irreversible, high-blast-radius changes receive deeper review. Google describes fast common launch paths and higher-touch treatment for complex launches. An AWS cloud-foundation whitepaper, now retained for historical reference, documents standard, normal, and emergency change categories. Neither prescribes the scoring model below; it is an organizational design you should calibrate with your own incidents.

## Classify the Change, Not the Ticket Label

Start with the production effect. A change can belong to several classes:

- new service or new externally visible user journey;
- feature behavior or feature-flag exposure;
- data schema, storage engine, or migration;
- infrastructure, network, identity, or policy change;
- dependency addition, replacement, or version change;
- region, tenant, or traffic expansion;
- capacity, scaling, timeout, retry, or queue configuration;
- operational ownership or on-call transfer;
- routine patch or repeatable standard change;
- emergency mitigation.

Names are poor risk signals. A "configuration-only" change can remove a route from every region. A large code diff behind a disabled flag may expose no production behavior. Review the reachable production effect and activation mechanism.

## Use Hard Triggers Before a Score

Some characteristics should force a full review because an average score can hide them. Recommended full-review triggers include:

- destructive or difficult-to-reverse data transformation;
- new authentication, authorization, public ingress, or trust boundary;
- new critical dependency or removal of a fallback;
- simultaneous exposure to a large customer or traffic population;
- change to recovery, backup, encryption, or key-management behavior;
- materially tighter RPO, RTO, SLO, or regulatory commitment;
- new single point of failure or changed failure-domain topology;
- first use of an unfamiliar platform, protocol, or deployment pattern;
- known inability to observe, contain, or reverse the change.

Keep this list short and evidence-based. If a trigger never changes review depth or catches meaningful risk, revise it.

## Score the Remaining Changes

For changes without a hard trigger, score a few independent dimensions from 0 to 3:

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| User impact | None | Internal or tiny cohort | Material journey | Safety, revenue, or broad critical journey |
| Blast radius | One disposable instance | One cell or tenant | Region or major cohort | Global or shared control plane |
| Reversibility | Automatic and proven | Simple rollback | Slow or state-aware | Destructive or no proven reverse path |
| Novelty | Repeated standard change | Familiar variant | New interaction | New architecture or platform |
| Dependency effect | None | Existing soft dependency | New or higher load | Critical or transitive shared dependency |
| Detection and containment | Automatic | Clear alert and mitigation | Manual or delayed | Unknown or unavailable |

Do not blindly add the numbers and call the result objective. The values structure a discussion; they do not measure probability with scientific precision. Preserve the individual dimensions so a 3 in reversibility stays visible.

A simple local routing policy might be:

| Route | Suggested criteria | Review depth |
| --- | --- | --- |
| Standard | Approved template, score 0 to 3, no hard trigger | Automated evidence and change record |
| Scoped | Score 4 to 7, bounded blast radius | Owner plus one qualified reviewer |
| Full PRR | Score 8 or more, any hard trigger, or unresolved uncertainty | Cross-functional evidence review and launch gate |
| Emergency | Active incident or urgent exposure reduction | Streamlined authority, audit, and retrospective review |

The thresholds are examples. Publish your actual policy and test it against historical launches before enforcing it.

## Define the Fast Path as a Product

A fast path is not "no controls." It is a pre-reviewed change pattern with bounded parameters and automated evidence. For example, a routine stateless service deployment might require:

- artifact provenance and test success;
- unchanged interfaces and schemas;
- canary exposure with automated health evaluation;
- verified rollback to a compatible artifact;
- SLO and error-budget status within policy;
- no dependency, region, quota, or permission expansion;
- deployment within an approved maximum blast radius.

If any assumption is false, route the change to a scoped or full review. This is similar to that AWS whitepaper's description of a standard change as low risk, well understood, and handled through a condensed procedure.

Promote a change pattern to the fast path only after repeated safe execution. Remove it when incidents, near misses, or platform changes invalidate its assumptions.

## Review Features, Services, and Migrations Differently

### Features

Focus on activation, cohort, user journey, dependencies, and kill-switch behavior. Code being deployed does not necessarily equal a feature being exposed. Record both events.

Use a full PRR when a feature creates a new critical journey, materially changes load, crosses a trust boundary, or cannot be disabled safely. A bounded presentation change can often use a scoped path.

### Services

New services normally need the broadest initial review because ownership, SLOs, on-call, dependency contracts, capacity, and recovery all need evidence. A service copied from a paved-road template may reuse control evidence, but its traffic, data, and dependencies still need service-specific validation.

### Migrations

Classify a migration by the point of no return, not by its first deployment. Review:

- dual-read or dual-write correctness;
- schema compatibility across old and new versions;
- reconciliation and data-integrity checks;
- catch-up time and backlog growth;
- rollback before and after cutover;
- source retirement and delayed consumers;
- capacity while both paths run.

A migration that begins safely but later deletes the source has at least two risk transitions. Gate each transition separately.

## Account for Combined and Transitive Risk

Several individually routine changes can form a high-risk event. Examples include an application rollout during a database failover test, many teams consuming a shared quota, or a regional launch that coincides with a dependency migration.

At intake, ask:

- What other changes share the window, dependency, failure domain, or rollback resource?
- Does this change increase traffic or retry load on another team's service?
- Does rollback depend on a control plane that the change itself affects?
- Are old and new versions compatible during a partial rollout?
- Does the proposed canary isolate the real failure mode?

Maintain a calendar or machine-readable change graph for critical shared systems. Per-ticket scoring alone cannot expose correlated risk.

## Treat Uncertainty as a Review Signal

Missing information should not score as zero. If the team cannot state the blast radius, safe capacity, dependency owner, or reverse path, route the change upward until it has evidence.

Use experiments to reduce uncertainty:

- dark launch or shadow traffic without user-visible responses;
- replay sanitized production-like workloads;
- canary a small, representative cohort;
- rehearse the migration and reversal;
- inject dependency latency or loss;
- restore data into an isolated environment.

Google's canary guidance describes partial, time-limited deployment and evaluation as a way to decide whether to continue a rollout. A canary lowers risk only when its population, metrics, duration, and abort rules can detect the relevant failure.

## Keep Emergency Changes Governed

An emergency route should reduce the approval latency needed to mitigate active harm. It should not erase accountability.

Require at least:

- incident or urgent-risk reference;
- commander or emergency approver;
- intended mitigation and affected scope;
- fastest safe verification and rollback;
- time-stamped actions and artifact identity;
- retrospective review and durable remediation.

Do not force responders to complete a full PRR while impact grows. Do review whether the emergency exposed a missing standard control afterward.

## Calibrate the Model with Outcomes

Review the routing policy at a regular cadence. Measure:

- incidents and near misses by review tier;
- full reviews with no material findings;
- fast-path changes that escaped their declared bounds;
- review lead time and blocked-launch time;
- emergency-change frequency and repeat causes;
- findings discovered after exposure;
- exception use and overdue closure.

For each incident, ask whether a reasonable control could have detected the risk and which change characteristic would have routed it correctly. Avoid simply raising every score after an incident. The goal is discrimination, not maximum friction.

## Intake Checklist

- [ ] Production effect and activation point are described.
- [ ] Hard triggers were evaluated.
- [ ] Each risk dimension has evidence, not a guess.
- [ ] Unknowns route upward instead of scoring zero.
- [ ] Combined changes and transitive dependencies were checked.
- [ ] Review depth matches the highest material risk.
- [ ] Fast-path assumptions are machine-checked where practical.
- [ ] Emergency changes remain audited and receive follow-up.

## Official Documentation

- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Google SRE: Creating a Production Launch Plan](https://sre.google/resources/practices-and-processes/production-launch-planning/)
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/)
- [AWS: Change Management Categories and Priorities (historical reference)](https://docs.aws.amazon.com/whitepapers/latest/establishing-your-cloud-foundation-on-aws/change-management-categories-priorities.html)
- [AWS Well-Architected: Make Frequent, Small, Reversible Changes](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_dev_integ_freq_sm_rev_chg.html)
- [AWS Well-Architected Tool: Identify and Understand Risks](https://docs.aws.amazon.com/wellarchitected/latest/userguide/identify-and-understand-risks.html)

## Conclusion

Review depth should follow production risk, not change size or ticket type. Use a few hard triggers, visible risk dimensions, a controlled standard path, and explicit handling for migrations and emergencies. Then calibrate the model against real outcomes so the review stays fast where risk is known and thorough where failure would be difficult to contain.
