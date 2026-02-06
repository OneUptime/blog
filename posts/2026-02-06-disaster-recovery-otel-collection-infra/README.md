# How to Design a Disaster Recovery Plan for Your OpenTelemetry Collection Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Disaster Recovery, Infrastructure, Reliability

Description: Design a disaster recovery plan for your OpenTelemetry collection infrastructure covering failover, backups, and recovery procedures.

Your OpenTelemetry collection infrastructure is a critical dependency for incident response, debugging, and compliance. When the Collector fleet goes down, you lose visibility exactly when you need it most. Yet most teams treat their telemetry pipeline as a second-class citizen when it comes to disaster recovery planning. This post walks through designing a practical DR plan for your OTel collection infrastructure.

## Identifying What Can Go Wrong

Start by cataloging failure modes specific to OTel infrastructure:

- **Collector pod crashes** - OOM kills, config errors, or node failures
- **Backend unavailability** - Prometheus, Loki, or Tempo become unreachable
- **Network partitions** - Collectors cannot reach exporters across regions
- **Storage exhaustion** - Persistent queues fill up disk space
- **Certificate expiration** - TLS certs expire, breaking encrypted channels
- **Configuration corruption** - Bad config pushed via GitOps

Each failure mode needs a detection mechanism, a mitigation strategy, and a recovery procedure.

## Recovery Time and Recovery Point Objectives

Define your RTO and RPO for telemetry data. Be realistic - most organizations land here:

- **RTO (Recovery Time Objective)**: 5-15 minutes for collection to resume
- **RPO (Recovery Point Objective)**: Less than 2 minutes of data loss during a failure

These numbers drive your architecture decisions. A 2-minute RPO means you need persistent queues. A 5-minute RTO means you need automated failover.

## Collector Health Monitoring

You cannot recover from what you cannot detect. Set up health monitoring for the Collectors themselves.

```yaml
# otel-collector-self-monitoring.yaml
# Collector config that exposes its own health metrics

extensions:
  # Health check endpoint for Kubernetes liveness/readiness probes
  health_check:
    endpoint: 0.0.0.0:13133
    path: "/health"

  # Expose Collector internal metrics via Prometheus
  zpages:
    endpoint: 0.0.0.0:55679

receivers:
  # Scrape the Collector's own Prometheus metrics
  prometheus/self:
    config:
      scrape_configs:
        - job_name: 'otel-collector-self'
          scrape_interval: 15s
          static_configs:
            - targets: ['localhost:8888']

  # Normal OTLP receiver for application telemetry
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  # Export self-monitoring metrics to a separate Prometheus
  prometheusremotewrite/self:
    endpoint: http://prometheus-meta.monitoring.svc:9090/api/v1/write

  otlp/backend:
    endpoint: tempo.monitoring.svc:4317

service:
  extensions: [health_check, zpages]
  pipelines:
    # Self-monitoring pipeline
    metrics/self:
      receivers: [prometheus/self]
      exporters: [prometheusremotewrite/self]
    # Application telemetry pipeline
    traces:
      receivers: [otlp]
      exporters: [otlp/backend]
```

## Critical Alerts for Collector Health

Set up alerts that fire before data loss occurs.

```yaml
# collector-alerts.yaml
# Prometheus alerting rules for OTel Collector health
groups:
  - name: otel-collector-dr
    rules:
      # Alert when the sending queue is filling up
      - alert: OTelCollectorQueueBackpressure
        expr: otelcol_exporter_queue_size / otelcol_exporter_queue_capacity > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Collector export queue is {{ $value | humanizePercentage }} full"
          runbook: "https://wiki.internal/runbooks/otel-queue-backpressure"

      # Alert when export failures exceed threshold
      - alert: OTelCollectorExportFailures
        expr: rate(otelcol_exporter_send_failed_spans_total[5m]) > 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Collector is failing to export spans"

      # Alert when collector pods are restarting
      - alert: OTelCollectorCrashLoop
        expr: increase(kube_pod_container_status_restarts_total{container="otel-collector"}[15m]) > 2
        labels:
          severity: critical
        annotations:
          summary: "OTel Collector is crash-looping"

      # Alert when no data flows through the collector
      - alert: OTelCollectorNoData
        expr: rate(otelcol_receiver_accepted_spans_total[5m]) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No spans received by collector for 5 minutes"
```

## Persistent Queue Configuration

Persistent queues are your first line of defense against data loss during backend outages. They survive Collector restarts.

```yaml
# otel-collector-persistent-queue.yaml
# Exporter config with disk-backed persistent queue

extensions:
  file_storage/queue:
    directory: /var/otel/queue
    timeout: 10s
    # Compact the storage periodically to reclaim disk space
    compaction:
      on_start: true
      directory: /tmp/otel-compaction

exporters:
  otlp/primary:
    endpoint: tempo-primary.monitoring.svc:4317
    sending_queue:
      enabled: true
      # Use file_storage so the queue survives restarts
      storage: file_storage/queue
      queue_size: 10000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 120s
      max_elapsed_time: 600s
    timeout: 30s

service:
  extensions: [file_storage/queue]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/primary]
```

## Automated Failover with a Secondary Backend

Configure a failover exporter so data routes to a backup backend when the primary is down.

```yaml
# otel-collector-failover.yaml
# Dual-export with failover to a secondary backend

exporters:
  otlp/primary:
    endpoint: tempo-primary.monitoring.svc:4317
    sending_queue:
      enabled: true
      storage: file_storage/queue
    retry_on_failure:
      enabled: true
      max_elapsed_time: 120s

  otlp/secondary:
    endpoint: tempo-secondary.monitoring.svc:4317
    sending_queue:
      enabled: true
      storage: file_storage/queue_secondary
    retry_on_failure:
      enabled: true

processors:
  # Use the failover connector to switch backends on failure
  # Alternatively, export to both simultaneously
  batch:
    send_batch_size: 512
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      # Export to both - secondary acts as hot standby
      exporters: [otlp/primary, otlp/secondary]
```

## Recovery Runbook

Document your recovery procedures. Here is a template for the most common scenario - Collector fleet recovery after a node failure.

```bash
#!/bin/bash
# runbook_collector_recovery.sh
# Recovery steps for OTel Collector fleet after node/zone failure

echo "=== OTel Collector Recovery Runbook ==="
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 1: Assess current state
echo "[1/5] Checking collector pod status..."
kubectl get pods -n monitoring -l app=otel-collector -o wide

# Step 2: Check for persistent queue data on surviving nodes
echo "[2/5] Checking persistent queue volumes..."
kubectl get pvc -n monitoring -l app=otel-collector

# Step 3: Force reschedule collectors if needed
echo "[3/5] Verifying replica count matches desired state..."
DESIRED=$(kubectl get deployment otel-collector -n monitoring \
  -o jsonpath='{.spec.replicas}')
READY=$(kubectl get deployment otel-collector -n monitoring \
  -o jsonpath='{.status.readyReplicas}')
echo "Desired: $DESIRED, Ready: $READY"

if [ "$READY" -lt "$DESIRED" ]; then
  echo "Collectors are recovering. Waiting 60s..."
  kubectl rollout status deployment/otel-collector -n monitoring --timeout=60s
fi

# Step 4: Verify data flow resumed
echo "[4/5] Checking for recent data in backend..."
SPAN_COUNT=$(curl -s "http://prometheus-meta.monitoring.svc:9090/api/v1/query" \
  --data-urlencode "query=rate(otelcol_receiver_accepted_spans_total[2m])" \
  | jq '.data.result[0].value[1]' -r)
echo "Current span ingestion rate: $SPAN_COUNT spans/sec"

# Step 5: Check queue drain status
echo "[5/5] Checking queue drain progress..."
QUEUE_SIZE=$(curl -s "http://prometheus-meta.monitoring.svc:9090/api/v1/query" \
  --data-urlencode "query=otelcol_exporter_queue_size" \
  | jq '.data.result[0].value[1]' -r)
echo "Current queue depth: $QUEUE_SIZE"

echo ""
echo "Recovery assessment complete."
```

## Summary

A solid disaster recovery plan for OpenTelemetry collection infrastructure has four pillars: detection through self-monitoring and alerts, prevention through persistent queues and redundant backends, automated failover so recovery happens without manual intervention, and documented runbooks for scenarios that require human judgment. Test your DR plan regularly - run a chaos engineering exercise that kills Collector pods during peak traffic, and verify that data loss stays within your RPO target.
