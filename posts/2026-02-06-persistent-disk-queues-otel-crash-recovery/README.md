# How to Configure Persistent Disk-Backed Queues in the OpenTelemetry Collector for Crash Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Persistent Queues, Crash Recovery, Reliability

Description: Configure disk-backed persistent queues in the OpenTelemetry Collector so that in-flight telemetry data survives crashes and restarts.

By default, the OpenTelemetry Collector keeps its export queue in memory. When the Collector crashes or restarts, everything in that queue is gone. For most development setups this is fine, but in production you cannot afford to lose telemetry data every time a pod gets evicted or a node goes down. Persistent disk-backed queues solve this by writing queue data to disk so it survives restarts.

## How Persistent Queues Work

The OTel Collector's persistent queue uses the file_storage extension to write batched telemetry data to a local directory. When the Collector starts up, it reads any existing queue data from disk and resumes export from where it left off. This means you get crash recovery without any external dependencies like Kafka or Redis.

The storage layer uses bbolt (an embedded key-value store) under the hood. Each queued batch gets a unique key, and batches are deleted from disk only after the exporter confirms successful delivery.

## Basic Configuration

Here is the minimal configuration to enable persistent queues on an OTLP exporter.

```yaml
# otel-collector-persistent-basic.yaml
# Basic persistent queue setup for crash recovery

extensions:
  # The file_storage extension manages the on-disk queue
  file_storage/queue:
    # Directory where queue data will be stored
    directory: /var/otel/queue
    # Timeout for file operations
    timeout: 10s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp:
    endpoint: tempo.monitoring.svc:4317
    sending_queue:
      enabled: true
      # Reference the file_storage extension for persistence
      storage: file_storage/queue
      # Maximum number of batches that can be queued
      queue_size: 10000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
      max_elapsed_time: 600s

service:
  extensions: [file_storage/queue]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp]
```

## Sizing the Queue and Disk

Getting the disk size right is critical. Too small and you run out of space during an outage. Too large and you waste resources. Here is how to estimate.

```python
# estimate_queue_size.py
# Estimates the disk space needed for persistent queues

# Input: your telemetry throughput numbers
spans_per_second = 5000
avg_span_size_bytes = 500  # Average serialized span size
batch_size = 512           # Matches the batch processor send_batch_size
outage_duration_hours = 4  # How long you want to buffer during an outage

# Calculate
spans_per_hour = spans_per_second * 3600
total_spans = spans_per_hour * outage_duration_hours
total_bytes = total_spans * avg_span_size_bytes
total_gb = total_bytes / (1024 ** 3)

batches_needed = total_spans / batch_size

print(f"Spans during {outage_duration_hours}h outage: {total_spans:,}")
print(f"Estimated storage needed: {total_gb:.1f} GB")
print(f"Queue size (batches): {int(batches_needed):,}")
print(f"")
print(f"Recommendation: Set queue_size to {int(batches_needed)}")
print(f"Provision at least {total_gb * 1.5:.1f} GB of disk (1.5x buffer)")
```

Running this with the example values gives you about 3.3 GB needed for a 4-hour buffer at 5000 spans per second. Provision at least 5 GB to account for overhead.

## Production Configuration with Compaction

For production use, enable compaction to reclaim disk space from delivered batches and set up separate storage instances for each signal type.

```yaml
# otel-collector-persistent-production.yaml
# Production-grade persistent queue configuration

extensions:
  # Separate storage for each signal type to isolate failures
  file_storage/traces:
    directory: /var/otel/queue/traces
    timeout: 10s
    compaction:
      # Compact on startup to reclaim space from the previous run
      on_start: true
      # Use a separate directory for compaction temp files
      directory: /tmp/otel-compact/traces
      # Compact when more than 10MB can be reclaimed
      on_rebound: true
      rebound_needed_threshold_mib: 10
      rebound_trigger_threshold_mib: 5

  file_storage/metrics:
    directory: /var/otel/queue/metrics
    timeout: 10s
    compaction:
      on_start: true
      directory: /tmp/otel-compact/metrics
      on_rebound: true
      rebound_needed_threshold_mib: 10

  file_storage/logs:
    directory: /var/otel/queue/logs
    timeout: 10s
    compaction:
      on_start: true
      directory: /tmp/otel-compact/logs
      on_rebound: true
      rebound_needed_threshold_mib: 10

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch/traces:
    send_batch_size: 512
    timeout: 5s
  batch/metrics:
    send_batch_size: 1024
    timeout: 10s
  batch/logs:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp/traces:
    endpoint: tempo.monitoring.svc:4317
    sending_queue:
      enabled: true
      storage: file_storage/traces
      queue_size: 50000
      num_consumers: 10
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 120s

  prometheusremotewrite:
    endpoint: http://prometheus.monitoring.svc:9090/api/v1/write
    sending_queue:
      enabled: true
      storage: file_storage/metrics
      queue_size: 20000
      num_consumers: 5

  otlp/logs:
    endpoint: loki.monitoring.svc:3100
    sending_queue:
      enabled: true
      storage: file_storage/logs
      queue_size: 50000
      num_consumers: 10

service:
  extensions: [file_storage/traces, file_storage/metrics, file_storage/logs]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch/traces]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp]
      processors: [batch/metrics]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch/logs]
      exporters: [otlp/logs]
```

## Kubernetes PVC for Queue Storage

The queue directory needs to persist across pod restarts. Use a PersistentVolumeClaim.

```yaml
# k8s-collector-with-pvc.yaml
# Collector deployment with persistent volume for queue storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: otel-collector-queue
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      # Size based on your throughput and buffer duration estimate
      storage: 10Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  serviceName: otel-collector
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          volumeMounts:
            - name: queue-storage
              mountPath: /var/otel/queue
            - name: config
              mountPath: /etc/otel
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
  # StatefulSet volumeClaimTemplates give each pod its own PVC
  volumeClaimTemplates:
    - metadata:
        name: queue-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 10Gi
```

## Monitoring Queue Health

Track queue depth and disk usage to catch problems before they cause data loss.

```yaml
# queue-health-alerts.yaml
groups:
  - name: otel-persistent-queue
    rules:
      # Alert when queue disk usage is high
      - alert: OTelQueueDiskUsageHigh
        expr: |
          (1 - node_filesystem_avail_bytes{mountpoint="/var/otel/queue"}
           / node_filesystem_size_bytes{mountpoint="/var/otel/queue"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OTel queue disk is {{ $value | humanizePercentage }} full"

      # Alert when queue is not draining
      - alert: OTelQueueNotDraining
        expr: |
          otelcol_exporter_queue_size > 1000
          and delta(otelcol_exporter_queue_size[10m]) > 0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "OTel export queue is growing and not draining"
```

## Testing Crash Recovery

Verify that your persistent queue actually works by simulating a crash.

```bash
#!/bin/bash
# test_crash_recovery.sh
# Tests that the persistent queue recovers data after a crash

echo "Step 1: Check current queue depth"
QUEUE_BEFORE=$(kubectl exec -n monitoring otel-collector-0 -- \
  ls -la /var/otel/queue/traces/ | wc -l)
echo "Queue files before: $QUEUE_BEFORE"

echo "Step 2: Kill the collector pod (simulating crash)"
kubectl delete pod -n monitoring otel-collector-0 --grace-period=0 --force

echo "Step 3: Wait for pod to restart"
kubectl wait --for=condition=Ready pod/otel-collector-0 -n monitoring --timeout=60s

echo "Step 4: Check queue depth after restart"
QUEUE_AFTER=$(kubectl exec -n monitoring otel-collector-0 -- \
  ls -la /var/otel/queue/traces/ | wc -l)
echo "Queue files after restart: $QUEUE_AFTER"

if [ "$QUEUE_AFTER" -ge "$QUEUE_BEFORE" ]; then
  echo "PASS: Queue data survived the crash"
else
  echo "WARNING: Queue file count decreased - investigate"
fi
```

## Summary

Persistent disk-backed queues are the simplest way to add crash recovery to your OTel Collector without introducing external dependencies. The key decisions are sizing the disk correctly based on your throughput and desired buffer duration, using separate file_storage instances per signal type, enabling compaction to prevent disk bloat, and deploying as a StatefulSet so each pod keeps its own persistent volume. Test the crash recovery path regularly to make sure it works when you actually need it.
