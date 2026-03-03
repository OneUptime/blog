# How to Handle High-Cardinality Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, High Cardinality, Prometheus, Performance

Description: Strategies for identifying and handling high-cardinality metrics in Istio to prevent Prometheus performance degradation, OOM kills, and excessive storage costs in your service mesh.

---

High-cardinality metrics are one of the sneakiest performance killers in any Prometheus-based monitoring setup. In an Istio mesh, the combination of many services, many pods, and many label values can create millions of time series that overwhelm your Prometheus instance. This post covers how to identify the problem, where the cardinality comes from, and what to do about it.

## What Is High Cardinality?

Cardinality in metrics refers to the number of unique time series. Each unique combination of metric name and label values creates a new time series. For `istio_requests_total`, a single time series looks like:

```text
istio_requests_total{
  source_workload="frontend",
  source_workload_namespace="default",
  source_principal="spiffe://cluster.local/ns/default/sa/frontend",
  destination_service_name="my-api",
  destination_service_namespace="default",
  destination_principal="spiffe://cluster.local/ns/default/sa/my-api",
  response_code="200",
  request_protocol="http",
  connection_security_policy="mutual_tls",
  reporter="destination"
}
```

With 10 labels and 50 services, the possible combinations are enormous. In practice, only a fraction of combinations actually occur, but even that fraction can be huge.

## How to Detect High Cardinality

Check your current cardinality:

```promql
# Total number of Istio time series
count({__name__=~"istio_.*"})

# Time series per metric
count({__name__=~"istio_.*"}) by (__name__)

# Top labels by cardinality for a specific metric
count(istio_requests_total) by (response_code)
count(istio_requests_total) by (source_workload)
count(istio_requests_total) by (destination_service_name)
count(istio_requests_total) by (source_principal)
```

From the command line:

```bash
# Check Prometheus TSDB stats
curl -s http://prometheus:9090/api/v1/status/tsdb | python3 -m json.tool

# Check per-metric cardinality
curl -s http://prometheus:9090/api/v1/label/__name__/values | python3 -c "
import json, sys
data = json.load(sys.stdin)
for name in sorted(data['data']):
    if name.startswith('istio'):
        print(name)
"
```

## Where Cardinality Comes From in Istio

The biggest cardinality contributors in Istio metrics:

### 1. Source/Destination Pairs

If you have N services, you can have up to N^2 source/destination pairs. With 50 services, that is 2,500 potential pairs.

### 2. Response Codes

Each distinct response code creates new series: 200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503, 504. That is 12 codes multiplied by every service pair.

### 3. Principal Labels

`source_principal` and `destination_principal` contain SPIFFE URIs that are unique per service account. These are high-cardinality by nature.

### 4. Custom Dimensions

If you added custom dimensions via the Telemetry API, each new dimension multiplies the cardinality.

### 5. Pod-Level Labels

If you have metrics with pod names or pod IPs as labels, cardinality scales with the number of pods, not just services.

## Strategy 1: Remove Unused Labels at the Proxy

The most effective cardinality reduction happens at the source. Remove labels you do not use:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
```

This removes four labels from every metric. If `source_principal` had 50 unique values, that alone removes a 50x multiplier from your cardinality.

## Strategy 2: Collapse Response Codes

Instead of tracking each individual HTTP status code, collapse them into classes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: collapse-response-codes
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_code:
          operation: UPSERT
          value: |
            response.code >= 500 ? '5xx' :
            response.code >= 400 ? '4xx' :
            response.code >= 200 ? '2xx' :
            'other'
```

This reduces response code cardinality from 12+ values to 4.

## Strategy 3: Limit Histogram Buckets

Histograms are the biggest cardinality offenders because each bucket is a separate time series. The default `istio_request_duration_milliseconds` histogram has many buckets.

You cannot easily change the bucket boundaries through the Telemetry API, but you can use an EnvoyFilter or process them in the OTel Collector:

```yaml
# OTel Collector processor to reduce histogram buckets
processors:
  metricstransform:
    transforms:
    - include: istio_request_duration_milliseconds
      action: update
      operations:
      - action: experimental_scale_value
        experimental_scale: 0.001
```

Or use Prometheus relabeling to drop unwanted bucket boundaries:

```yaml
# In Prometheus scrape config
metric_relabel_configs:
- source_labels: [__name__, le]
  regex: 'istio_request_duration_milliseconds_bucket;(0\.005|0\.01|0\.025|25|50|100)'
  action: drop
```

This drops the very small and very large buckets that are rarely useful.

## Strategy 4: Drop Metrics You Do Not Use

If you do not use `istio_request_bytes` or `istio_response_bytes`, drop them entirely:

```yaml
# Prometheus metric_relabel_configs
metric_relabel_configs:
- source_labels: [__name__]
  regex: 'istio_request_bytes_.*|istio_response_bytes_.*|istio_tcp_.*'
  action: drop
```

Or disable them at the proxy:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-unused-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_SIZE
      disabled: true
    - match:
        metric: RESPONSE_SIZE
      disabled: true
```

## Strategy 5: Use Recording Rules to Replace Raw Metrics

If you only use aggregated metrics in dashboards and alerts, you can drop the raw high-cardinality metrics after computing recording rules:

```yaml
# Recording rules
- record: istio:requests:rate5m
  expr: sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name, response_code)
```

Then in Prometheus, set a shorter retention for the raw metrics:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

# Drop raw Istio metrics after 2 hours (recording rules run on them first)
storage:
  tsdb:
    retention.time: 24h
```

## Strategy 6: Metric Relabeling in Prometheus

Use `metric_relabel_configs` in your Prometheus scrape configuration as a safety net:

```yaml
scrape_configs:
- job_name: 'istio-proxy'
  metric_relabel_configs:
  # Drop high-cardinality labels
  - action: labeldrop
    regex: 'source_principal|destination_principal'

  # Limit cardinality on custom dimensions
  - source_labels: [api_version]
    regex: '(v1|v2|v3)'
    target_label: api_version
    replacement: '$1'
  - source_labels: [api_version]
    regex: '(?!v1|v2|v3).*'
    target_label: api_version
    replacement: 'other'

  # Drop metrics with too many series
  - source_labels: [__name__]
    regex: 'envoy_.*'
    action: drop
```

## Monitoring Cardinality Over Time

Set up alerts for cardinality growth:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cardinality-alerts
  namespace: monitoring
spec:
  groups:
  - name: cardinality
    rules:
    - alert: HighIstioCardinality
      expr: count({__name__=~"istio_requests_total"}) > 50000
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Istio request metric cardinality above 50,000 time series"

    - alert: PrometheusHighMemory
      expr: process_resident_memory_bytes{job="prometheus"} > 8e9
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Prometheus memory usage above 8GB"
```

## Impact Assessment

Before removing labels, check if anyone is using them:

```bash
# Search Grafana dashboards for label usage
# Check Prometheus recording rules for label usage
# Check alerting rules for label usage

# In Prometheus, check if a label is actually queried
# (This requires Prometheus query logging)
```

## Practical Cardinality Budget

A rough guideline for Prometheus resource planning:

- Each time series uses about 1-2 bytes of memory per sample
- At 15-second scrape interval, that is 240 samples per hour per series
- 100,000 time series at 15s interval needs roughly 2-4 GB of RAM

If your Istio metrics alone exceed 100,000 series, it is time to start reducing cardinality.

High cardinality is a scaling problem that every growing Istio mesh encounters. The solution is a combination of removing unnecessary labels at the source, pre-aggregating with recording rules, and dropping metrics you do not use. Start measuring your cardinality now, before it becomes a problem.
