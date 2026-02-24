# How to Estimate Prometheus Storage for Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Monitoring, Storage, Metrics

Description: A detailed guide to estimating Prometheus storage requirements for Istio metrics based on cardinality, scrape intervals, and retention policies.

---

Istio generates a lot of metrics. Every sidecar proxy exposes detailed information about requests, responses, latencies, TCP connections, and more. Prometheus happily scrapes all of it, and before you know it, your Prometheus server is running out of disk space or getting slow because the time series database has grown beyond what the underlying storage can handle efficiently.

Planning your Prometheus storage for Istio is not optional. It is something you need to get right before going to production.

## Understanding Istio's Metric Cardinality

The core problem with Istio metrics and Prometheus is cardinality. Cardinality is the total number of unique time series. Each unique combination of metric name and label values creates a separate time series.

Istio's standard metrics include labels like:

- `source_workload`
- `source_workload_namespace`
- `destination_workload`
- `destination_workload_namespace`
- `destination_service`
- `response_code`
- `request_protocol`
- `connection_security_policy`
- `source_canonical_service`
- `destination_canonical_service`

The cardinality scales with the cross-product of these labels. If you have 100 services, each talking to 5 other services, with 5 common response codes:

```
Cardinality per metric = Sources x Destinations x Response_Codes x Protocols
                      = 100 x 5 x 5 x 2
                      = 5,000 time series per metric
```

Istio exports about 10-15 key metrics by default:

- `istio_requests_total`
- `istio_request_duration_milliseconds` (histogram with multiple buckets)
- `istio_request_bytes` (histogram)
- `istio_response_bytes` (histogram)
- `istio_tcp_sent_bytes_total`
- `istio_tcp_received_bytes_total`
- `istio_tcp_connections_opened_total`
- `istio_tcp_connections_closed_total`

Histograms are the expensive ones. A histogram with the default 20 buckets generates 20+2 time series (one per bucket plus sum and count) for each unique label combination.

```
For istio_request_duration_milliseconds:
5,000 label combinations x 22 histogram series = 110,000 time series

For all histogram metrics (3 histograms):
110,000 x 3 = 330,000 time series

For all counter metrics (5 counters):
5,000 x 5 = 25,000 time series

Total: ~355,000 time series
```

And that is just for 100 services. Scale to 500 services and the numbers get wild.

## Checking Current Cardinality

If you already have Istio and Prometheus running, check your actual cardinality:

```promql
# Total time series in Prometheus
prometheus_tsdb_head_series

# Time series from Istio specifically
count({__name__=~"istio_.*"})

# Cardinality per Istio metric
count by (__name__) ({__name__=~"istio_.*"})

# Top label cardinality contributors
topk(10, count by (__name__)({__name__=~"istio_.*"}))
```

From the command line:

```bash
# TSDB stats via Prometheus API
curl -s http://prometheus:9090/api/v1/status/tsdb | jq '.data.headStats'
```

## The Storage Calculation

Prometheus stores each sample (a timestamp + value pair) using approximately 1-2 bytes with compression (Prometheus uses a very efficient compression scheme called Gorilla encoding).

**Formula:**

```
Storage = Time_Series x Samples_Per_Series x Bytes_Per_Sample x Retention_Period

Where:
  Samples_Per_Series = Retention_Seconds / Scrape_Interval_Seconds
  Bytes_Per_Sample = 1.5 bytes (compressed average)
```

**Example with 355,000 time series, 15s scrape interval, 15 days retention:**

```
Samples_Per_Series = (15 x 24 x 3600) / 15 = 86,400 samples

Storage = 355,000 x 86,400 x 1.5 bytes
Storage = 46,008,000,000 bytes
Storage = ~43 GB
```

Add 20% overhead for indexes and WAL (write-ahead log):

```
Total storage: 43 GB x 1.2 = ~52 GB
```

## Storage Estimation Table

| Mesh Size (services) | Estimated Time Series | 7-day Storage | 15-day Storage | 30-day Storage |
|---|---|---|---|---|
| 50 | 90,000 | 7 GB | 15 GB | 30 GB |
| 100 | 355,000 | 26 GB | 52 GB | 104 GB |
| 250 | 1,500,000 | 110 GB | 220 GB | 440 GB |
| 500 | 5,000,000 | 365 GB | 730 GB | 1.4 TB |

These numbers assume default Istio metrics with histogram buckets and a 15-second scrape interval.

## Reducing Storage Requirements

### 1. Reduce Histogram Buckets

The default Envoy histogram buckets create many time series. You can customize them:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "istio_requests"
          - "istio_request_duration"
```

### 2. Drop High-Cardinality Labels

Remove labels you do not need:

```yaml
apiVersion: networking.istio.io/v1
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
            request_protocol:
              operation: REMOVE
            source_canonical_revision:
              operation: REMOVE
            destination_canonical_revision:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
```

This can reduce cardinality by 50-80% depending on your label diversity.

### 3. Increase Scrape Interval

Changing from 15s to 30s cuts storage in half:

```yaml
# In your Prometheus config
scrape_configs:
  - job_name: 'envoy-stats'
    metrics_path: /stats/prometheus
    scrape_interval: 30s
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: istio-proxy
```

### 4. Use Recording Rules to Aggregate

Pre-aggregate metrics and drop the raw high-cardinality data:

```yaml
groups:
  - name: istio-aggregation
    interval: 30s
    rules:
      - record: istio:request_rate:by_destination
        expr: sum(rate(istio_requests_total[5m])) by (destination_service, response_code)
      - record: istio:request_duration:p99_by_destination
        expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
```

Then use metric relabeling to drop the raw metrics after a short retention:

```yaml
# In Prometheus config - drop raw istio histogram metrics
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_request_duration_milliseconds_bucket'
    action: drop
```

### 5. Use Remote Storage

For long-term retention, send metrics to a remote storage backend like Thanos, Cortex, or Grafana Mimir instead of keeping everything locally:

```yaml
# Prometheus remote write config
remote_write:
  - url: "http://thanos-receive:19291/api/v1/receive"
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'istio_.*'
        action: keep
```

## Provisioning the Storage

Based on your estimate, provision persistent storage for Prometheus:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-storage
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
```

Use SSD-backed storage classes. Prometheus performance degrades significantly on spinning disks due to the random I/O patterns of compaction.

## Monitoring Prometheus Itself

Keep an eye on Prometheus health:

```promql
# Current disk usage
prometheus_tsdb_storage_blocks_bytes

# Ingestion rate
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Series churn (high churn = something is wrong)
rate(prometheus_tsdb_head_series_created_total[5m])

# Compaction duration
prometheus_tsdb_compaction_duration_seconds
```

Set up alerts for when storage is running low:

```yaml
- alert: PrometheusStorageLow
  expr: prometheus_tsdb_storage_blocks_bytes / prometheus_tsdb_retention_limit_bytes > 0.8
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Prometheus storage usage above 80%"
```

Plan your Prometheus storage before deploying Istio, not after you get paged at 3 AM because your monitoring system ran out of disk.
