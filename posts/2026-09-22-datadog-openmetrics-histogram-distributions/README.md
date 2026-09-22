# How to Turn OpenMetrics Histogram Buckets into Queryable Datadog Distributions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Convert classic OpenMetrics histograms into Datadog distributions, retain optional count and sum metrics, and verify percentile accuracy limits.

---

A set of histogram bucket metrics is not automatically a queryable Datadog distribution. The latest OpenMetrics check normally submits histogram components as count metrics. Enable its histogram-to-distribution conversion when you need distribution aggregations across the collected observations.

The conversion begins with aggregated buckets, so it cannot recover the exact original request durations. A correctly configured distribution still inherits the resolution limits of the source histogram.

## Verify that the source is a complete histogram

Consider a small latency family:

```text
# TYPE checkout_latency_seconds histogram
# HELP checkout_latency_seconds Checkout request latency.
checkout_latency_seconds_bucket{route="/pay",le="0.1"} 40
checkout_latency_seconds_bucket{route="/pay",le="0.5"} 90
checkout_latency_seconds_bucket{route="/pay",le="2.0"} 100
checkout_latency_seconds_bucket{route="/pay",le="+Inf"} 100
checkout_latency_seconds_sum{route="/pay"} 25
checkout_latency_seconds_count{route="/pay"} 100
# EOF
```

Buckets are cumulative across upper bounds: 90 observations at or below 0.5 seconds includes the 40 at or below 0.1 seconds. Adding 40, 90, and 100 would count observations repeatedly. The infinite bucket and count should agree for the same labels and snapshot.

The [Prometheus histogram guidance](https://prometheus.io/docs/practices/histograms/) explains cumulative buckets and the effect of bucket boundaries on quantile estimates. Fix malformed or incoherent source data before configuring downstream conversion.

## Enable the latest check's conversion

Use the histogram family name in `metrics`:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: shop
    metrics:
      - checkout_latency_seconds: checkout.latency
    histogram_buckets_as_distributions: true
    collect_counters_with_distributions: true
    tags:
      - service:checkout
```

The [official configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) states that `histogram_buckets_as_distributions` enables bucket collection and non-cumulative bucket handling. `collect_counters_with_distributions` additionally preserves the observation count and sum submissions and also enables distribution conversion.

The distribution uses `shop.checkout.latency`; the additional metrics use `.count` and `.sum`. The [current histogram transformer](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/histogram.py) shows these submission paths. Do not add separate `_bucket`, `_sum`, and `_count` selectors as a substitute for selecting the histogram family.

These are latest-mode option names. If the instance uses `prometheus_url`, first plan a migration to `openmetrics_endpoint`; copying V2 settings into a legacy instance does not establish the same behavior.

## Understand both cumulative dimensions

A histogram accumulates observations over time, and each bucket also includes smaller buckets. The integration must account for both relationships. It derives intervals between bucket boundaries and submits data through the Agent's histogram bucket handling, with monotonic behavior over successive scrapes.

For that reason, verify more than one scrape. A static fixture is useful for parser and mapping checks, but an increasing workload is needed to confirm observation increments. Do not preprocess the endpoint into per-scrape deltas unless you are deliberately changing the entire ingestion contract.

Start a canary, establish its baseline, then add a known batch of requests. Compare the resulting observation count with that batch. Repeat after an exporter restart to make sure reset handling produces a sensible transition.

## Enable percentile queries in Datadog

Find the new metric in Metrics Summary and confirm that it is a distribution. Enable percentile aggregations for the distribution if they are not already enabled, following the [Datadog distributions documentation](https://docs.datadoghq.com/metrics/distributions/).

A graph query can then use a percentile aggregation such as:

```text
p95:shop.checkout.latency{service:checkout}
```

Choose grouping tags intentionally. A service-wide percentile combines the selected distribution data; averaging independent per-pod p95 values does not produce the same result. During the canary, keep legacy and new collection distinguishable so one endpoint is not counted twice in the same comparison.

## Diagnose surprising percentile results

If the metric exists but no percentile query is available, check its stored type and percentile configuration. A count series with a `.bucket` suffix remains a different metric from the distribution base name.

If p95 changes abruptly while counts remain correct, inspect the source bucket boundaries. A broad 0.5-to-2.0-second interval provides little information about where observations fall inside it. Distribution conversion cannot restore that missing detail. Add useful source boundaries around the latency objective and deploy the same intended bucket layout across producers.

Keep the optional count and sum metrics when you need an independent throughput or mean-latency cross-check. Verify their semantics and units separately. A successful migration has correct observation counts, intentional grouping, and percentile behavior consistent with the precision actually available from the exporter.
