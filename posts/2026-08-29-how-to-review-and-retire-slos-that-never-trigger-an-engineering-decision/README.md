# How to Review and Retire SLOs That Never Trigger an Engineering Decision

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Service Level Objectives, Reliability Reviews, Error Budget, SRE, Monitoring

Description: Test whether an SLO changes a real decision, repair weak indicators, and retire objectives without erasing history or dependencies.

---

An SLO is a control signal, not a collectible metric. If nobody can name a decision that changes when its budget burns, the objective may be too loose, measuring the wrong outcome, duplicating another SLO, or simply unnecessary.

Review the whole control loop before deleting it: user need, SLI, target, alert, owner, error-budget policy, and recorded actions.

## Run a Decision Audit

For the review period, collect:

- budget status and major spend events;
- pages, tickets, and release restrictions caused by the SLO;
- known incidents, support cases, and customer harm it captured or missed;
- false positives and telemetry gaps;
- reliability work prioritized because of it;
- teams and reports consuming the result;
- current owner, approvers, and next review date.

Ask stakeholders one concrete question:

> What would we do differently at 50%, 10%, and 0% remaining budget?

“Look at the dashboard” is not an engineering decision. Examples of decisions are paging, starting an incident, freezing risky releases, assigning a reliability project, changing a supplier, or relaxing controls because reliability has sufficient margin.

## Diagnose Why It Has No Effect

### The SLO Is Always Green

It may be intentionally conservative, but often the target is too loose, the denominator excludes important failures, or measurement is too far from users. Compare known incidents and support spikes with budget loss. If users suffered while the SLO stayed flat, improve the SLI or tighten the target.

### The SLO Is Always Red

An impossible objective can become background noise. Decide whether users truly require it. If yes, track it as a clearly labeled aspirational SLO while an achievable operational objective controls policy. If no, renegotiate the target rather than granting permanent exceptions.

### The Signal Moves but No One Acts

The policy may lack an owner, authority, or funded response. Repair governance before changing math. An accurate SLO without an adopted error-budget policy is an unused report.

### Another SLO Already Drives the Same Decision

Two objectives may measure the same event through different proxies. Keep the more user-representative, better-instrumented signal, or give them distinct decisions. Duplicate pages and conflicting compliance scores erode trust.

### It Is a Useful Diagnostic, Not an SLO

Queue depth, CPU saturation, or an internal percentile may be valuable for dashboards and troubleshooting but have no user-facing target or error-budget action. Reclassify it as an operational metric instead of forcing it into SLO governance.

## Choose Keep, Repair, Merge, or Retire

Use a written review outcome:

- **Keep:** user correlation and decision remain valid.
- **Repair SLI:** move measurement closer to users, improve coverage, or fix eligibility.
- **Change target/window:** version the objective and replay historical behavior.
- **Merge:** one successor SLO covers the same promise and policy.
- **Convert:** retain as a KPI, diagnostic, or aspirational objective without budget enforcement.
- **Retire:** no unique user promise, contractual need, or decision remains.

Google SRE recommends checking that known incidents and support tickets correlate with budget loss, refining SLIs that miss user impact, and reviewing new SLOs frequently-often monthly-before reducing the cadence as they mature.

## Retire Safely

1. Confirm the SLO is not required by an SLA, regulator, security control, capacity plan, or downstream team.
2. Search dashboards, alerts, reports, service catalogs, release gates, runbooks, and APIs for its ID and recording-rule names.
3. Name a successor or explicitly state that none is required.
4. Save the final definition, historical score, incidents, and retirement rationale.
5. Announce a deprecation period to consumers.
6. Disable paging first and observe for a defined interval.
7. Remove generated rules and dashboards through the source-of-truth change; retain underlying telemetry if other uses remain.
8. Mark the objective retired with date and approvers rather than silently deleting its history.

Do not recalculate old reports under the successor definition. A new numerator or denominator versions the SLI; a new target or window versions the SLO. Preserve the corresponding historical series and reports under their original definitions.

## Make Reviews Measurable

Add a small decision log to every SLO:

```text
date | budget state | triggering evidence | decision | owner | outcome
```

An empty log is a review input, not automatic proof of uselessness: a stable service may simply have had no significant failures. Use game days or historical replay to verify that the SLO would still trigger the agreed decision under realistic faults.

## References

- [Google SRE Book: Choosing Targets and Control Measures](https://sre.google/sre-book/service-level-objectives/#objectives-in-practice-o8squl)
- [Google SRE Workbook: Continuous Improvement of SLO Targets](https://sre.google/workbook/implementing-slos/#continuous-improvement-of-slo-targets)
- [Google SRE Workbook: Documenting the SLO and Error Budget Policy](https://sre.google/workbook/implementing-slos/#documenting-the-slo-and-error-budget-policy)

## Conclusion

Judge an SLO by the quality of the decision loop it enables. Repair objectives that miss user harm, reclassify diagnostics, and retire truly redundant signals through a versioned, auditable process that preserves history and protects downstream consumers.
