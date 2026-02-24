# How to Monitor P99 Latency with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, P99, Prometheus, Monitoring, Performance

Description: A complete guide to monitoring P99 latency in Istio using histogram metrics, PromQL queries, recording rules, and alerting strategies.

---

P99 latency tells you how long the slowest 1% of your requests take. It is one of the best metrics for understanding real user experience, because while your average latency might look fine, a bad P99 means a significant number of users are having a terrible time. In an Istio service mesh, every request is measured by the Envoy sidecar, so you get latency data for free across all your services.

But working with histograms in Prometheus takes some getting used to. This guide covers the practical details of monitoring P99 latency with Istio metrics.

## How Istio Measures Latency

Istio uses the `istio_request_duration_milliseconds` histogram metric. This metric is collected by Envoy and exposed in Prometheus format. A histogram in Prometheus is not a single value - it is a set of counters for predefined buckets.

The default buckets for Istio request duration are: 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, and 300000 milliseconds.

Each bucket counter tells you how many requests completed in less than or equal to that duration. Prometheus then uses these buckets to estimate percentiles using the `histogram_quantile` function.

## Basic P99 Query

The fundamental P99 query for a specific service:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service="my-service.default.svc.cluster.local"
  }[5m])) by (le)
)
```

A few important notes about this query:

- You must include `by (le)` in the aggregation. The `le` label stands for "less than or equal to" and represents the bucket boundary. Without it, the percentile calculation breaks.
- The `rate()` function over `[5m]` gives you the per-second rate of requests falling into each bucket over the last 5 minutes.
- The result is in milliseconds (the unit of the metric name).

## P99 by Service Across the Mesh

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le)
)
```

This gives you P99 latency for every service in the mesh, grouped by `destination_service`.

## P99 by Source-Destination Pair

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (source_workload, destination_service, le)
)
```

This reveals whether specific callers experience different latencies. For example, you might find that service A gets 50ms P99 when calling service B, but service C gets 200ms P99 for the same destination. That usually points to different request patterns or payload sizes.

## Understanding Histogram Accuracy

Here is something that catches people off guard: the P99 value you get from `histogram_quantile` is an estimate, not an exact measurement. It interpolates linearly between bucket boundaries.

If your actual P99 latency is 450ms and your buckets are [250, 500], Prometheus will estimate the P99 somewhere between 250 and 500. The estimate improves with more buckets in the right range.

If you need more precise percentile calculations, you can customize the histogram buckets in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
          - ".*request_duration_milliseconds.*"
```

Or better yet, use the Telemetry API to adjust the metric:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-latency-buckets
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_DURATION
          tagOverrides: {}
```

Note that adding more buckets increases the number of time series and storage requirements. Only add buckets in ranges where you need precision.

## Recording Rules

Computing percentiles from raw histogram data is expensive. Create recording rules for the queries you use frequently:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-latency-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-latency
      interval: 30s
      rules:
        - record: istio:request_duration_p50_5m
          expr: |
            histogram_quantile(0.50,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le)
            )

        - record: istio:request_duration_p90_5m
          expr: |
            histogram_quantile(0.90,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le)
            )

        - record: istio:request_duration_p99_5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le)
            )

        - record: istio:request_duration_p99_1h
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket[1h])) by (destination_service, le)
            )
```

## Alerting on P99 Latency

### Static Threshold Alert

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-latency-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-latency-alerts
      rules:
        - alert: IstioHighP99Latency
          expr: |
            istio:request_duration_p99_5m > 1000
            and
            sum(rate(istio_requests_total[5m])) by (destination_service) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High P99 latency for {{ $labels.destination_service }}"
            description: "P99 latency is {{ $value }}ms (threshold: 1000ms)"

        - alert: IstioCriticalP99Latency
          expr: |
            istio:request_duration_p99_5m > 5000
            and
            sum(rate(istio_requests_total[5m])) by (destination_service) > 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical P99 latency for {{ $labels.destination_service }}"
            description: "P99 latency is {{ $value }}ms (threshold: 5000ms)"
```

### Latency Spike Detection

Instead of a fixed threshold, detect when P99 spikes relative to its normal baseline:

```yaml
- alert: IstioP99LatencySpike
  expr: |
    (
      istio:request_duration_p99_5m
      / istio:request_duration_p99_1h
    ) > 3
    and
    sum(rate(istio_requests_total[5m])) by (destination_service) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "P99 latency spike for {{ $labels.destination_service }}"
    description: "Current P99 is {{ $value }}x higher than the 1-hour average"
```

This fires when P99 over 5 minutes is more than 3x the P99 over 1 hour, indicating a sudden degradation.

## Grafana Dashboard Panels

### Multi-Percentile Line Chart

Create a time series panel with three queries:

```promql
# P50
istio:request_duration_p50_5m{destination_service=~"$service"}

# P90
istio:request_duration_p90_5m{destination_service=~"$service"}

# P99
istio:request_duration_p99_5m{destination_service=~"$service"}
```

Set the Y-axis to milliseconds. Use different line styles (P50 as a thin line, P99 as a thick line) to make the chart readable.

### Latency Heatmap

```promql
sum(increase(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[1m])) by (le)
```

Heatmaps are my favorite way to visualize latency because they show the full distribution, not just individual percentiles. You can see bimodal distributions, long tails, and other patterns that single-number summaries hide.

### P99 Comparison Table

```promql
sort_desc(istio:request_duration_p99_5m)
```

Panel type: Table. Shows all services ranked by P99 latency. Add a color-coded threshold column.

## Practical Debugging Tips

When P99 latency is high, here is how to narrow down the problem:

**Check if it is specific callers:**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service="slow-service.default.svc.cluster.local"}[5m])) by (source_workload, le)
)
```

**Check client vs server perspective:**

```promql
# Server-side P99
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service="slow-service.default.svc.cluster.local"}[5m])) by (le)
)

# Client-side P99
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", destination_service="slow-service.default.svc.cluster.local"}[5m])) by (le)
)
```

If client-side P99 is significantly higher than server-side P99, the delay is in the network or the sidecar, not in the application.

**Look at the distribution gap between P50 and P99:**

A large gap between P50 and P99 suggests occasional slow requests (maybe database timeouts, garbage collection pauses, or cold starts). A small gap with both being high suggests the service is universally slow.

P99 monitoring is essential for maintaining good user experience. Istio gives you the data automatically, and with proper recording rules and alerts, you can catch latency issues before users start complaining.
