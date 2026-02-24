# How to Configure Metrics Retention for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Prometheus, Retention, Monitoring, Kubernetes

Description: How to configure and tune metrics retention policies for Istio metrics in Prometheus, Thanos, and other storage backends.

---

Istio generates a lot of metrics. Every single request flowing through the mesh produces data points across multiple metric series, and when you multiply that by the number of services, pods, and unique label combinations in your cluster, the storage requirements add up fast. If you do not have a retention strategy in place, you will either run out of disk space or accumulate a massive cloud storage bill.

This guide covers how to configure metrics retention for Istio metrics across different storage backends, and how to reduce the volume of data without losing the visibility you need.

## Understanding Istio Metric Volume

Before configuring retention, it helps to understand the scope of the problem. A single Envoy sidecar exposes hundreds of metric series. The most commonly used ones are:

- `istio_requests_total` - One time series per unique combination of source, destination, response code, and other labels
- `istio_request_duration_milliseconds` - A histogram with multiple bucket series per combination
- `istio_request_bytes` and `istio_response_bytes` - More histograms

For a cluster with 50 services, each talking to 5-10 other services, you could easily have 50,000+ active time series just from Istio. Histograms make this worse because each histogram has multiple bucket series.

## Configuring Retention in Prometheus

If you are using Prometheus to store Istio metrics (which is the default setup for most Istio installations), retention is controlled by Prometheus startup flags.

For a Prometheus instance deployed with the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 2
  retention: 15d
  retentionSize: 50GB

  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: gp3
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi

  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      memory: 4Gi
```

The key fields are:

- `retention: 15d` - Keep data for 15 days. After that, it gets deleted.
- `retentionSize: 50GB` - Even if 15 days have not passed, start deleting oldest data if total size exceeds 50GB. This acts as a safety valve.

If you are running Prometheus directly (not through the operator), set these flags:

```bash
prometheus \
  --storage.tsdb.retention.time=15d \
  --storage.tsdb.retention.size=50GB \
  --storage.tsdb.path=/prometheus/data
```

## Choosing the Right Retention Period

The right retention period depends on your use case:

- **7 days** - Good for active debugging and recent trend analysis. Most operational issues are investigated within hours or days.
- **15 days** - A reasonable default. Covers two-week sprint cycles and gives enough history for week-over-week comparisons.
- **30 days** - Needed if you do monthly reporting or need to investigate issues that happen on a monthly cycle.
- **90+ days** - Usually handled by a long-term storage backend rather than Prometheus itself.

For Istio metrics specifically, 15 days of raw data is usually sufficient. For longer-term analysis, use recording rules to pre-aggregate and downsample.

## Reducing Metric Volume with Recording Rules

Instead of keeping raw high-resolution data for long periods, use Prometheus recording rules to create pre-aggregated metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-aggregated
      interval: 1m
      rules:
        # Request rate per service (1m window)
        - record: istio:request_rate_1m
          expr: |
            sum(rate(istio_requests_total[1m])) by (
              destination_service,
              destination_workload,
              source_workload,
              response_code
            )

        # Error rate per service
        - record: istio:error_rate_1m
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.."}[1m])) by (
              destination_service,
              destination_workload
            )
            /
            sum(rate(istio_requests_total[1m])) by (
              destination_service,
              destination_workload
            )

        # P99 latency per service (5m window for stability)
        - record: istio:request_duration_p99_5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (
                destination_service,
                le
              )
            )

        # P50 latency per service
        - record: istio:request_duration_p50_5m
          expr: |
            histogram_quantile(0.50,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (
                destination_service,
                le
              )
            )
```

These recorded metrics use far less storage because they have fewer labels and are already aggregated. You can keep these for 90 days while only keeping raw metrics for 15 days.

## Long-Term Storage with Thanos

For longer retention, Thanos is the most common companion to Prometheus. It uploads Prometheus blocks to object storage (S3, GCS, etc.) and lets you query across long time ranges.

Configure the Thanos sidecar with Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  retention: 6h  # Keep only 6 hours locally

  thanos:
    baseImage: quay.io/thanos/thanos
    version: v0.34.0
    objectStorageConfig:
      key: thanos.yaml
      name: thanos-objstore-config
```

Create the object storage config:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
stringData:
  thanos.yaml: |
    type: S3
    config:
      bucket: my-thanos-metrics
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
```

Then configure Thanos compaction and downsampling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: thanos-compactor
  template:
    spec:
      containers:
        - name: compactor
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - compact
            - --data-dir=/data
            - --objstore.config-file=/etc/thanos/thanos.yaml
            - --retention.resolution-raw=30d
            - --retention.resolution-5m=90d
            - --retention.resolution-1h=365d
            - --downsample.concurrency=2
            - --wait
```

This gives you three tiers of retention:

- Raw resolution (same as scrape interval): 30 days
- 5-minute resolution (downsampled): 90 days
- 1-hour resolution (further downsampled): 1 year

## Dropping Unnecessary Metrics

Another effective way to manage retention is to stop collecting metrics you never use. Configure this through Istio's Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
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
            metric: REQUEST_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: TCP_OPENED_CONNECTIONS
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: TCP_CLOSED_CONNECTIONS
            mode: CLIENT_AND_SERVER
          disabled: true
```

This stops Envoy from even generating those metrics, saving both CPU on the sidecar and storage in Prometheus.

You can also drop specific labels using tag overrides:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: drop-labels
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            request_protocol:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
```

Removing even one high-cardinality label can reduce your time series count significantly.

## Monitoring Your Metrics Storage

Keep an eye on how much storage Istio metrics consume:

```bash
# Check Prometheus TSDB status
curl -s http://localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[] | select(.name | startswith("istio_"))'

# Check total storage used
curl -s http://localhost:9090/api/v1/status/tsdb | jq '.data.headStats'
```

The right retention configuration balances operational needs with cost. Start with a shorter retention period and extend it only if you find yourself needing older data regularly. For most teams, 15 days of raw Istio metrics plus 90 days of pre-aggregated data covers all reasonable use cases.
