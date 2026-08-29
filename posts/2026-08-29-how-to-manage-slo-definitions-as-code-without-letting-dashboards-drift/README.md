# How to Manage SLO Definitions as Code Without Letting Dashboards Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, GitOps, Observability-as-Code, Prometheus, PromQL, Monitoring

Description: Make one reviewed SLO manifest generate recording rules, alerts, dashboards, and documentation so every surface uses the same definition.

---

Putting an SLO query in Git is not enough. Drift begins when an engineer copies it into a recording rule, a dashboard, an alert, and a quarterly report, then edits only one copy.

Use one canonical manifest as the source of truth and generate or reference every operational surface from it. Treat manual dashboard edits as reconciliation failures.

## Store the Entire Decision Contract

A useful manifest contains more than a target:

```yaml
schema: reliability.example.com/slo/v1
id: checkout-availability
service: checkout
owner: team-checkout
description: Eligible checkout submissions produce a durable order
sli:
  source: prometheus-primary
  goodPromQL: >-
    sum(rate(checkout_outcomes_total{eligible="true",result="good"}[5m]))
    or
    0 * sum(rate(checkout_outcomes_total{eligible="true"}[5m]))
  totalPromQL: >-
    sum(rate(checkout_outcomes_total{eligible="true"}[5m]))
objective:
  target: 0.999
  window: 28d
  type: rolling
  budgetingMethod: occurrences
eligibilityPolicy: docs/checkout-eligibility.md
noDataPolicy: alert
zeroTrafficPolicy: exclude
alertPolicy: multiwindow-v1
approvers:
  - product-checkout
  - sre
reviewAfter: 2026-11-29
```

The fallback in `goodPromQL` supplies zero only when the total query produces a series, so an uninitialized `result="good"` label cannot turn an all-bad interval into missing data. Initialize bounded label values in the instrumented service when possible. The separate zero-traffic policy leaves a zero denominator out of the calculation instead of treating it as success or missing telemetry.

This example is an internal schema, not an OpenSLO document. If portability matters, map the supported concepts to OpenSLO, whose v1 specification represents SLOs, ratio SLIs, rolling or calendar-aligned windows, `Occurrences`, `Timeslices`, and `RatioTimeslices` budgeting methods, and alert policies. Put platform-specific query fields in the SLI's `metricSource.spec`, validate them separately, and use `indicatorRef` to reference a standalone SLI. OpenSLO v1 allows at most one condition in an `AlertPolicy`, so the sample's multi-window alert composition remains implementation-specific.

## Generate, Do Not Copy

Compile the manifest into:

```text
slo manifest
  -> Prometheus recording rules
  -> burn-rate alert rules
  -> dashboard panels and links
  -> service-catalog metadata
  -> human-readable SLO and error-budget policy
```

Dashboards should query generated recording-rule names, not paste the raw good/total PromQL again. Alerts should use the same generated bad-event ratio and target. Include immutable labels such as `slo_id`, `slo_version`, and a `definition_hash` computed from the canonical semantic fields so a panel can show exactly which definition produced a value. Because changing a label value creates a new Prometheus time series, generated consumers must select one definition and never aggregate old and new definitions together.

The compiler must preserve numerator and denominator separately across the compliance window. It may sum or integrate the generated good and total rates and divide once; it must not average a series of five-minute success ratios and call that the 28-day request SLO.

If a tool cannot be generated, have it reference the canonical rule or export its configuration back into CI for comparison.

## Validate in Layers

### Schema and Referential Checks

Require an owner, target, window, budgeting method, measurement source, eligibility, no-data, and zero-traffic policies, alert policy, approvers, and review date. Verify referenced services, teams, measurement sources, runbooks, and notification routes exist.

### PromQL and Rule Checks

Generate a real Prometheus rule file and run:

```bash
promtool check rules generated/checkout.rules.yml
promtool test rules tests/checkout.test.yml
```

Unit fixtures should cover good traffic, a counter reset, missing series, zero traffic, a partial label set, and burn thresholds. Prometheus documents both syntax checking and rule testing; use the same Prometheus version as production.

### Semantic Checks

Query a staging or read-only production endpoint and assert:

- numerator and denominator have compatible labels;
- good count never exceeds total count;
- values remain between zero and one when defined;
- all expected regions or cohorts appear before any intentional global aggregation;
- the denominator is large enough for the target;
- missing telemetry and recording-rule gaps remain distinguishable from zero traffic, and each follows its declared policy.

Syntax-valid PromQL can still measure the wrong population.

### Historical Diff

Replay the proposed and current definitions over known incidents. Show changes in compliance, budget spend, alert firing, and affected cohorts in the pull request. Require explicit approval for any budgeting method, denominator, threshold, window, or exclusion change.

## Reconcile Runtime State

Deploy generated artifacts together or in a defined order. After deployment, continuously compare runtime rule, dashboard, and alert hashes with the repository version. Page only when drift threatens monitoring; otherwise open a ticket with the owning team.

Protect generated dashboards from direct edits, or make the next reconciliation overwrite them visibly. Keep emergency changes time-limited and require a follow-up commit.

Recording rules do not automatically contain history before creation. Plan a warm-up period or an explicitly reviewed backfill; do not call a partial 28-day series a full SLO. Prometheus documents an experimental recording-rule backfill mechanism, but it has operational limitations and should be tested away from the production TSDB.

## Version Meaning, Not Just Files

Changing a title or runbook link may be a metadata revision. Changing the event population, good criteria, budgeting method, target, or window creates a new semantic version. Preserve the old series and reports long enough to explain trends. Never silently recalculate last quarter under today's definition.

## References

- [OpenSLO specification](https://github.com/OpenSLO/OpenSLO)
- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Unit testing rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: Backfilling recording rules](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-for-recording-rules)
- [Google SRE Workbook: Documenting the SLO and Error Budget Policy](https://sre.google/workbook/implementing-slos/#documenting-the-slo-and-error-budget-policy)

## Conclusion

Make one manifest own the SLI, target, window, policy, and metadata. Generate every executable and visual artifact, validate both syntax and meaning, and reconcile hashes so a dashboard cannot quietly become a different SLO.
