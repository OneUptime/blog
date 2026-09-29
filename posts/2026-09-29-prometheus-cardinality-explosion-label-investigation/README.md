# How to Find Which Labels Caused a Prometheus Cardinality Explosion Before the TSDB Runs Out of Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Cardinality, Monitoring, Troubleshooting

Description: Find the metric families and changing labels behind a Prometheus cardinality surge, then contain ingestion without corrupting series identity.

A new request identifier label can turn a stable metric into millions of series before a memory alert gives responders much time. The immediate goal is to locate the producing workload and stop unbounded growth while preserving enough evidence to explain the change.

Do not begin with a dashboard that enumerates every series. A stressed Prometheus process should not also be asked to run its most expensive cardinality query across the entire retention period.

## Establish the time and growth pattern

Inspect head series, memory and ingestion changes together. Useful self-metrics include `prometheus_tsdb_head_series`, `prometheus_tsdb_head_series_created_total`, and process resident memory. Verify the actual metrics exposed by your installed release before saving alert rules.

A rising head count suggests growth in currently retained head identities. A high series-creation rate with a flatter count suggests churn: labels continuously change while older series become inactive. Both can be expensive, but their fixes differ.

Compare the first rise with deployments, scrape discovery changes and newly enabled instrumentation. An added histogram multiplies each label combination across buckets as well as its sum and count series, so a seemingly small label change may have a large effect.

## Use the TSDB status endpoint first

The [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats) exposes a head-oriented summary:

```bash
curl --fail --silent --show-error \
  'http://localhost:9090/api/v1/status/tsdb?limit=10' \
  > /tmp/tsdb-cardinality.json

jq '.data | {
  headStats,
  seriesCountByMetricName,
  labelValueCountByLabelName,
  memoryInBytesByLabelName
}' /tmp/tsdb-cardinality.json
```

Use an authenticated administrative connection where required. Keep the result local to the investigation because label values may themselves contain sensitive identifiers.

The summary distinguishes metric families with many series from labels with many unique values. Its label-memory statistic sums label-value string lengths; it is not a complete per-label heap attribution. Head statistics also differ from the set returned by an instant query, so the two counts need not match exactly.

## Narrow the investigation to one family

Once `api_request_duration_seconds_bucket` appears suspicious, inspect only that family:

```promql
count by (job) (api_request_duration_seconds_bucket)
```

Then count distinct candidate values within the affected job:

```promql
count(count by (route) (
  api_request_duration_seconds_bucket{job="checkout"}
))
```

Repeat for suspicious dimensions such as `customer_id`, `request_id`, or raw `path`. These are discovery queries, not proposed labels to add. A million distinct routes usually indicates raw paths containing identifiers, whereas a bounded route template such as `/orders/{id}` gives a stable dimension.

Measure the combined label set too. Ten methods, hundreds of routes and many status codes can create a large cross-product without any single label looking extreme. Compare a sample exposition from one affected target with a target still running the previous release.

## Contain the source of growth

Prefer correcting instrumentation or rolling back the offending deployment. Normalize URL paths before recording metrics, remove event-specific identifiers, and keep detailed identifiers in logs or traces with suitable access controls.

If that fix cannot land quickly, an explicit metric-family drop can bound ingestion:

```yaml
scrape_configs:
  - job_name: checkout
    static_configs:
      - targets: [checkout.example.net:9100]
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'api_request_debug_.*'
        action: drop
```

This example assumes the runaway data is a disposable debug family. Select the real family deliberately and check dashboards and rules that depend on it. The [scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) defines metric relabeling as an ingestion step.

Do not blindly `labeldrop` the offending label. Different input series can become identical after label removal, creating duplicate identities without aggregating their values. Relabeling is not a summation engine. If you need aggregation, perform it in instrumentation or a component designed to aggregate before export.

## Understand what containment does not fix

A scrape `sample_limit` is a circuit breaker, not a graceful selector of the most valuable samples. Exceeding it makes the scrape fail. It also bounds samples per scrape rather than preventing labels from changing on every scrape.

Dropping new samples does not instantly release all memory or delete old blocks. Observe head evolution, compaction and restart behavior before declaring the incident resolved. Do not delete TSDB files as a first-line response; that destroys evidence and stored monitoring history.

## Prevent recurrence

Give each service an owned series budget and a deployment comparison. Check expected label domains and histogram buckets during instrumentation review. Alert on the growth rate early enough to investigate, not only on an absolute memory emergency.

## Conclusion

Start with bounded TSDB summaries, identify the changed metric and label combination, and fix production at the source. Emergency drop rules can stop growth, but label removal and sample limits have specific semantics that must be understood before they become an additional monitoring failure.
