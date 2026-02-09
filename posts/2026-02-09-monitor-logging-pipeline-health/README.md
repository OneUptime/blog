# How to Monitor Logging Pipeline Health and Backpressure in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Monitoring

Description: Implement comprehensive monitoring for Kubernetes logging pipelines to detect backpressure, buffer saturation, and delivery failures before they cause log loss.

---

A failing logging pipeline is invisible until you need it most. During incidents, discovering that logs are missing or delayed makes troubleshooting impossible. Proactive monitoring of your logging pipeline health ensures you can trust your logs when it matters. This guide covers essential metrics and alerts for logging pipeline observability.

## Key Metrics to Monitor

Track these critical indicators:

**Collection Metrics**:
- Log ingestion rate (events/sec)
- Bytes read from sources
- Parse errors and failures
- File rotation handling

**Buffer Metrics**:
- Buffer utilization percentage
- Queue length and depth
- Buffer overflow events
- Oldest buffered event age

**Delivery Metrics**:
- Successful deliveries
- Failed delivery attempts
- Retry counts and backoff
- End-to-end latency

**Resource Metrics**:
- CPU and memory usage
- Disk I/O for buffers
- Network throughput
- File descriptor usage

## Monitoring Fluent Bit

Configure Fluent Bit to expose metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-monitoring-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush           5
        Daemon          off
        Log_Level       info
        HTTP_Server     On
        HTTP_Listen     0.0.0.0
        HTTP_Port       2020
        storage.metrics On

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        DB                /var/log/flb-kube.db
        Mem_Buf_Limit     5MB
        storage.type      filesystem

    [OUTPUT]
        Name                loki
        Match               kube.*
        Host                loki.logging.svc.cluster.local
        Port                3100
        Retry_Limit         5
        storage.total_limit_size 1G

    [OUTPUT]
        Name                prometheus_exporter
        Match               internal_metrics
        Host                0.0.0.0
        Port                2021
```

Scrape Fluent Bit metrics with Prometheus:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fluent-bit-metrics
  namespace: logging
  labels:
    app: fluent-bit
spec:
  ports:
  - name: metrics
    port: 2020
    targetPort: 2020
  - name: prometheus
    port: 2021
    targetPort: 2021
  selector:
    app: fluent-bit
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  endpoints:
  - port: metrics
    interval: 30s
    path: /api/v1/metrics/prometheus
```

## Essential Prometheus Queries

Monitor pipeline health with these queries:

```promql
# Ingestion rate
rate(fluentbit_input_records_total[5m])

# Buffer utilization
(fluentbit_input_storage_chunks / fluentbit_input_storage_max_chunks_up) * 100

# Failed outputs
rate(fluentbit_output_errors_total[5m])

# Retry attempts
rate(fluentbit_output_retries_total[5m])

# Parse failures
rate(fluentbit_filter_parser_errors_total[5m])

# End-to-end latency (seconds)
time() - fluentbit_input_storage_oldest_chunk_timestamp

# Memory usage percentage
(fluentbit_input_storage_memory_bytes / fluentbit_input_storage_memory_limit_bytes) * 100
```

## Detecting Backpressure

Backpressure occurs when logs arrive faster than they can be delivered. Create alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: logging-pipeline-alerts
  namespace: logging
spec:
  groups:
  - name: logging_pipeline
    interval: 30s
    rules:
    # High buffer utilization
    - alert: LoggingBufferNearFull
      expr: |
        (fluentbit_input_storage_chunks /
         fluentbit_input_storage_max_chunks_up) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Logging buffer is {{ $value | humanizePercentage }} full"
        description: "Pod {{ $labels.pod }} buffer utilization high"

    # Buffer overflow detected
    - alert: LoggingBufferOverflow
      expr: |
        rate(fluentbit_input_storage_chunks_overlimit[5m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "Logging buffer overflow detected"
        description: "Logs are being dropped due to buffer overflow"

    # High delivery failure rate
    - alert: LogDeliveryFailureHigh
      expr: |
        (rate(fluentbit_output_errors_total[5m]) /
         rate(fluentbit_output_records_total[5m])) > 0.05
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "{{ $value | humanizePercentage }} log delivery failures"

    # Backpressure detected
    - alert: LoggingBackpressureDetected
      expr: |
        increase(fluentbit_input_storage_oldest_chunk_timestamp[5m]) > 300
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Backpressure in logging pipeline"
        description: "Oldest buffered log is {{ $value }}s old"

    # Parse errors increasing
    - alert: LogParseErrorsHigh
      expr: |
        rate(fluentbit_filter_parser_errors_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High log parse error rate"

    # Fluent Bit pod restarting
    - alert: FluentBitRestartingFrequently
      expr: |
        rate(kube_pod_container_status_restarts_total{container="fluent-bit"}[1h]) > 0.1
      labels:
        severity: critical
      annotations:
        summary: "Fluent Bit pod restarting frequently"
```

## Monitoring Vector

Vector exposes comprehensive metrics:

```toml
[sources.internal_metrics]
type = "internal_metrics"

[sinks.prometheus]
type = "prometheus_exporter"
inputs = ["internal_metrics"]
address = "0.0.0.0:9090"
```

Key Vector metrics:

```promql
# Component throughput
rate(vector_component_sent_events_total[5m])

# Buffer usage
vector_buffer_byte_size / vector_buffer_max_size

# Error rate
rate(vector_component_errors_total[5m])

# Processing lag
vector_lag_time_seconds

# Resource utilization
vector_memory_used_bytes
```

## Building Health Check Dashboard

Create a comprehensive dashboard:

```json
{
  "dashboard": {
    "title": "Logging Pipeline Health",
    "panels": [
      {
        "title": "Log Ingestion Rate",
        "targets": [{
          "expr": "sum(rate(fluentbit_input_records_total[5m]))"
        }]
      },
      {
        "title": "Buffer Utilization",
        "targets": [{
          "expr": "(fluentbit_input_storage_chunks / fluentbit_input_storage_max_chunks_up) * 100"
        }],
        "thresholds": [
          {"value": 80, "color": "yellow"},
          {"value": 95, "color": "red"}
        ]
      },
      {
        "title": "Delivery Success Rate",
        "targets": [{
          "expr": "100 - (rate(fluentbit_output_errors_total[5m]) / rate(fluentbit_output_records_total[5m]) * 100)"
        }]
      },
      {
        "title": "End-to-End Latency",
        "targets": [{
          "expr": "time() - fluentbit_input_storage_oldest_chunk_timestamp"
        }]
      },
      {
        "title": "Failed Deliveries by Pod",
        "targets": [{
          "expr": "sum by (pod) (rate(fluentbit_output_errors_total[5m]))"
        }]
      },
      {
        "title": "Memory Usage",
        "targets": [{
          "expr": "container_memory_usage_bytes{pod=~\"fluent-bit.*\"}"
        }]
      }
    ]
  }
}
```

## Monitoring Loki Backend Health

Track Loki's ability to receive logs:

```promql
# Ingestion rate
rate(loki_distributor_lines_received_total[5m])

# Write failures
rate(loki_ingester_append_failures_total[5m])

# Ingester memory streams
loki_ingester_memory_streams

# Query performance
histogram_quantile(0.99, rate(loki_logql_querystats_duration_seconds_bucket[5m]))

# Distributor latency
histogram_quantile(0.95, rate(loki_request_duration_seconds_bucket{route="loki_api_v1_push"}[5m]))
```

## Synthetic Monitoring

Generate test logs to verify pipeline:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: logging-pipeline-check
  namespace: logging
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: log-generator
            image: busybox
            command:
            - /bin/sh
            - -c
            - |
              timestamp=$(date -Iseconds)
              echo "{\"timestamp\":\"$timestamp\",\"level\":\"info\",\"message\":\"synthetic_check\",\"check_id\":\"$(uuidgen)\"}"
          restartPolicy: Never
```

Query for synthetic checks:

```logql
count_over_time({message="synthetic_check"}[5m])
```

Alert if synthetic checks are missing:

```yaml
- alert: SyntheticLogsMissing
  expr: |
    count_over_time({message="synthetic_check"}[10m]) < 1
  labels:
    severity: critical
  annotations:
    summary: "Synthetic logs not reaching Loki"
```

## Best Practices

1. **Set appropriate thresholds**: Base on historical data and capacity
2. **Monitor across the pipeline**: From collection through delivery
3. **Alert on trends**: Rate of change often matters more than absolute values
4. **Test alerting**: Regularly verify alerts fire correctly
5. **Document runbooks**: Include remediation steps in alerts
6. **Track SLIs**: Define and monitor pipeline reliability SLIs
7. **Correlate with infrastructure**: Link pipeline issues to underlying problems

## Conclusion

A well-monitored logging pipeline prevents the nightmare scenario of discovering log loss during an incident. Implement comprehensive monitoring covering ingestion, buffering, and delivery, with alerts that fire before data loss occurs. Regular review of pipeline metrics helps identify capacity issues and optimize performance. Remember that your logging pipeline is critical infrastructure - treat its monitoring with the same rigor as your application monitoring.
