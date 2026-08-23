# Why MTTR Reports Need Median, p75, and p90

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Percentiles, Incident Analytics, SRE, Reliability Metrics

Description: Use median and tail percentiles alongside mean recovery time to distinguish typical incidents from the slow recoveries that averages conceal.

---

Mean time to recovery compresses a distribution into one number. Incident durations are usually right-skewed: many events recover quickly, while a few take hours. The mean is pulled toward those long cases, the median describes the middle incident, and upper percentiles reveal the recovery tail. A useful report shows all of them and states exactly how they were calculated.

## What Each Statistic Answers

For completed durations \(x_1,\ldots,x_n\), the arithmetic mean is:

\[
\bar{x}=\frac{1}{n}\sum_{i=1}^{n}x_i
\]

It answers how much recovery time incidents consumed on average. Because every minute contributes, one very long incident can move it substantially.

The median is the 50th percentile: half the observed incidents are at or below it and half are at or above it, subject to the chosen sample-quantile convention. It answers what a typical middle-ranked completed incident looked like.

The p75 and p90 describe increasingly slow portions of the cohort. A p90 of 80 minutes means the estimated 90th percentile is 80 minutes; it does not promise that every future incident will recover within 80 minutes.

## A Small Example

Consider eight completed recovery durations in minutes:

```text
4, 6, 7, 9, 12, 18, 55, 180
```

The mean is 36.4 minutes, while the median is 10.5 minutes. Under the nearest-rank convention, p75 is 18 minutes and p90 is 180 minutes. The mean alone makes the normal incident appear much slower than it is; the median alone almost erases a three-hour recovery. Together they show a fast center and a serious tail.

With only eight observations, p90 is effectively the maximum under nearest rank. That is useful as a warning and a reminder that the estimate is coarse. Always display sample size and, for a small cohort, show the raw points.

## Declare the Quantile Method

Sample percentiles have multiple valid conventions. Nearest rank selects an observed value at rank \(\lceil pn\rceil\). Many SQL and analytics tools use linear interpolation, which can return a value between observations. Prometheus histogram quantiles estimate from bucket counts. Those methods can disagree, especially for small samples or wide histogram buckets.

Choose one method for the report and record it in the measurement contract. Do not compare a warehouse's interpolated p90 to a dashboard's nearest-rank p90 without checking semantics.

In PostgreSQL, a continuous interpolated calculation can look like:

```sql
SELECT
  COUNT(*) AS n,
  AVG(recovery_seconds) AS mean_seconds,
  percentile_cont(0.50) WITHIN GROUP
    (ORDER BY recovery_seconds) AS median_seconds,
  percentile_cont(0.75) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p75_seconds,
  percentile_cont(0.90) WITHIN GROUP
    (ORDER BY recovery_seconds) AS p90_seconds,
  MAX(recovery_seconds) AS max_seconds
FROM completed_incidents
WHERE impact_started_at >= :start
  AND impact_started_at < :end
  AND metric_definition = 'impact_to_restoration_v2';
```

## Calculate from Incident Observations, Not Gauges

One completed incident should contribute one duration to a basic incident distribution. A live gauge such as current incident age contributes repeated samples while an incident remains open, overweights long events, and still lacks their final value.

Histograms are suitable when the application observes each completed duration exactly once. A classic Prometheus histogram exposes cumulative buckets, count, and sum; `histogram_quantile()` estimates quantiles from the buckets. Choose bucket boundaries with adequate resolution around meaningful recovery targets. Native histograms can offer flexible server-side aggregation when supported.

Do not average precomputed quantiles across services. Prometheus documentation explicitly warns that averaging summary quantiles is statistically invalid. Aggregate histogram observations before calculating a quantile, or calculate from the canonical raw incident rows.

## Keep Cohorts Comparable

Distribution statistics are only comparable when the underlying population and clock remain stable. Alongside every panel show:

- start and end event definitions;
- completed incident count;
- service, severity, and failure-mode filters;
- excluded and still-open incident counts;
- missing-duration count;
- quantile convention and unit;
- measurement-policy version.

If high-severity incidents become more common, p90 can rise even when each failure mode improves. Add segmented views and a composition table, but retain the pooled distribution so rare large incidents remain visible.

## Choose Visuals That Show Shape

A compact dashboard can use:

1. Stat panels for count, median, p75, p90, mean, and maximum.
2. A histogram for the duration distribution over the selected period.
3. A time series of weekly or monthly statistics with counts.
4. A table of the slowest incidents linked to postmortems.
5. Raw dots or an empirical cumulative distribution for small cohorts.

Grafana's histogram panel accepts numerical table fields and displays how frequently values fall into buckets. Ensure the input is one completed duration per incident. Bucketing already averaged weekly values creates a distribution of averages, not a distribution of incident recovery times.

Log scales can make a heavy tail readable, but label them clearly. Do not cap the axis without exposing points beyond the cap.

## Interpret Changes Carefully

A lower median with an unchanged p90 can mean routine response improved while complex incidents did not. A stable median and lower p90 can indicate better escalation, rollback, or dependency handling. A lower mean caused by removing one old outlier from a rolling window is not necessarily a process change.

Use confidence intervals or bootstrap intervals when quantifying trend uncertainty. Do not draw a target line from an industry benchmark: your architecture, incident policy, and service expectations define a different population. Derive targets from service risk and review the incidents beyond them.

The statistics are diagnostic, not a responder ranking. Google SRE's blameless postmortem guidance emphasizes systems, contributing causes, and learning. Tail incidents should lead to questions about observability, safe rollback, dependencies, capacity, and runbooks.

## Official Documentation

- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus histogram and quantile functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Grafana histogram visualization](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/histogram/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE incident metrics resource](https://sre.google/static/pdf/IncidentMeticsInSre.pdf)

## Conclusion

Mean, median, p75, and p90 are complementary views of completed recovery times. Publish them with count, maximum, raw outliers, cohort rules, and the quantile method. The center tells you about routine response; the tail tells you where resilience work is still needed.
