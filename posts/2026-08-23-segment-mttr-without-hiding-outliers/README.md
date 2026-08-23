# Segmenting MTTR Without Hiding Outliers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Incident Analytics, Percentiles, SRE, Observability

Description: Segment recovery time by service, severity, and failure mode while retaining pooled trends, sample sizes, and visible outliers.

---

An organization-wide MTTR can combine fundamentally different work: a cache restart, a regional database failover, and a third-party payment outage. Segmentation makes the metric actionable, but excessive slicing can make every cell look good, conceal systemic incidents, and leave samples too small to interpret.

## Keep One Canonical Incident Fact Table

Compute a validated recovery duration once, then attach dimensions:

```text
incident_id
impact_started_at
restored_at
recovery_seconds
primary_service_id
affected_service_ids
severity_at_peak
primary_failure_mode
contributing_failure_modes
customer_impact
measurement_policy_version
```

Do not independently recompute the clock inside each dashboard panel. A canonical fact ensures that a service view and an organization view disagree only because of grouping, not because they chose different timestamps.

Use stable identifiers rather than display names. Teams and services are renamed; historical rows should either retain the as-of-incident ownership or join through a versioned ownership table.

## Define Dimensions Deliberately

### Service

Choose whether the primary service means the customer-facing service whose SLI failed, the component that initiated the failure, or the team that coordinated response. Those are different fields. Keep all affected services in a bridge table, but select one declared primary attribution for mutually exclusive organization totals.

### Severity

Use peak severity or initial severity consistently. Peak severity is often better for impact analysis because it captures escalation, while initial-to-peak changes are useful for studying triage. Severity labels are locally defined; do not compare them across organizations without mapping their criteria.

### Failure mode

Create a small controlled taxonomy such as deployment, capacity, dependency, configuration, data, network, security, and unknown. Allow contributing tags, but require one primary mode for exclusive grouping. Keep unknown visible; forcing uncertain incidents into a convenient class introduces false precision.

## Publish a Pooled View and a Segmented View

Every report should begin with the complete eligible cohort and then drill down. For each group show:

- completed incident count;
- median, p75, p90, and mean;
- maximum or a labeled list of the slowest incidents;
- total customer-impact measure;
- missing-duration count;
- period-over-period cohort composition.

A segment with two incidents should not present a smooth trend line as though it were stable evidence. Display the points and count. Set a minimum sample rule for percentile publication, but never make the incidents disappear: roll them into an `insufficient sample` table or show raw durations.

## Guard Against Simpson's Paradox

Suppose Service A improves from 60 to 40 minutes and Service B improves from 15 to 10 minutes. If the later period contains far more Service A incidents, the pooled average can still rise. Conversely, a pooled improvement may come from a shift toward easy incidents even when every service gets slower.

Publish a composition table beside the trend:

| Period | Service A count | Service B count | All incidents |
| --- | ---: | ---: | ---: |
| Previous | 5 | 40 | 45 |
| Current | 30 | 5 | 35 |

Compare like-for-like segments, then explain the pooled result as both within-segment performance and mix. A fixed-weight standardized metric can help, but label the reference weights and keep actual incident outcomes visible.

## Do Not Average Away Outliers

The mean is sensitive to long incidents; that is a feature when those incidents consume substantial operational time, but it does not show typical experience. The median can remain low while one catastrophic recovery dominates customer harm. Show both, plus tail percentiles and the actual slowest incidents.

Avoid trimming or winsorizing outliers in the primary reliability report. If a statistical model needs robust values, publish the transformed analysis separately and document the rule. An incident is not bad data merely because it was severe.

Annotate known data-quality errors rather than silently dropping them. A negative duration should fail validation; a 40-day duration may be legitimate, a ticket-closure artifact, or a missing restore event. Investigate it.

## Query with Counts and Overall Rows

PostgreSQL can calculate segment summaries while retaining an overall row:

```sql
SELECT
  primary_service_id AS service_id,
  severity_at_peak AS severity,
  COUNT(*) AS n,
  AVG(recovery_seconds) AS mean_seconds,
  percentile_cont(0.5) WITHIN GROUP
    (ORDER BY recovery_seconds) AS median_seconds,
  percentile_cont(0.9) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p90_seconds,
  MAX(recovery_seconds) AS max_seconds
FROM completed_incidents
WHERE impact_started_at >= :period_start
  AND impact_started_at < :period_end
  AND measurement_policy_version = :policy_version
GROUP BY GROUPING SETS (
  (primary_service_id, severity_at_peak),
  (primary_service_id),
  ()
);
```

The final empty grouping produces the pooled cohort. Use the same filters for every grouping. Percentiles from small samples are order statistics or interpolations with high uncertainty, so accompany them with `n` and raw points.

## Treat Multi-Service Incidents Explicitly

If the same incident is copied into every affected service segment, segment counts will exceed the organization total. That may be appropriate for a service-exposure view, but it is not additive. Mark such panels as non-exclusive.

For additive reporting, attribute the incident once to a primary service and provide an affected-services drill-down. For customer-impact allocation, split user-minutes using non-overlapping product populations rather than dividing duration equally. Never sum per-service MTTR values; means are not totals.

## Make the Dashboard Hard to Game

Lock taxonomy changes behind review, retain historical classifications, and show an audit log. Do not rank individuals or teams on raw MTTR: architecture, traffic, incident mix, escalation obligations, and reporting quality differ. Use segmentation to find investments, such as slow database diagnosis across several services, not to create a league table.

Google SRE's blameless postmortem guidance focuses on systemic contributing causes and learning. A segmented MTTR report should follow the same intent. Link the slowest cohorts to runbooks, telemetry gaps, capacity controls, and remediation work.

## Official Documentation

- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Grafana histogram visualization](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/histogram/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Segment MTTR from one canonical incident fact, define each dimension, and preserve both pooled and drill-down views. Counts, composition, tails, missing data, and named outliers keep segmentation honest. The goal is to expose recurring recovery constraints, not to manufacture small green cells.
