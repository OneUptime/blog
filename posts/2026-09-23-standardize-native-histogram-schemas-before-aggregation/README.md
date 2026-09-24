# How to Standardize Native Histogram Schemas for Reliable Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Observability

Description: Distinguish compatible histogram resolution changes from incompatible schema families and preserve useful distributions during rollouts.

---

Native histograms make aggregation easier, but a common metric name does not guarantee compatible samples. Before changing schemas, determine whether the producers emit standard exponential histograms, native histograms with custom buckets, or a mixture of floats and histograms.

Do not require every exponential producer to use an identical resolution. Current Prometheus can reconcile standard exponential schemas by reducing resolution. The more dangerous changes cross representation families or collapse custom layouts until almost no useful boundaries remain.

## Inventory the representation

Start with the raw metric in the expression browser and inspect an API response for a representative instance:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=http_request_duration_seconds{instance="api-1:8080"}' \
  | jq '{warnings, infos, data}'
```

The [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#expression-queries) represents native histogram samples differently from float samples. Confirm that the base metric actually contains histograms. A classic `_bucket` series remains a float counter even though its name refers to a histogram.

Use instrumentation configuration and the exposition protocol to identify exact schema settings; the query API's rendered bucket boundaries are useful for inspection but are not a substitute for that configuration inventory. Record units, counter versus gauge flavor, zero threshold, exponential resolution or custom boundaries, and which deployment introduced each setting.

## Understand which differences can be reconciled

The current [native histogram specification](https://prometheus.io/docs/specs/native_histograms/#promql) describes these cases:

| Inputs | Expected consequence |
| --- | --- |
| Standard exponential schemas at different resolutions | Merge at a common lower resolution |
| Different zero-bucket widths | Reconcile widths, possibly absorbing nearby buckets |
| Custom bucket histograms with different boundaries | Reconcile to shared boundaries, with an informational annotation |
| Custom and standard exponential histograms | Incompatible representation families |
| Float and histogram samples in one sum group | Group is omitted with a warning |

Custom-boundary reconciliation deserves special attention. If two custom layouts share no boundaries, their merged histogram can collapse to an overflow bucket. The operation may succeed while producing a distribution too coarse for a meaningful percentile. Older Prometheus releases or compatible backends can behave differently; verify the exact engine used by dashboards and rules.

For exponential schemas, a producer with coarse resolution limits the precision of the aggregate. Increasing every other instance's precision cannot reconstruct detail missing from that producer.

## Establish a producer contract

For a service-wide latency distribution, standardize these properties together:

1. Metric name and unit, such as seconds rather than mixed seconds and milliseconds.
2. Counter histogram semantics for accumulated completed requests.
3. Standard exponential versus custom bucket representation.
4. A resolution policy that meets the percentile error budget.
5. A bounded set of dimensions identifying independent populations.

With custom buckets, deploy the same ordered boundaries when practical. This avoids accidental loss of the exact thresholds used for SLO calculations. Native storage alone does not make arbitrary boundary choices interchangeable.

Apply the settings in the client library or SDK where measurements are aggregated. Relabeling cannot repair the bucket structure inside an already collected native histogram. Nor can multiplying a histogram to change its observation counts change the units of the observed latency distribution.

## Migrate incompatible forms separately

When moving from custom to exponential native histograms, use separate metric names during the transition, such as `http_request_duration_seconds_v2`. Route both through the same test traffic, but query each population independently:

```promql
histogram_quantile(
  0.95,
  sum by (service) (
    rate(http_request_duration_seconds_v2[5m])
  )
)
```

Never add the old and new results if both record the same requests. Compare counts and sums for agreement, then assess percentile differences in light of interpolation and resolution. Percentiles need not be numerically identical even when observation counts match.

If a bounded `histogram_format` label separates two forms instead, retain it through every aggregation until the migration completes. Dropping it at the first `sum by(service)` recreates the original incompatibility.

## Verify each aggregation layer

First run `rate()` per instance. Next sum only instances with the same intended format. Finally run the service-wide rule. Inspect `warnings` and `infos` at every step, because an omitted service can disappear inside a larger dashboard without an obvious error message.

Compare observation rates before and after aggregation:

```promql
sum by (service) (
  histogram_count(rate(http_request_duration_seconds_v2[5m]))
)
```

Compare this with `histogram_count(sum by(service)(rate(...)))` for the same selection. Differences or missing services deserve investigation, though matching counts alone do not prove useful bucket resolution.

Exercise a rolling deployment, a restart, and a low-traffic period. Check both a recent window and a longer window spanning the migration. Retire the old representation only after recording rules, remote storage, and dashboards can consume the new one consistently. The acceptance criterion is a complete distribution with sufficient precision, not simply the absence of a parser error.
