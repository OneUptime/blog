# How to Configure Metric Aggregation Rules in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Aggregation, Prometheus, Recording Rules

Description: How to configure metric aggregation rules in Istio using Prometheus recording rules, Telemetry API tag overrides, and EnvoyFilter to reduce cardinality and improve query performance.

---

As your Istio mesh grows, the volume of metrics can become overwhelming. Every service, every pod, every response code creates new time series. Metric aggregation helps by pre-computing common queries and reducing the dimensionality of your data. There are several layers where you can aggregate: at the proxy level, using Prometheus recording rules, or in the OpenTelemetry Collector.

## Why Aggregate Metrics?

A single Istio metric like `istio_requests_total` can generate thousands of time series in a moderately sized mesh. The cardinality comes from the combination of labels: source workload, destination workload, response code, request protocol, and more. If you have 50 services talking to 10 services each, with 5 response codes, that is 2,500 time series for a single metric.

Aggregation reduces this by pre-computing the queries you actually use. Instead of querying across all labels at query time, you store pre-aggregated results that are faster to query and cheaper to store.

## Prometheus Recording Rules

Recording rules are the most common form of metric aggregation. They run PromQL queries at regular intervals and store the results as new time series.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-aggregation-rules
  namespace: monitoring
spec:
  groups:
  - name: istio-aggregations
    interval: 30s
    rules:
    # Aggregate request rate per service (drop source labels)
    - record: istio:requests:rate5m
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m]))
        by (destination_service_name, destination_service_namespace, response_code)

    # Aggregate error rate per service
    - record: istio:errors:rate5m
      expr: |
        sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m]))
        by (destination_service_name, destination_service_namespace)

    # Aggregate success rate per service
    - record: istio:success_rate:ratio5m
      expr: |
        sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m]))
        by (destination_service_name, destination_service_namespace)
        /
        sum(rate(istio_requests_total{reporter="destination"}[5m]))
        by (destination_service_name, destination_service_namespace)

    # Pre-compute P50, P95, P99 latency per service
    - record: istio:latency:p50
      expr: |
        histogram_quantile(0.50,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
          by (destination_service_name, destination_service_namespace, le)
        )

    - record: istio:latency:p95
      expr: |
        histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
          by (destination_service_name, destination_service_namespace, le)
        )

    - record: istio:latency:p99
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
          by (destination_service_name, destination_service_namespace, le)
        )
```

These recording rules drop labels you do not need for common queries (like `source_workload` and `connection_security_policy`) and pre-compute values that are expensive to calculate at query time.

## Using Recording Rules in Dashboards and Alerts

Once you have recording rules, use them instead of the raw metrics:

```promql
# Instead of this (slow, high cardinality):
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination"
  }[5m])) by (le)
)

# Use this (fast, pre-computed):
istio:latency:p99{destination_service_name="my-api"}
```

Alerts become simpler too:

```yaml
- alert: HighErrorRate
  expr: istio:success_rate:ratio5m{destination_service_namespace="default"} < 0.99
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "{{ $labels.destination_service_name }} success rate below 99%"
```

## Multi-Window Aggregation

For SLO tracking, you need metrics at different time windows:

```yaml
- name: istio-slo-aggregations
  interval: 30s
  rules:
  # 5-minute error rate (fast burn detection)
  - record: istio:error_rate:ratio_rate5m
    expr: |
      sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m]))
      by (destination_service_name, destination_service_namespace)
      /
      sum(rate(istio_requests_total{reporter="destination"}[5m]))
      by (destination_service_name, destination_service_namespace)

  # 1-hour error rate (medium burn)
  - record: istio:error_rate:ratio_rate1h
    expr: |
      sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[1h]))
      by (destination_service_name, destination_service_namespace)
      /
      sum(rate(istio_requests_total{reporter="destination"}[1h]))
      by (destination_service_name, destination_service_namespace)

  # 6-hour error rate (slow burn)
  - record: istio:error_rate:ratio_rate6h
    expr: |
      sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[6h]))
      by (destination_service_name, destination_service_namespace)
      /
      sum(rate(istio_requests_total{reporter="destination"}[6h]))
      by (destination_service_name, destination_service_namespace)
```

Use these for multi-window alerting:

```yaml
- alert: ErrorBudgetBurnFast
  expr: |
    istio:error_rate:ratio_rate5m > 14.4 * 0.001
    and
    istio:error_rate:ratio_rate1h > 14.4 * 0.001
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "{{ $labels.destination_service_name }} burning error budget fast"
```

## Proxy-Level Aggregation with Telemetry API

You can reduce cardinality at the source by removing or collapsing labels before they leave the proxy:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metric-labels
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
    - match:
        metric: REQUEST_DURATION
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
    - match:
        metric: REQUEST_SIZE
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
    - match:
        metric: RESPONSE_SIZE
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
```

This removes the `source_principal` and `destination_principal` labels from all metrics at the proxy level, before they ever reach Prometheus. This is the most effective way to reduce cardinality.

## Response Code Aggregation

Instead of tracking every individual response code (200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503), aggregate them into classes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: aggregate-response-codes
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_code_class:
          operation: UPSERT
          value: |
            response.code >= 500 ? '5xx' :
            response.code >= 400 ? '4xx' :
            response.code >= 300 ? '3xx' :
            response.code >= 200 ? '2xx' :
            'other'
```

Then in your recording rules, aggregate by the class instead of individual codes:

```yaml
- record: istio:requests_by_class:rate5m
  expr: |
    sum(rate(istio_requests_total{reporter="destination"}[5m]))
    by (destination_service_name, response_code_class)
```

## OpenTelemetry Collector Aggregation

If you use an OTel Collector in your pipeline, you can aggregate there too:

```yaml
processors:
  metricstransform:
    transforms:
    # Aggregate across source labels
    - include: istio_requests_total
      action: update
      operations:
      - action: aggregate_labels
        label_set:
        - destination_service_name
        - destination_service_namespace
        - response_code
        aggregation_type: sum
```

This drops all labels except the ones listed and sums the values.

## Aggregation Strategy

Here is a practical aggregation strategy for a mesh with 100+ services:

1. **Proxy level**: Remove labels you never query (principal, protocol, security policy)
2. **OTel Collector**: Aggregate by destination only, dropping source labels for storage-optimized metrics
3. **Prometheus recording rules**: Pre-compute latency percentiles, error rates, and SLO metrics
4. **Grafana variables**: Use recording rules in dashboards for fast rendering

```promql
# Check your current cardinality
count(istio_requests_total)

# After aggregation, the recording rule should have much lower cardinality
count(istio:requests:rate5m)
```

## Monitoring Aggregation Effectiveness

Track whether your aggregation is working:

```promql
# Total time series for raw Istio metrics
count({__name__=~"istio_.*"})

# Total time series for aggregated metrics
count({__name__=~"istio:.*"})

# Ratio (should be much less than 1)
count({__name__=~"istio:.*"}) / count({__name__=~"istio_.*"})
```

Metric aggregation is one of those operational tasks that pays for itself quickly. Without it, Prometheus gets slower, dashboards take longer to load, and your monitoring costs grow linearly with mesh size. With proper aggregation, your monitoring stays fast and affordable regardless of how many services you add.
