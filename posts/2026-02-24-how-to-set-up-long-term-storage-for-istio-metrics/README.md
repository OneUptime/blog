# How to Set Up Long-Term Storage for Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Long-Term Storage, Thanos, Monitoring

Description: How to set up long-term storage for Istio service mesh metrics beyond the default Prometheus retention, using object storage and compatible backends.

---

Prometheus stores metrics locally on disk with a default retention of 15 days. For Istio metrics, this is often not enough. You want to look at traffic trends over months, compare seasonal patterns, or investigate incidents that happened weeks ago. Long-term storage extends your metric retention from days to months or even years.

There are several approaches to long-term Istio metric storage, each with different tradeoffs around complexity, cost, and query performance.

## Why Istio Metrics Need Long-Term Storage

Istio metrics tell you how services communicate over time. Short-term data is useful for troubleshooting active issues, but long-term data enables:

- Capacity planning based on traffic growth trends
- SLA reporting over quarterly or yearly periods
- Regression detection by comparing current latency to historical baselines
- Post-incident analysis weeks after an event occurred

Without long-term storage, this data simply disappears when Prometheus rolls over its retention window.

## Option 1: Increase Prometheus Local Retention

The simplest approach is just to give Prometheus more disk and a longer retention period:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  retention: 90d
  retentionSize: 100GB
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 200Gi
```

Or in command-line flags:

```bash
prometheus \
  --storage.tsdb.retention.time=90d \
  --storage.tsdb.retention.size=100GB
```

This works for small to medium meshes. The downsides are: Prometheus memory usage grows with the amount of data stored, queries over long time ranges become slow, and you lose data if the disk fails.

## Option 2: Object Storage with Thanos

Thanos extends Prometheus by uploading metric blocks to object storage (S3, GCS, Azure Blob). This is the most popular approach for long-term Istio metrics.

The setup involves:

1. **Thanos Sidecar**: Runs alongside Prometheus and uploads completed TSDB blocks to object storage
2. **Thanos Store Gateway**: Reads blocks from object storage to serve queries
3. **Thanos Querier**: Provides a unified query interface across Prometheus and Store Gateway
4. **Thanos Compactor**: Compacts and downsamples old blocks to reduce storage costs

Add the Thanos sidecar to Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  thanos:
    objectStorageConfig:
      key: thanos.yaml
      name: thanos-objstore-config
  retention: 2d  # Keep local for 2 days, rest goes to object storage
```

Create the object storage configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: istio-system
type: Opaque
stringData:
  thanos.yaml: |
    type: S3
    config:
      bucket: istio-metrics-longterm
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      access_key: "${AWS_ACCESS_KEY_ID}"
      secret_key: "${AWS_SECRET_ACCESS_KEY}"
```

## Option 3: Remote Write to Managed Services

Cloud providers offer managed Prometheus-compatible services with built-in long-term storage:

### Grafana Cloud / Grafana Mimir

```yaml
remote_write:
- url: "https://prometheus-prod-01-prod-us-east-0.grafana.net/api/prom/push"
  basic_auth:
    username: "123456"
    password_file: "/etc/prometheus/grafana-cloud-token"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_.*|pilot_.*'
    action: keep
```

### Amazon Managed Prometheus (AMP)

```yaml
remote_write:
- url: "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxxx/api/v1/remote_write"
  sigv4:
    region: us-east-1
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_.*|pilot_.*'
    action: keep
```

### Google Cloud Managed Service for Prometheus

Google's managed Prometheus works with the standard remote write protocol or their custom collector. With remote write:

```yaml
remote_write:
- url: "https://monitoring.googleapis.com/v1/projects/my-project/location/global/prometheus/api/v1/write"
  authorization:
    type: Bearer
    credentials_file: "/etc/prometheus/gcp-token"
```

## Downsampling for Cost Optimization

Raw Istio metrics at 15-second resolution are expensive to store long-term. Downsampling reduces the resolution of older data to save storage costs.

With Thanos Compactor, you can configure automatic downsampling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-compact
spec:
  template:
    spec:
      containers:
      - name: thanos-compact
        args:
        - compact
        - --data-dir=/data
        - --objstore.config-file=/etc/thanos/objstore.yaml
        - --retention.resolution-raw=30d
        - --retention.resolution-5m=180d
        - --retention.resolution-1h=365d
        - --downsampling.disable=false
```

This keeps raw resolution for 30 days, 5-minute resolution for 180 days, and 1-hour resolution for a year. For capacity planning and trend analysis, hourly resolution is more than sufficient.

## Recording Rules for Pre-Aggregation

Recording rules in Prometheus compute and store pre-aggregated metrics. This is useful for long-term storage because you can store compact aggregated data instead of raw high-cardinality data:

```yaml
groups:
- name: istio-longterm
  interval: 5m
  rules:
  - record: istio:requests:rate5m
    expr: sum(rate(istio_requests_total[5m])) by (destination_service, source_workload, response_code)

  - record: istio:request_duration:p99_5m
    expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))

  - record: istio:request_duration:p50_5m
    expr: histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))

  - record: istio:tcp_bytes:rate5m
    expr: sum(rate(istio_tcp_sent_bytes_total[5m])) by (destination_service, source_workload)
```

Then configure remote write to only send recorded metrics to long-term storage:

```yaml
remote_write:
- url: "http://thanos-receive:19291/api/v1/receive"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio:.*'
    action: keep
```

## Storage Cost Estimation

Estimating storage costs helps you budget for long-term retention. A rough formula:

```text
daily_bytes = active_series * 2 bytes/sample * samples_per_day
monthly_bytes = daily_bytes * 30
```

For Istio with 500 active services and standard metrics:

- Active time series: ~500,000 (after relabeling)
- Samples per day at 15s interval: 5,760 per series
- Daily storage: 500,000 * 2 * 5,760 = ~5.5 GB/day uncompressed
- With Prometheus compression (~10x): ~550 MB/day
- Monthly: ~16 GB
- Yearly: ~200 GB

Object storage at typical cloud pricing ($0.023/GB/month for S3 Standard) costs about $4.60/month for a year of retention. Much cheaper than keeping Prometheus running with huge local disks.

## Querying Long-Term Data

Once your data is in long-term storage, use the same PromQL queries you normally would. With Thanos Querier:

```bash
# Query through Thanos
curl -G 'http://thanos-query:9090/api/v1/query_range' \
  --data-urlencode 'query=sum(rate(istio_requests_total[1h])) by (destination_service)' \
  --data-urlencode 'start=2026-01-01T00:00:00Z' \
  --data-urlencode 'end=2026-02-24T00:00:00Z' \
  --data-urlencode 'step=1h'
```

For Grafana, point your data source to the Thanos Querier endpoint instead of Prometheus directly.

Long-term storage for Istio metrics is worth the setup effort. The combination of remote write, downsampling, and recording rules keeps costs low while giving you months of historical data for trend analysis and capacity planning.
