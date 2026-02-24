# How to Handle High-Cardinality Istio Metrics in Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Cardinality, Performance, Metrics

Description: Strategies for identifying and reducing high-cardinality Istio metrics in Prometheus to prevent memory issues, slow queries, and storage bloat.

---

High cardinality is the number one performance killer for Prometheus in Istio environments. Every unique combination of label values creates a separate time series. With Istio, you get labels for source service, destination service, response code, namespace, pod name, and more. In a mesh with 100 services, the cross-product of all these labels creates millions of time series.

If you have noticed Prometheus using too much memory, queries taking forever, or scrapes timing out, cardinality is probably the cause.

## Understanding the Problem

A single Istio metric like `istio_requests_total` has these labels:

- `source_workload`
- `source_workload_namespace`
- `destination_workload`
- `destination_workload_namespace`
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
- `destination_canonical_service`

With 100 source services, 100 destination services, 10 response codes, and other label variations, the math gets ugly fast:

```
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

Each dropped label can reduce cardinality by an order of magnitude.

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

Instead of tracking every individual HTTP status code, group them into classes:

```yaml
metric_relabel_configs:
- source_labels: [response_code]
  regex: '2..'
  target_label: response_code
  replacement: '2xx'
- source_labels: [response_code]
  regex: '3..'
  target_label: response_code
  replacement: '3xx'
- source_labels: [response_code]
  regex: '4..'
  target_label: response_code
  replacement: '4xx'
- source_labels: [response_code]
  regex: '5..'
  target_label: response_code
  replacement: '5xx'
```

This collapses dozens of response code values into 4-5 classes, significantly reducing cardinality.

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

You can customize the buckets at the Envoy level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_METAJSON_STATS_HISTOGRAM_BUCKETS: '{"istio_request_duration_milliseconds":{"buckets":[1,5,10,50,100,500,1000,5000]}}'
```

Reducing from the default 20+ buckets to 8 cuts histogram cardinality by more than half.

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

1. Drop `source_principal` and `destination_principal` labels (saves 2x cardinality)
2. Drop `connection_security_policy` and `response_flags` labels
3. Aggregate response codes into classes
4. Increase scrape interval from 15s to 30s (does not reduce cardinality but reduces load)
5. Use the Telemetry API to disable histogram metrics for non-critical namespaces

High cardinality is a persistent challenge in Istio monitoring. The key is being proactive about label management and regularly auditing which metrics you actually use versus which ones are just costing you resources.
