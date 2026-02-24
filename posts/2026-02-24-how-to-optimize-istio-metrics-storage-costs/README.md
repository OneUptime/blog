# How to Optimize Istio Metrics Storage Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Prometheus, Cost Optimization, Observability

Description: Practical techniques to reduce the storage and compute costs of Istio-generated metrics without losing the observability you need.

---

Istio generates a lot of metrics. Every sidecar proxy exposes hundreds of Envoy metrics, and Istio adds its own set of standard metrics on top. If you are running Prometheus (or any metrics backend) to collect these, the storage costs can get out of hand quickly.

A cluster with 200 sidecars can easily generate 50,000-100,000 active time series just from Istio. Over weeks and months of retention, that turns into a real cost problem, especially if you are using a managed metrics service that charges by ingested data points.

Here is how to get your metrics costs under control without going blind on observability.

## Understanding Istio's Metrics Output

Istio sidecars expose metrics in two categories:

**Standard Istio metrics**: High-level request metrics like `istio_requests_total`, `istio_request_duration_milliseconds`, `istio_tcp_sent_bytes_total`, etc. These are the metrics that power the standard Istio dashboards.

**Envoy native metrics**: Low-level proxy metrics like `envoy_cluster_upstream_cx_total`, `envoy_listener_downstream_cx_active`, etc. There are hundreds of these per sidecar.

The standard Istio metrics are usually what you need. The Envoy native metrics are useful for deep debugging but expensive to store at all times.

## Step 1: Disable Envoy Stats You Do Not Need

By default, Envoy exposes a large number of internal metrics. Most teams never look at the majority of them. You can control which stats Envoy collects using `proxyStatsMatcher`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
        - "cluster.outbound"
        - "listener"
        - "http.inbound"
```

This tells Envoy to only collect metrics that match the specified prefixes. Everything else is dropped before it even reaches Prometheus.

To be more selective, use inclusion regexps:

```yaml
meshConfig:
  defaultConfig:
    proxyStatsMatcher:
      inclusionRegexps:
      - ".*upstream_rq.*"
      - ".*upstream_cx.*"
      - ".*downstream_rq.*"
      - ".*downstream_cx.*"
```

This captures connection and request metrics (the most useful ones) while dropping everything else.

## Step 2: Use Telemetry API to Control Metric Generation

Istio's Telemetry API gives you fine-grained control over which metrics are generated:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT_AND_SERVER
      tagOverrides:
        request_protocol:
          operation: REMOVE
        destination_canonical_revision:
          operation: REMOVE
        source_canonical_revision:
          operation: REMOVE
```

Each label (tag) on a metric multiplies the number of time series. Removing labels you do not use can dramatically reduce cardinality. In this example, we remove `request_protocol`, `destination_canonical_revision`, and `source_canonical_revision` from the `REQUEST_COUNT` metric.

## Step 3: Disable Metrics for Low-Value Services

Not every service needs full metrics. Internal batch jobs, cron workloads, and low-priority services can run without Istio metrics:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-metrics
  namespace: batch-jobs
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
        mode: CLIENT_AND_SERVER
      disabled: true
```

This disables all Istio metric generation for the `batch-jobs` namespace. Sidecars still provide mTLS and traffic management, just without the metrics overhead.

## Step 4: Reduce Label Cardinality

High-cardinality labels are the number one cause of metrics storage bloat. The worst offenders in Istio metrics are:

- `response_code` (creates a series for every HTTP status code)
- `destination_service` (one series per destination)
- `source_workload` and `destination_workload` (one per source-destination pair)

You cannot remove `destination_service` without losing most of the value. But you can aggregate response codes:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: optimize-labels
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
          operation: REMOVE
```

If you remove `response_code`, you can still use `response_code_class` (which groups into 2xx, 3xx, 4xx, 5xx) that Istio provides as a separate label with much lower cardinality.

## Step 5: Configure Prometheus Scrape Settings

Tune how Prometheus scrapes Istio metrics:

```yaml
# In your Prometheus configuration
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  scrape_interval: 30s
  scrape_timeout: 25s
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  metric_relabel_configs:
  # Drop high-cardinality metrics you don't need
  - source_labels: [__name__]
    regex: 'envoy_cluster_circuit_breakers_.*'
    action: drop
  - source_labels: [__name__]
    regex: 'envoy_cluster_lb_.*'
    action: drop
  - source_labels: [__name__]
    regex: 'envoy_cluster_internal_.*'
    action: drop
  # Only keep istio standard metrics and a few envoy metrics
  - source_labels: [__name__]
    regex: 'istio_.*|envoy_server_memory_allocated|envoy_server_memory_heap_size|envoy_server_live'
    action: keep
```

Increasing the scrape interval from 15s to 30s halves the number of data points stored. For most operational use cases, 30-second resolution is plenty.

The `metric_relabel_configs` section drops specific high-volume Envoy metrics and only keeps the Istio standard metrics plus a few essential Envoy metrics.

## Step 6: Use Recording Rules for Aggregation

Instead of storing raw high-cardinality metrics, create recording rules that pre-aggregate:

```yaml
groups:
- name: istio_aggregated
  interval: 1m
  rules:
  - record: istio:request_rate:1m
    expr: sum(rate(istio_requests_total[1m])) by (destination_service, response_code_class)
  - record: istio:request_duration_p99:1m
    expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[1m])) by (destination_service, le))
  - record: istio:request_errors:1m
    expr: sum(rate(istio_requests_total{response_code=~"5.."}[1m])) by (destination_service)
```

Then configure retention policies to drop the raw metrics after a short period (e.g., 2 hours) while keeping the aggregated recording rules for weeks or months.

## Step 7: Tiered Storage for Long-Term Retention

If you need months of historical Istio metrics, use tiered storage. Prometheus stores recent data locally, and long-term data goes to cheap object storage:

For Thanos:

```yaml
# thanos-sidecar configuration
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
spec:
  template:
    spec:
      containers:
      - name: thanos-sidecar
        args:
        - sidecar
        - --tsdb.path=/prometheus
        - --objstore.config-file=/etc/thanos/object-store.yaml
```

With Thanos, recent queries hit local Prometheus. Older queries transparently hit S3-compatible storage at $0.023/GB instead of keeping everything in expensive SSD-backed Prometheus storage.

## Step 8: Monitor Your Metrics Costs

Track the metrics about your metrics:

```promql
# Total active time series from Istio
count({__name__=~"istio_.*"})

# Total active time series from Envoy
count({__name__=~"envoy_.*"})

# Ingestion rate (samples per second)
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Storage size
prometheus_tsdb_storage_blocks_bytes
```

Set up alerts when time series count or ingestion rate exceeds your budget thresholds.

## Expected Savings

After implementing these optimizations:

| Optimization | Typical Reduction |
|---|---|
| Disable unused Envoy stats | 40-60% of time series |
| Remove unnecessary labels | 20-30% additional |
| Increase scrape interval to 30s | 50% of data points |
| Recording rules + short retention | 80%+ of long-term storage |
| Disable metrics for low-value namespaces | Varies |

Combined, these can reduce your Istio metrics storage costs by 80-90%.

## Summary

Istio metrics optimization is about collecting only what you need and storing it efficiently. Start by disabling Envoy stats you never query, reduce label cardinality with the Telemetry API, and use recording rules for long-term aggregation. The raw metrics are only useful for recent debugging; everything else can be pre-aggregated and stored cheaply.
