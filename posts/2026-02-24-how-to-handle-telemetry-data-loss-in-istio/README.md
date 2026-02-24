# How to Handle Telemetry Data Loss in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Data Loss, Observability, Troubleshooting

Description: A hands-on guide to detecting, diagnosing, and recovering from telemetry data loss in Istio service mesh environments.

---

You are staring at a Grafana dashboard and something looks wrong. The request rate graph has gaps, or worse, it dropped to zero for a service you know was handling traffic. Telemetry data loss in Istio is a real problem that hits most teams at some point. The frustrating part is that it often happens silently, and you only notice when you need the data to debug something else.

Data loss can happen at multiple points in the pipeline: the Envoy proxy might stop reporting, Prometheus might fail to scrape, the storage might drop samples, or the network between components might have issues. Figuring out where data went missing is the first step to fixing it.

## Detecting Data Loss

Before you can fix data loss, you need to detect it. Set up automated detection that catches gaps early.

Check for gaps in expected metrics:

```bash
# Query Prometheus for time series that suddenly stopped reporting
curl -s "http://prometheus:9090/api/v1/query?query=changes(up{job='kubernetes-pods'}[1h])" | \
  jq '.data.result[] | select(.value[1] | tonumber > 2)'
```

Use the `absent` function in Prometheus to detect missing metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: data-loss-detection
  namespace: monitoring
spec:
  groups:
    - name: data-loss
      rules:
        - alert: IstioMetricsMissing
          expr: |
            absent(istio_requests_total{reporter="destination"})
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "No Istio request metrics are being reported"
        - alert: IstioMetricsGap
          expr: |
            (time() - timestamp(istio_requests_total)) > 120
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Istio metrics are stale (older than 2 minutes)"
```

## Common Causes and Fixes

### Sidecar OOM Kills

Envoy sidecars have memory limits. When they exceed those limits, Kubernetes kills them, and you lose any buffered telemetry data.

Check for OOM events:

```bash
kubectl get events --all-namespaces --field-selector reason=OOMKilled | grep istio-proxy
```

Look at sidecar resource usage:

```bash
kubectl top pods -n your-namespace --containers | grep istio-proxy
```

Fix by increasing sidecar memory limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/proxyMemory: "256Mi"
    spec:
      containers:
        - name: app
          image: your-app:latest
```

Or set it globally in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
```

### Prometheus Scrape Failures

Prometheus scrapes each pod's metrics endpoint every 15 seconds by default. If scrapes fail, you get gaps.

Check scrape target status:

```bash
curl -s http://prometheus:9090/api/v1/targets | \
  jq '.data.activeTargets[] | select(.health != "up") | {
    endpoint: .scrapeUrl,
    error: .lastError,
    lastScrape: .lastScrape
  }'
```

Common scrape failure reasons include network policies blocking access, pods being in a CrashLoopBackOff state, or the scrape timeout being too short.

Increase scrape timeout if needed:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: istio-proxies
  namespace: monitoring
spec:
  selector:
    matchExpressions:
      - key: security.istio.io/tlsMode
        operator: Exists
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
      scrapeTimeout: 10s
```

### Prometheus Storage Full

When Prometheus runs out of disk space, it stops ingesting new data. This is a silent killer.

```bash
kubectl exec -n monitoring prometheus-0 -- df -h /prometheus
```

Set up an alert:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: prometheus-storage
  namespace: monitoring
spec:
  groups:
    - name: storage
      rules:
        - alert: PrometheusStorageFull
          expr: |
            (prometheus_tsdb_storage_blocks_bytes + prometheus_tsdb_head_chunks_created_total)
            / prometheus_tsdb_retention_limit_bytes > 0.9
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus storage is above 90% full"
```

### Trace Data Loss at the Collector

Trace collectors like Jaeger or OpenTelemetry Collector have internal queues. When these queues fill up, data gets dropped.

Check the OTel Collector for dropped data:

```bash
kubectl exec -n observability deploy/otel-collector -- \
  curl -s localhost:8888/metrics | grep -E "(dropped|failed|refused)"
```

Increase the queue size and add retry logic:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    exporters:
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true
        sending_queue:
          enabled: true
          num_consumers: 10
          queue_size: 5000
        retry_on_failure:
          enabled: true
          initial_interval: 5s
          max_interval: 30s
          max_elapsed_time: 300s
```

## Recovering from Data Loss

Once you have fixed the root cause, you might need to backfill data. For metrics, Prometheus does not support backfilling directly, but you can use recording rules to reconstruct some derived metrics.

Create a recording rule that fills gaps using available data:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gap-filling
  namespace: monitoring
spec:
  groups:
    - name: gap-recovery
      interval: 15s
      rules:
        - record: istio_requests:rate5m_recovered
          expr: |
            rate(istio_requests_total[5m])
            or
            rate(istio_requests_total[15m])
```

The `or` operator in PromQL returns the right side when the left side has no data, effectively using a longer window to smooth over gaps.

## Building Resilience into the Pipeline

Prevent future data loss by making the pipeline more resilient.

Add a write-ahead log or buffer in the collection layer:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      batch:
        send_batch_size: 1024
        timeout: 5s
        send_batch_max_size: 2048
    exporters:
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true
        sending_queue:
          enabled: true
          storage: file_storage
          queue_size: 10000
    extensions:
      file_storage:
        directory: /var/lib/otelcol/queue
    service:
      extensions: [file_storage]
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp]
```

For Prometheus, consider running it in high-availability mode with two replicas scraping the same targets:

```yaml
prometheus:
  prometheusSpec:
    replicas: 2
    replicaExternalLabelName: "__replica__"
    prometheusExternalLabelName: "cluster"
```

Use Thanos or similar to deduplicate data from the two replicas:

```bash
thanos query \
  --store=prometheus-0:10901 \
  --store=prometheus-1:10901 \
  --query.replica-label="__replica__"
```

## Data Loss Incident Checklist

When you detect data loss, work through this checklist:

```bash
# 1. Check if sidecars are running
kubectl get pods -A -o json | \
  jq '.items[] | select(.spec.containers[].name == "istio-proxy") |
  select(.status.containerStatuses[] | select(.name == "istio-proxy") | .ready == false) | .metadata.name'

# 2. Check Prometheus scrape targets
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets | length'

# 3. Check Prometheus storage
kubectl exec -n monitoring prometheus-0 -- df -h /prometheus

# 4. Check for OOM events
kubectl get events -A --field-selector reason=OOMKilled --sort-by='.lastTimestamp' | tail -20

# 5. Check collector health
kubectl logs -n observability deploy/otel-collector --tail=50
```

Data loss in telemetry is not an edge case. It is something that will happen, and your job is to detect it quickly and have a playbook ready. Build detection first, then add resilience. The combination of proper alerting and a robust pipeline means that even when things go wrong, the blast radius stays small.
