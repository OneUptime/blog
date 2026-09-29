# How to Convert a Customer-Reported Outage into an SLI and Alert That Detects the Next One First

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Monitoring, Prometheus, SLI, SLO

Description: Convert a customer-reported failure into a measurable user-outcome SLI, a scoped alert, and a replay test that demonstrates the new detection path reaches responders.

A customer says their export never arrived. The API returns HTTP 202, the workers are running, and infrastructure dashboards are green. Adding another CPU alert will not address the gap: the monitored success condition is different from the user's success condition.

Start with the reported journey and define an observable outcome. Google's SLO guidance distinguishes an SLI specification from its implementation and recommends measures that reflect user experience. The example below uses that distinction to turn an export failure into a concrete detection contract. [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)

## Reconstruct the Missing Observation

Record the first failed customer action, earliest supporting evidence, first report, first internal acknowledgment, and mitigation time. Keep uncertain timestamps marked as estimates.

Then identify where detection failed:

| Gap | Example |
| --- | --- |
| Instrumentation | Only request acceptance was measured |
| Population | A global aggregate hid one affected region |
| Rule | Threshold required more traffic than the cohort produced |
| Pipeline | Metric was emitted but never reached the evaluator |
| Routing | Rule fired but notification went to an obsolete destination |
| Interpretation | Page arrived without an actionable description |

Use the customer's report as evidence of a gap, not as a complete diagnosis. Preserve the exact workflow and relevant cohort without placing customer names or identifiers in metric labels.

## Define the User Outcome Before Choosing a Metric

For this illustrative export service:

```text
Eligible event: an accepted, authorized export request within supported limits.
Good event: the correct export becomes downloadable within 60 seconds.
Bad event: the export fails, is incorrect, or misses that deadline.
Population: production exports, segmented by region.
Exclusions: explicit test traffic and invalid requests rejected before acceptance.
SLI: good eligible events / all eligible events.
```

The deadline and exclusions are local product decisions. Confirm them with service owners and support. Do not exclude provider failures merely because another organization caused them when customers still experienced a failed export.

Record each eligible export exactly once as good or bad when its outcome is known or its deadline expires. A late success does not erase the original deadline miss. A separate reconciliation process must classify stuck work; counters emitted only by successful workers would recreate the original blind spot.

## Implement an Unsampled Outcome Counter

Assume the application provides this custom metric:

```text
export_outcomes_total{service="reports",environment="production",region="eu",outcome="good"} 48120
export_outcomes_total{service="reports",environment="production",region="eu",outcome="bad"} 173
```

Initialize both outcomes for each expected active region. Account for worker restarts and duplicate delivery in the event-classification system, and monitor reconciliation freshness separately. Prometheus can handle counter resets in `rate`; it cannot repair missing classifications or double-counted events.

The metric must count outcomes independently of trace sampling. Keep request IDs, customer IDs, and detailed failure evidence in appropriately protected logs or records, linked from the incident when needed.

## Add a Scoped Alert

This example pages for more than 5% bad outcomes over five minutes, with at least 100 classified outcomes in that region during the same window:

```yaml
groups:
  - name: export-outcomes
    rules:
      - alert: ExportOutcomeFailure
        expr: |
          (
            sum by (region) (
              rate(export_outcomes_total{service="reports",environment="production",outcome="bad"}[5m])
            )
            /
            sum by (region) (
              rate(export_outcomes_total{service="reports",environment="production"}[5m])
            )
          ) > 0.05
          and on (region)
          sum by (region) (
            increase(export_outcomes_total{service="reports",environment="production"}[5m])
          ) >= 100
        for: 2m
        labels:
          severity: page
          service: reports
          environment: production
        annotations:
          summary: "Export outcomes degraded in {{ $labels.region }}"
          description: "More than 5% of exports failed their outcome contract; check completion, deadline misses, and reconciliation freshness."
```

Apply `rate` before aggregation so resets are evaluated per series. The `for` duration requires the expression to remain active before firing; it adds detection delay. Both behaviors are documented by Prometheus. [Prometheus Query Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/), [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

These thresholds illustrate an acute-impact rule; they are not universal SLO settings. Choose paging thresholds from customer impact and response urgency. For a defined SLO, consider multiwindow burn-rate alerts and evaluate their behavior with your traffic. [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)

## Cover the Conditions the Ratio Cannot See

The volume guard deliberately suppresses this page for low-volume regions. A synthetic export can exercise the same authenticated journey there, using safe test data and cleanup. Verify both file availability and content correctness, not merely the initial HTTP response.

No observations is not a successful outcome. Add independent checks for classifier freshness, missing expected metric series, and synthetic-runner health. If acceptance itself fails, the accepted-export denominator will not see those attempts; retain an admission or end-to-end journey signal for that boundary.

## Replay and Exercise the Entire Detection Path

Create rule tests covering a sustained regional failure, healthy traffic, a brief spike, low volume, counter resets, and missing series. Prometheus provides `promtool test rules` for synthetic time-series fixtures. A passing rule test validates evaluation behavior, not notification delivery. [Prometheus: Unit Testing Rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)

Replay the incident's observed sequence or a faithful fixture and record the first alert firing time. Include classification delay, scraping, evaluation, `for`, grouping, and notification delivery when comparing it with the historical customer report.

Then run a bounded exercise that creates a failed export and verifies the actual page reaches the intended responder with a region, impact description, dashboard, and runbook. Confirm resolution behavior after recovery as well.

## Conclusion

The gap is closed when a failed customer outcome produces a trustworthy signal and an actionable notification within the chosen detection target. Preserve the original report as a regression case, measure the entire path, and document remaining blind spots. That demonstrates improved detection without promising that every future customer report will always arrive second.
