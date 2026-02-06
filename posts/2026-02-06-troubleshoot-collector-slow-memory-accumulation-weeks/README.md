# How to Troubleshoot the Collector Slowly Accumulating Memory Until It Stops Receiving Spans After Weeks

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

```
process_resident_memory_bytes{job="otel-collector"}
go_memstats_heap_inuse_bytes{job="otel-collector"}
go_memstats_heap_objects{job="otel-collector"}
```

If `heap_objects` keeps growing, objects are being allocated but not freed.

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

The Collector tracks internal metrics about its own operation. Some of these metrics (like per-exporter stats) can accumulate unique label combinations over time:

```yaml
service:
  telemetry:
    metrics:
      # Reduce internal telemetry to lower accumulation
      level: basic
```

### Cause 2: Persistent Queue Metadata

If you use the persistent sending queue, metadata about queued items stays in memory even after the items are exported:

```yaml
exporters:
  otlp:
    sending_queue:
      enabled: true
      storage: file_storage
      queue_size: 1000
```

Check the queue storage directory size over time. If it keeps growing, items are being queued faster than they are exported.

### Cause 3: Resource Detection Caching

Resource detectors cache information about the environment. In dynamic environments (like Kubernetes with frequent pod churn), the cache can grow:

```yaml
processors:
  resourcedetection:
    detectors: [env, system, docker, gcp, aws]
    # Set a timeout to prevent stale cache growth
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
```

The `metrics_expiration` setting is critical. Without it, the spanmetrics connector keeps state for every unique attribute combination it has ever seen.

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
      (process_resident_memory_bytes{job="otel-collector"} -
       process_resident_memory_bytes{job="otel-collector"} offset 24h)
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

Slow memory accumulation over weeks is caused by internal state that grows without bounds. Common culprits are connector state (like spanmetrics), Prometheus receiver series tracking, persistent queue metadata, and internal telemetry accumulation. Use heap profiles to identify the specific allocation, set expiration on connector state, limit internal telemetry, and schedule restarts as a safety net while investigating.
