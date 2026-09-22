# How to Query Counter Deltas in Legacy New Relic OpenMetrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: New Relic, Prometheus, Monitoring

Description: Query counters collected by legacy nri-prometheus using sums of delta counts and normalized rates, without differentiating the data twice.

---

A Prometheus counter is cumulative at the exporter, but the legacy New Relic OpenMetrics integration maps it into New Relic count data. Query the stored count as increments over reporting intervals. Applying another derivative to those increments answers a different question and can create confusing negative or noisy results.

This guide applies to legacy `nri-prometheus` collection. Confirm the ingestion path before using it to interpret remote-write or OpenTelemetry data, which can expose additional cumulative metric fields.

## Work through a small numeric example

Imagine a test worker reports this cumulative sequence after a baseline is established:

| Observation | Exported total | New work since previous observation |
| --- | ---: | ---: |
| Baseline | 100 | Not part of this test interval |
| One minute later | 130 | 30 |
| Another minute later | 175 | 45 |

The workload performed 75 jobs during the two intervals. Adding the exported totals, 130 plus 175, would give 305 and count old work again. Adding the interval counts gives the intended 75.

The [New Relic PromQL-to-NRQL guide](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/translate-promql-queries-nrql/) explains the cumulative-counter to delta-count relationship. The [metric data structure reference](https://docs.newrelic.com/docs/data-apis/understand-data/metric-data/metric-data-type/) identifies `sum` as the aggregation for count metrics.

## Confirm the measurement and the collector

Inspect the endpoint metadata and the resolved integration configuration. For the legacy collector, expose the counter in Prometheus text 0.0.4 format:

```text
# TYPE worker_jobs_total counter
worker_jobs_total{service="batch",result="success"} 175
```

In [`nri-prometheus` v2.30.4](https://github.com/newrelic/nri-prometheus/blob/v2.30.4/internal/pkg/prometheus/prometheus.go), the decoder is fixed to Prometheus text even if the response advertises OpenMetrics. The valid OpenMetrics 1.0 declaration `# TYPE worker_jobs counter` would therefore leave `worker_jobs_total` untyped; the legacy collector then treats it as a gauge. Use the full sample name in the text-format `TYPE` declaration and confirm that the deployed collector reports it as a counter. A name ending in `_total` alone does not repair incorrect type metadata.

Inspect fresh data and the attributes actually attached to it. The examples below assume the exporter supplies `service="batch"` and `result`. Replace those filters with labels verified in your account rather than assuming they exist on every integration.

Also check whether both legacy and new collectors are sending the same measurement. A doubled count can come from duplicate ingestion even when the query is mathematically correct.

## Query totals with sum

For total jobs in a selected window:

```sql
FROM Metric
SELECT sum(worker_jobs_total)
WHERE service = 'batch'
SINCE 30 minutes ago
```

This sums stored increments for the selected metric and dimensions. It does not display the process's lifetime total. Use a window that includes complete observed test intervals when comparing against a controlled workload.

To break down counts by outcome:

```sql
FROM Metric
SELECT sum(worker_jobs_total)
WHERE service = 'batch'
FACET result
SINCE 30 minutes ago
```

Keep replica or target identity available for diagnostics even if the final service graph aggregates it away. Distinct producers should be accumulated intentionally, while two collectors observing the same producer should not be mistaken for independent work.

## Normalize throughput with rate

For jobs per second, use a rate of the sum:

```sql
FROM Metric
SELECT rate(sum(worker_jobs_total), 1 second)
WHERE service = 'batch'
TIMESERIES 1 minute
SINCE 30 minutes ago
```

Here, the chart buckets are one minute wide, while the output is normalized to jobs per second. Changing the normalization interval changes the unit; changing the timeseries bucket changes the chart's grouping resolution. Keep both explicit when comparing dashboards.

Do not use the derivative of `sum(worker_jobs_total)` to recover a rate from this delta-count representation. That would measure changes in the already aggregated interval counts rather than the volume of work performed.

## Diagnose resets, gaps, and query mismatches

Test a steady workload before testing restarts. Restarting the producer changes its cumulative sequence; restarting the collector can change conversion state. Treat the first observation and intervals around restarts as special cases to verify against the deployed integration version, not guaranteed historical recovery.

A scrape gap does not establish zero activity. Check collector logs and integration errors before filling missing graph buckets with zero. If the exporter resets during an unobserved gap, the pipeline may not recover all work that happened before the reset.

New Relic's [supported PromQL features documentation](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/supported-promql-features/) warns that applying counter and gauge functions to the wrong types can behave differently from Prometheus. Prefer a query whose semantics match the stored metric.

For Kubernetes, plan migration using the [Prometheus agent migration guide](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/migration-guide/). Recheck type mappings and label names during that change. A reliable counter dashboard states its unit, time window, selected producers, and ingestion semantics clearly enough that a known workload produces a predictable result.
