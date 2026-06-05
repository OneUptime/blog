# How to Monitor Log Pipeline Throughput and Detect Log Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pipeline Monitoring, Internal Metrics, Log Loss Detection

Description: Use the OpenTelemetry Collector's internal telemetry metrics to monitor pipeline throughput, detect log loss, and alert on issues.

Your log pipeline is only useful if it actually delivers logs. A misconfigured processor, an overwhelmed exporter, or a network partition can silently drop logs, and you would never know unless you are monitoring the pipeline itself. This is the "who watches the watchers" problem, and the OpenTelemetry Collector solves it with built-in internal metrics.

This post shows you how to expose, collect, and alert on the Collector's internal telemetry to catch pipeline problems before they become blind spots.

## Enabling Internal Metrics

The OpenTelemetry Collector exposes Prometheus-format metrics about its own operation. Enable them in the `service.telemetry` section:

```yaml
service:
  telemetry:
    metrics:
      # Level controls how many metrics are emitted
      # "detailed" gives you the most visibility
      level: detailed
      # Expose internal metrics on this address
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true
    logs:
      # Collector's own log level
      level: info
```

Once enabled, you can scrape `http://collector-host:8888/metrics` with Prometheus or any compatible scraper.

## Key Metrics to Watch

Here are the internal metrics that matter most for detecting log loss and throughput issues.

### Receiver Metrics

These tell you how many log records the collector is ingesting:

```text
# Total log records accepted by the receiver
otelcol_receiver_accepted_log_records{receiver="filelog"}

# Total log records refused by the receiver
otelcol_receiver_refused_log_records{receiver="filelog"}
```

If `refused_log_records` is increasing, the collector is failing to accept logs into the pipeline. Depending on the receiver and the client's retry behavior, this can lead to upstream data loss.

### Processor Metrics

These show what happens to logs as they move through the pipeline:

```text
# Items that entered the processor
otelcol_processor_incoming_items{processor="batch"}

# Items that left the processor
otelcol_processor_outgoing_items{processor="batch"}
```

The difference between incoming and outgoing can help identify flow problems, but account for intentional filtering, routing, fan-out, and component-specific behavior before treating it as loss.

### Exporter Metrics

These are the most critical for detecting loss:

```text
# Log records successfully sent to the backend
otelcol_exporter_sent_log_records{exporter="otlp"}

# Log records that failed to send
otelcol_exporter_send_failed_log_records{exporter="otlp"}

# Log records that failed to enter the export queue
otelcol_exporter_enqueue_failed_log_records{exporter="otlp"}

# Current size of the sending queue
otelcol_exporter_queue_size{exporter="otlp"}

# Capacity of the sending queue
otelcol_exporter_queue_capacity{exporter="otlp"}
```

If `send_failed_log_records` is climbing, your backend may be rejecting data or unreachable, though retries can still prevent loss. If `queue_size` is approaching `queue_capacity`, watch `enqueue_failed_log_records`: once that climbs, data failed to enter the sending queue.

## Setting Up a Self-Monitoring Pipeline

The cleanest approach is to have the Collector scrape its own metrics and export them to your metrics backend. You can do this by adding a Prometheus receiver that targets the Collector's own metrics endpoint:

```yaml
receivers:
  # Your normal log receiver
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    start_at: end

  # Self-monitoring: scrape the collector's own metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector-self'
          scrape_interval: 15s
          static_configs:
            - targets: ['localhost:8888']

processors:
  batch:
    timeout: 5s

exporters:
  otlp/logs:
    endpoint: "https://logs-backend.example.com:4317"
  otlp/metrics:
    endpoint: "https://metrics-backend.example.com:4317"

service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp/logs]
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlp/metrics]
```

## Building Alert Rules

With the internal metrics in your metrics backend, you can write alert rules. Here are the ones I recommend starting with.

### Alert: Log Records Being Refused

```yaml
# Prometheus alerting rule
groups:
  - name: otel-collector-alerts
    rules:
      - alert: OtelCollectorRefusingLogs
        # Fires if refused logs rate exceeds 0 for 5 minutes
        expr: rate(otelcol_receiver_refused_log_records[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "OpenTelemetry Collector is refusing log records"
          description: "Receiver {{ $labels.receiver }} is refusing logs, indicating that records could not be pushed into the pipeline."
```

### Alert: Export Failures

```yaml
      - alert: OtelCollectorExportFailures
        expr: rate(otelcol_exporter_send_failed_log_records[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OpenTelemetry Collector failing to export logs"
          description: "Exporter {{ $labels.exporter }} is failing to send log records to the backend."
```

### Alert: Queue Near Capacity

```yaml
      - alert: OtelCollectorQueueNearCapacity
        expr: otelcol_exporter_queue_size / otelcol_exporter_queue_capacity > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "OpenTelemetry Collector export queue at 80% capacity"
          description: "Exporter {{ $labels.exporter }} queue is filling up. Risk of data loss increases if the backend does not recover."
```

### Alert: Throughput Drop

```yaml
      - alert: OtelCollectorThroughputDrop
        # Alert if throughput drops by more than 50% compared to the previous hour
        expr: |
          rate(otelcol_receiver_accepted_log_records[5m])
          < 0.5 * rate(otelcol_receiver_accepted_log_records[5m] offset 1h)
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Log throughput dropped significantly"
          description: "Log ingestion rate is less than half of what it was an hour ago."
```

## Building a Dashboard

A good collector monitoring dashboard should include these panels:

1. **Ingestion rate**: `rate(otelcol_receiver_accepted_log_records[1m])` - shows how many logs per second are coming in
2. **Export rate**: `rate(otelcol_exporter_sent_log_records[1m])` - shows how many are going out
3. **Loss indicator**: ingestion rate minus export rate (accounting for intentional filter drops, routing, and fan-out)
4. **Queue utilization**: `otelcol_exporter_queue_size / otelcol_exporter_queue_capacity * 100` - percentage
5. **Collector resource usage**: CPU and memory of the collector pods themselves

## Detecting Silent Data Loss

The trickiest form of log loss is when the collector accepts logs, processes them, and the exporter reports them as sent, but they never become queryable in the backend. This can happen with backend ingestion, indexing, or routing issues.

To catch this, implement end-to-end verification by periodically injecting a known "canary" log record and verifying it arrives at the backend:

```yaml
receivers:
  # Read canary logs generated by an external job
  filelog/canary:
    include:
      - /var/log/otel-canary.log
    start_at: end
```

Then run a cron job that writes a canary log with a unique ID:

```bash
# Run every minute via cron
echo "{\"canary\": true, \"id\": \"$(uuidgen)\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> /var/log/otel-canary.log
```

On the backend side, a separate monitor checks that canary logs arrive within the expected interval. If a canary goes missing, you know the pipeline has an issue that internal metrics alone might not catch.

## Wrapping Up

Monitoring your log pipeline is not optional. Without it, you are trusting that everything works perfectly all the time, and it will not. The OpenTelemetry Collector's internal metrics give you deep visibility into every stage of the pipeline. Set up the self-monitoring receiver, build alert rules for the critical failure modes, and add a canary check for end-to-end validation. When something breaks, you will know about it in minutes instead of discovering it days later during an incident.
