# How to Handle High-Cardinality Istio Metrics in Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Cardinality, Performance, Metric

Description: Strategies for identifying and reducing high-cardinality Istio metrics in Prometheus to prevent memory issues, slow queries, and storage bloat.

---

High cardinality is the number one performance killer for Prometheus in Istio environments. Every unique combination of label values creates a separate time series. With Istio, you get labels for source workload, destination service, response code, namespace, app, version, and more. In a mesh with 100 services, the cross-product of all these labels creates millions of time series.

If you have noticed Prometheus using too much memory, queries taking forever, or scrapes timing out, cardinality is probably the cause.

## Understanding the Problem

A single Istio metric like `istio_requests_total` commonly includes labels such as:

- `reporter`
- `source_workload`
- `source_workload_namespace`
- `source_app`
- `source_version`
- `destination_workload`
- `destination_workload_namespace`
- `destination_app`
- `destination_version`
- `destination_service`
- `destination_service_name`
- `destination_service_namespace`
- `response_code`
- `response_flags`
- `connection_security_policy`
- `source_principal`
- `destination_principal`
- `request_protocol`
- `source_canonical_service`
- `source_canonical_revision`
- `destination_canonical_service`
- `destination_canonical_revision`

With 100 source services, 100 destination services, 10 response codes, and other label variations, the math gets ugly fast:

```text
100 * 100 * 10 * 2 * 2 = 400,000 time series for one metric
```

Add histogram metrics with 15+ buckets each, and you are looking at millions of series.

## Finding High-Cardinality Metrics

First, figure out which metrics are causing the problem:

```promql
# Top 10 metrics by cardinality

topk(10, count by (__name__)({__name__=~".+"}))
```

For Istio-specific metrics:

```promql
topk(10, count by (__name__)({__name__=~"istio_.*"}))
```

Check which label has the most unique values:

```promql
# Cardinality of destination_service label
count(count by (destination_service)(istio_requests_total))
```

You can also use the Prometheus TSDB status page:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
curl -s localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[:10]'
```

## Strategy 1: Drop Labels You Do Not Use

The most effective fix is to remove labels that your dashboards and alerts do not reference. Use metric relabeling in your Prometheus scrape config:

```yaml
metric_relabel_configs:
# Drop security labels
- regex: 'source_principal|destination_principal|connection_security_policy'
  action: labeldrop

# Drop response_flags if you only care about response_code
- regex: 'response_flags'
  action: labeldrop

# Drop duplicate service labels (keep destination_service, drop the name/namespace variants)
- regex: 'destination_service_name|destination_service_namespace|source_workload_namespace|destination_workload_namespace'
  action: labeldrop
```

Each dropped label can reduce cardinality substantially when that label has many unique values.

## Strategy 2: Configure Istio to Generate Fewer Labels

Istio lets you customize which labels (called "dimensions" in Istio terminology) are included in metrics. You can do this through the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-labels
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_flags:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
    - match:
        metric: REQUEST_DURATION
      tagOverrides:
        response_flags:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
```

This is better than dropping labels in Prometheus because the labels are never generated in the first place, saving CPU in the Envoy sidecars.

## Strategy 3: Aggregate Response Codes

Instead of graphing every individual HTTP status code, group them into classes in a recording rule:

```yaml
groups:
- name: istio-response-classes
  interval: 30s
  rules:
  - record: istio:service_requests_by_response_class:rate5m
    expr: |
      sum by (destination_service, response_code_class) (
        label_replace(
          rate(istio_requests_total{response_code=~"[1-5].."}[5m]),
          "response_code_class",
          "$1xx",
          "response_code",
          "([1-5]).."
        )
      )
```

This collapses individual response code values into five classes for dashboards and alerts. Avoid doing this with `metric_relabel_configs`: relabeling does not aggregate samples, and replacing `200`, `201`, and `204` with the same `2xx` label can create duplicate label sets for the same metric.

## Strategy 4: Use Recording Rules for Pre-Aggregation

Create recording rules that aggregate high-cardinality metrics into lower-cardinality summaries:

```yaml
groups:
- name: istio-aggregated
  interval: 30s
  rules:
  # Aggregate by service only, dropping per-pod granularity
  - record: istio:service_requests:rate5m
    expr: sum(rate(istio_requests_total[5m])) by (destination_service, response_code)

  # Error rate per service
  - record: istio:service_error_rate:ratio5m
    expr: |
      sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
      / sum(rate(istio_requests_total[5m])) by (destination_service)

  # P99 latency per service
  - record: istio:service_latency:p99_5m
    expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
```

Use these recorded metrics in your dashboards and alerts instead of the raw high-cardinality metrics. Then you can apply shorter retention to the raw metrics or drop them entirely from remote write.

## Strategy 5: Limit Histogram Buckets

Histogram metrics are the biggest cardinality contributors because each bucket is a separate time series. Istio's `istio_request_duration_milliseconds` has many default buckets.

You can customize the buckets per pod with the Istio proxy annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/statsHistogramBuckets: '{"istio_request_duration_milliseconds":[1,5,10,50,100,500,1000,5000]}'
```

Reducing from the default 19 buckets to 8 cuts histogram cardinality by more than half for the affected workloads.

## Strategy 6: Scope Metrics to Specific Workloads

If only some services need detailed metrics, use the Telemetry API to selectively enable metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: detailed-metrics
  namespace: critical-services
spec:
  selector:
    matchLabels:
      app: payment-service
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
        mode: CLIENT_AND_SERVER
```

For non-critical services, disable some metrics entirely:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: minimal-metrics
  namespace: batch-jobs
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_DURATION
      disabled: true
    - match:
        metric: REQUEST_SIZE
      disabled: true
    - match:
        metric: RESPONSE_SIZE
      disabled: true
```

## Monitoring Cardinality Over Time

Set up an alert to catch cardinality growth before it becomes a problem:

```yaml
groups:
- name: cardinality
  rules:
  - alert: HighIstioCardinality
    expr: count({__name__=~"istio_.*"}) > 2000000
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Istio metric cardinality exceeds 2 million series"
      description: "Current count: {{ $value }}"
```

Track cardinality trends:

```promql
count({__name__=~"istio_.*"})
```

Graph this over time to see if cardinality is growing steadily (new services being added) or spiking (a label explosion from a misconfigured service).

## Quick Wins

If you need to reduce cardinality right now:

1. Drop `source_principal` and `destination_principal` labels when you do not use them
2. Drop `connection_security_policy` and `response_flags` labels
3. Use recording rules to aggregate response codes into classes for dashboards
4. Increase scrape interval from 15s to 30s (does not reduce cardinality but reduces load)
5. Use the Telemetry API to disable histogram metrics for non-critical namespaces

High cardinality is a persistent challenge in Istio monitoring. The key is being proactive about label management and regularly auditing which metrics you actually use versus which ones are just costing you resources.
