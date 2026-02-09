# How to Implement RPO and RTO Targets for Observability Infrastructure Using OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Disaster Recovery, RPO, RTO

Description: Learn how to define and implement Recovery Point Objective and Recovery Time Objective targets for your OpenTelemetry-based observability infrastructure.

When your observability pipeline goes down, you lose visibility into the very systems you depend on. That makes defining RPO (Recovery Point Objective) and RTO (Recovery Time Objective) for your telemetry infrastructure just as important as defining them for your production databases.

RPO defines how much telemetry data you can afford to lose. RTO defines how quickly your observability pipeline needs to be back online. Getting these numbers wrong means flying blind during the incidents that matter most.

## Understanding RPO and RTO in the Context of Telemetry

Traditional RPO/RTO planning focuses on transactional data. Telemetry is different. Traces from 10 minutes ago still have value for root cause analysis, but metrics from 10 minutes ago might already be stale if you only care about real-time alerting. This distinction matters when you set your targets.

A reasonable starting point for most teams:

- **RPO for metrics**: 60 seconds (you can tolerate losing up to 1 minute of metric data points)
- **RPO for traces**: 5 minutes (traces are used for post-incident debugging, so slightly older data is still useful)
- **RPO for logs**: 30 seconds (logs often feed alerting pipelines)
- **RTO for the entire pipeline**: 2-5 minutes

## Configuring the OpenTelemetry Collector for RPO Compliance

The Collector's exporter retry and queue settings directly control your effective RPO. If the queue is too small, data gets dropped before your backend recovers. If retry settings are too aggressive, you overload a recovering backend.

Here is an exporter configuration that supports a 60-second RPO for metrics by using persistent queue storage:

```yaml
# collector-config.yaml
# This configuration uses a persistent file-based queue so telemetry data
# survives collector restarts. The queue size and retry settings are tuned
# to buffer roughly 60 seconds of metric data.

exporters:
  otlp/primary:
    endpoint: "primary-backend.example.com:4317"
    retry_on_failure:
      enabled: true
      initial_interval: 5s    # first retry after 5 seconds
      max_interval: 30s       # cap backoff at 30 seconds
      max_elapsed_time: 120s  # stop retrying after 2 minutes
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000        # buffer up to 5000 batches
      storage: file_storage/queue

extensions:
  file_storage/queue:
    directory: /var/lib/otelcol/queue
    timeout: 10s
    compaction:
      on_start: true
      directory: /var/lib/otelcol/queue/compact
```

The `file_storage` extension writes queued data to disk. If the collector process crashes, the data is still there when it restarts. Without this, you are relying on in-memory queues that vanish on restart.

## Measuring Your Actual RPO and RTO

Setting targets is one thing. Knowing whether you meet them is another. The OpenTelemetry Collector exposes internal metrics that you can scrape to track pipeline health. Here is a Prometheus scrape config that pulls those metrics:

```yaml
# prometheus.yaml
# Scrape the collector's own telemetry endpoint to track queue depth,
# dropped data points, and export failures. These metrics tell you whether
# your RPO targets are being met in practice.

scrape_configs:
  - job_name: 'otel-collector-internal'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8888']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'otelcol_exporter_queue_size|otelcol_exporter_send_failed_metric_points|otelcol_processor_dropped_metric_points'
        action: keep
```

The key metrics to watch are:

- `otelcol_exporter_queue_size` - if this hits your max, data is being dropped
- `otelcol_exporter_send_failed_metric_points` - tracks how many data points failed to export
- `otelcol_processor_dropped_metric_points` - data dropped before it even reaches the exporter

## Building Alerts Around RPO Violations

You should alert when your pipeline approaches an RPO violation, not after one has already happened. Here is a simple alerting rule:

```yaml
# alert-rules.yaml
# Fire a warning when the export queue is more than 80% full.
# This gives the on-call engineer time to react before data loss occurs.

groups:
  - name: otel-pipeline-rpo
    rules:
      - alert: ExporterQueueNearCapacity
        expr: otelcol_exporter_queue_size > 4000  # 80% of 5000
        for: 30s
        labels:
          severity: warning
        annotations:
          summary: "OTel exporter queue at 80% capacity"
          description: "Queue size is {{ $value }}. RPO violation likely if backend does not recover within 60 seconds."
      - alert: DataPointsDropped
        expr: rate(otelcol_exporter_send_failed_metric_points[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Metric data points are being dropped"
          description: "RPO has been violated. Investigate backend connectivity immediately."
```

## Designing for RTO

RTO is about how fast the pipeline recovers. Stateless collector deployments recover faster because there is no state to reconstruct. Running collectors as Kubernetes DaemonSets or Deployments with health checks means Kubernetes restarts failed pods automatically.

A minimal Kubernetes deployment spec with liveness probes:

```yaml
# collector-deployment.yaml
# The liveness probe checks the collector's health endpoint every 15 seconds.
# If 3 consecutive checks fail, Kubernetes restarts the pod, keeping RTO low.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          livenessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 5
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 5
            periodSeconds: 10
```

With 3 replicas and a 15-second probe interval, a single pod failure does not create any pipeline downtime. The remaining two pods handle traffic while Kubernetes replaces the failed one. Your effective RTO for single-pod failures becomes zero.

## Putting It All Together

Define your RPO and RTO targets based on what each signal type means to your operations. Configure persistent queues and retry policies to match those targets. Monitor the collector's internal metrics and alert before violations happen. Deploy collectors as stateless, replicated workloads so recovery is automatic and fast. Test these targets regularly - the worst time to discover your RPO is unrealistic is during an actual outage.
