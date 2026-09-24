# How to Detect OpenTelemetry Metric Overflow and Count Overflow Measurements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Monitoring

Description: Find the OpenTelemetry overflow series, calculate its share of retained measurements, and avoid mistaking lost attributes for lost counts.

---

An OpenTelemetry metric point with `otel.metric.overflow=true` means the SDK could not retain a separate aggregation for every observed attribute combination. Measurements have been combined into a synthetic overflow series, so totals can remain intact while route, customer, or other dimension detail is lost.

Start by inspecting that attribute in OTLP before assuming what its exported Prometheus label is called. Exporters and backends can normalize attribute names differently.

## Recognize the overflow point

The [metrics SDK specification](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#overflow-attribute) defines an overflow attribute set containing only the boolean `otel.metric.overflow=true`. It is a data-point attribute, separate from resource attributes such as service identity.

A simplified OTLP-shaped fragment looks like this:

```json
{
  "attributes": [
    {
      "key": "otel.metric.overflow",
      "value": {"boolValue": true}
    }
  ],
  "asInt": "37"
}
```

This is an illustrative point fragment, not a complete export request. A debug exporter or a captured OTLP payload lets you confirm the boolean type and the metric's actual sum or histogram structure.

For synchronous instruments, the specification requires every measurement to enter exactly one aggregator, including overflow. That means overflow should not itself cause measurements to be dropped or counted twice. This guarantee does not rule out losses elsewhere in collection or export.

## Find the translated series

Under a common Prometheus translation strategy, the attribute becomes `otel_metric_overflow="true"`. Verify the actual labels in your backend; the [Prometheus compatibility specification](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/#metric-attributes) describes attribute translation.

For a selected service job:

```promql
app_requests_total{job="checkout",otel_metric_overflow="true"}
```

Do not expect the overflow point to retain a route or customer attribute identifying which values overflowed. Those distinctions are the information that was not retained. Resource identity can still identify the affected service or instance, depending on the export mapping.

Check the instrument's actual cardinality policy. The specification recommends a default limit when none is configured, but SDK support and configuration APIs vary. Verify the installed language SDK and any View-specific settings before changing a limit.

## Quantify overflow for an event counter

If the application increments `app_requests_total` by exactly one for every request, estimate the overflow request rate with:

```promql
sum(
  rate(app_requests_total{job="checkout",otel_metric_overflow="true"}[5m])
)
```

Divide by the total request rate, including overflow:

```promql
100 *
sum(
  rate(app_requests_total{job="checkout",otel_metric_overflow="true"}[5m])
)
/
sum(rate(app_requests_total{job="checkout"}[5m]))
```

Keep the selected job identical on both sides and apply `rate()` before aggregation so resets remain visible per original series. When the denominator is zero, the ratio is undefined; do not label it as a healthy zero-percent result.

If no overflow series exists, the numerator may be absent. A dashboard may derive a zero from a present matching total series, but it must also show collection health. An unconditional scalar zero can hide a missing metric or failed scrape.

A byte counter is different. Its overflow ratio describes the fraction of accumulated bytes whose original attributes were not preserved, not the fraction of measurement calls. A single `add(1000000)` and a million `add(1)` calls produce the same accumulated value.

## Use histogram counts for recorded observations

If every request records one duration measurement, a histogram's count reports how many observations entered each aggregation. With a classic Prometheus export:

```promql
100 *
sum(rate(http_server_request_duration_seconds_count{
  job="checkout",otel_metric_overflow="true"
}[5m]))
/
sum(rate(http_server_request_duration_seconds_count{
  job="checkout"
}[5m]))
```

For native histograms, apply `histogram_count()` to the histogram rate before summing. Confirm the actual exported metric name and representation; a `_count` series may not be stored for a native-only export.

Histogram sums measure accumulated observed values, such as elapsed seconds. They therefore answer a different question from observation counts. Gauges and last-value aggregations likewise cannot generally reveal the number of measurement calls sent to overflow.

## Diagnose what changed

Correlate the first overflow period with deployments and attribute additions. Unbounded URLs, user identifiers, random IDs, and raw error strings can multiply combinations rapidly. Count combinations in a controlled sample or test environment instead of adding the same high-cardinality values to another production metric.

Prefer SDK Views that remove unnecessary attributes before aggregation. The SDK specification places cardinality enforcement after attribute filtering, so reducing the attribute set at the source can prevent overflow. Dropping labels later in the Collector does not recover already lost dimension detail or avoid the SDK's earlier allocation pressure.

Test with a deliberately small limit and a known number of measurements. Verify conservation of the total, the appearance of overflow, and the disappearance of only the expected detail. After deploying a fix, monitor overflow volume as well as presence: cumulative series can remain present after pressure stops, while their recent rate shows whether new measurements are still entering overflow.
