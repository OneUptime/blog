# How to Troubleshoot the Collector Slowly Accumulating Memory Until It Stops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Memory Leak, Long-Running

Description: Diagnose slow memory accumulation in long-running OpenTelemetry Collectors that leads to span rejection after weeks of uptime.

Your OpenTelemetry Collector runs fine for days. Then after two or three weeks, memory usage has crept up high enough that the memory limiter starts refusing data, or the Collector gets OOM-killed. A restart fixes it temporarily, but the cycle repeats. This is not a sudden spike; it is a slow accumulation that points to a leak somewhere in the pipeline.

## Tracking the Leak

### Step 1: Collect Memory Metrics Over Time

Set up a Prometheus scrape of the Collector's internal metrics and graph the memory over days:

```yaml
# prometheus.yml

scrape_configs:
- job_name: 'otel-collector'
  scrape_interval: 30s
  static_configs:
  - targets: ['otel-collector:8888']
```

Graph these metrics:

```text
otelcol_process_memory_rss{job="otel-collector"}
otelcol_process_runtime_heap_alloc_bytes{job="otel-collector"}
otelcol_process_runtime_total_sys_memory_bytes{job="otel-collector"}
```

If heap allocation keeps growing without settling after garbage collection, objects are being retained.

### Step 2: Take Heap Snapshots

Enable pprof and take periodic heap snapshots:

```yaml
extensions:
  pprof:
    endpoint: 0.0.0.0:1777
service:
  extensions: [pprof]
```

```bash
# Take a heap snapshot
curl -o heap1.prof http://collector:1777/debug/pprof/heap

# Take another one a day later
curl -o heap2.prof http://collector:1777/debug/pprof/heap

# Compare them
go tool pprof -diff_base=heap1.prof heap2.prof
```

The diff shows you which allocations grew between the two snapshots.

## Common Causes of Slow Accumulation

### Cause 1: Internal Metric Accumulation

The Collector tracks internal metrics about its own operation. More verbose internal telemetry can emit more dimensions, so reduce the level if profiles show self-observability overhead:

```yaml
service:
  telemetry:
    metrics:
      # Reduce internal telemetry to lower accumulation
      level: basic
```

### Cause 2: Persistent Queue Backlog

If you use the persistent sending queue, queued data is written to disk instead of only being buffered in memory. The queue and storage directory can still grow while the backend is unavailable or too slow:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otelcol/storage

exporters:
  otlp:
    sending_queue:
      enabled: true
      storage: file_storage
      queue_size: 1000

service:
  extensions: [file_storage]
```

Check `otelcol_exporter_queue_size`, `otelcol_exporter_queue_capacity`, and the queue storage directory size over time. If they keep growing, items are being queued faster than they are exported.

### Cause 3: Resource Attribute Cardinality

Resource detection adds resource attributes to telemetry. In dynamic environments, avoid overwriting existing resource attributes with the Collector host's identity, and keep detector calls bounded with a timeout:

```yaml
processors:
  resource_detection:
    detectors: [env, system, docker, gcp, ec2]
    # Set a timeout so detector calls cannot hang the pipeline
    timeout: 5s
    override: false
```

### Cause 4: Connector State Accumulation

If you use connectors (like `spanmetrics`), they maintain internal state that can grow:

```yaml
connectors:
  spanmetrics:
    # Set explicit dimensions to limit cardinality
    dimensions:
    - name: http.method
    - name: http.status_code
    # Set a metrics expiration to clean up stale entries
    metrics_expiration: 5m
    # Expire stale dimension combinations
    series_expiration: 5m
```

The `series_expiration` setting is critical for per-series cleanup. Without it, the spanmetrics connector can keep state for stale dimension combinations. `metrics_expiration` expires whole metrics after no new spans arrive for them.

## Establishing a Baseline

Before hunting for leaks, establish what normal memory usage looks like:

```bash
# Start the Collector with a clean state
# Record memory at:
# - 1 hour
# - 24 hours
# - 72 hours
# - 168 hours (1 week)
```

A healthy Collector should have memory that plateaus after the initial warmup period. If it keeps growing linearly, there is a leak.

## Automated Leak Detection

Set up an alert that detects slow growth:

```yaml
groups:
- name: collector-memory
  rules:
  - alert: CollectorMemoryCreep
    # Memory grew by more than 100MB in 24 hours
    expr: |
      (otelcol_process_memory_rss{job="otel-collector"} -
       otelcol_process_memory_rss{job="otel-collector"} offset 24h)
      > 100e6
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Collector memory grew by >100MB in 24h"
```

## Mitigation: Scheduled Restarts

While you investigate the root cause, schedule periodic restarts to prevent OOM:

```yaml
# CronJob to restart the Collector weekly
apiVersion: batch/v1
kind: CronJob
metadata:
  name: restart-collector
spec:
  schedule: "0 4 * * 0"  # Sunday at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: restart
            image: bitnami/kubectl
            command:
            - kubectl
            - rollout
            - restart
            - deployment/otel-collector
          restartPolicy: OnFailure
```

This is a band-aid, not a fix. But it keeps the Collector running while you investigate.

## Summary

Slow memory accumulation over weeks is caused by internal state that grows without bounds. Common culprits are connector state (like spanmetrics), Prometheus receiver series tracking, persistent queue backlog, and internal telemetry accumulation. Use heap profiles to identify the specific allocation, set expiration on connector state, limit internal telemetry, and schedule restarts as a safety net while investigating.
