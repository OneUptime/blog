# How to Monitor OTel Arrow Stream Health and Compression Ratios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Monitoring, Metric

Description: Monitor OTel Arrow stream health and compression ratios using the OpenTelemetry Collector's internal metrics.

You have deployed OTel Arrow in your telemetry pipeline. How do you know it is working well? The OpenTelemetry Collector exposes internal metrics that give you visibility into Arrow stream behavior, compression ratios, errors, and throughput. This post covers which metrics to monitor, how to set up dashboards for them, and what alert thresholds to configure.

## Enabling Collector Internal Metrics

The Collector exposes its own metrics via a Prometheus endpoint. Enable it in your Collector configuration:

```yaml
service:
  telemetry:
    metrics:
      level: detailed    # Use 'detailed' for Arrow-specific metrics
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true
```

The `detailed` level is important if you want the full set of Arrow-related byte counters. The `basic` level only includes essential Collector telemetry and does not include the otelarrow component's network-level metrics.

## Key Metrics to Monitor

### Compression Ratio

This is the most important metric for validating that OTel Arrow is delivering value:

```promql
# Current compression ratio (higher is better)

# A ratio of 5.0 means the data is 5x smaller after Arrow + compression
rate(otelcol_exporter_sent{exporter="otelarrow"}[5m])
/
rate(otelcol_exporter_sent_wire{exporter="otelarrow"}[5m])
```

Expected values:
- 3-5: Modest compression. Data has high cardinality or small batch sizes.
- 5-8: Good compression. Typical for microservices with standard attributes.
- 8-12: Excellent compression. Data has highly repetitive attributes and large batches.

If the compression ratio drops below 3, investigate whether batch sizes have decreased or whether new high-cardinality attributes were added.

### Exporter Wire Bytes

```promql
# Uncompressed bytes sent by the Arrow exporter
rate(otelcol_exporter_sent{exporter="otelarrow"}[5m])

# Compressed bytes sent on the wire
rate(otelcol_exporter_sent_wire{exporter="otelarrow"}[5m])
```

Use these together to validate bandwidth savings. The `sent` metric is measured before compression, and `sent_wire` is measured after compression.

### Stream Shutdown Errors

```promql
# Failed export attempts can indicate abrupt stream shutdowns
rate(otelcol_exporter_send_failed_spans{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_metric_points{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_log_records{exporter="otelarrow"}[5m])
```

Expected behavior:
```text
Streams should close cleanly when arrow.max_stream_lifetime is lower than the receiver
or proxy keepalive limit.
```

If failed exports rise around stream lifetime boundaries, streams may be terminated before their configured lifetime. Check `arrow.max_stream_lifetime`, receiver keepalive settings, load balancer timeouts, and receiver-side connection limits.

### Bytes Sent and Received

```promql
# Bytes sent by the Arrow exporter (compressed)
rate(otelcol_exporter_sent_wire{exporter="otelarrow"}[5m])

# Compare with what standard OTLP would send
# (If you have a parallel otelarrow exporter with arrow.disabled: true)
rate(otelcol_exporter_sent_wire{exporter="otelarrow/otlp_baseline"}[5m])
```

### Error Rates

```promql
# Export failures
rate(otelcol_exporter_send_failed_spans{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_metric_points{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_log_records{exporter="otelarrow"}[5m])

# Receiver admission pressure
otelcol_otelarrow_admission_waiting_bytes{receiver="otelarrow"}
```

Any non-zero error rate needs investigation. Common causes:
- `RESOURCE_EXHAUSTED`: The receiver's Arrow or admission memory limit was hit. Increase `arrow.memory_limit_mib`, `admission.request_limit_mib`, or receiver capacity.
- `stream_terminated`: The gRPC stream was closed unexpectedly. Check keepalive settings.
- `encoding_error`: The Arrow encoder encountered data it could not encode. This is usually a bug; report it.

## Building a Dashboard

Here is a Grafana dashboard JSON snippet covering the essential panels:

```json
{
  "panels": [
    {
      "title": "Arrow Compression Ratio",
      "type": "stat",
      "targets": [{
        "expr": "rate(otelcol_exporter_sent{exporter=\"otelarrow\"}[5m]) / rate(otelcol_exporter_sent_wire{exporter=\"otelarrow\"}[5m])",
        "legendFormat": "{{instance}}"
      }],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 3},
              {"color": "green", "value": 5}
            ]
          }
        }
      }
    },
    {
      "title": "Arrow Wire Bytes",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_exporter_sent_wire{exporter=\"otelarrow\"}[5m])",
        "legendFormat": "{{instance}}"
      }]
    },
    {
      "title": "Bandwidth (bytes/sec)",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_exporter_sent_wire{exporter=\"otelarrow\"}[5m])",
        "legendFormat": "Arrow - {{instance}}"
      }]
    },
    {
      "title": "Receiver Admission Waiting Bytes",
      "type": "timeseries",
      "targets": [{
        "expr": "otelcol_otelarrow_admission_waiting_bytes{receiver=\"otelarrow\"}",
        "legendFormat": "{{instance}}"
      }]
    },
    {
      "title": "Export Errors",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_exporter_send_failed_spans{exporter=\"otelarrow\"}[5m]) + rate(otelcol_exporter_send_failed_metric_points{exporter=\"otelarrow\"}[5m]) + rate(otelcol_exporter_send_failed_log_records{exporter=\"otelarrow\"}[5m])",
        "legendFormat": "{{instance}}"
      }]
    }
  ]
}
```

## Alert Rules

Set up alerts for the most critical conditions:

```yaml
# Prometheus alerting rules
groups:
  - name: otel-arrow-health
    rules:
      # Compression ratio dropped significantly
      - alert: ArrowCompressionDegraded
        expr: |
          rate(otelcol_exporter_sent{exporter="otelarrow"}[5m])
          /
          rate(otelcol_exporter_sent_wire{exporter="otelarrow"}[5m])
          < 3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "OTel Arrow compression ratio below 3:1"

      # Receiver admission pressure
      - alert: ArrowReceiverAdmissionPressure
        expr: otelcol_otelarrow_admission_waiting_bytes{receiver="otelarrow"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "OTel Arrow receiver has bytes waiting for admission"

      # High error rate
      - alert: ArrowExportErrors
        expr: |
          rate(otelcol_exporter_send_failed_spans{exporter="otelarrow"}[5m])
          + rate(otelcol_exporter_send_failed_metric_points{exporter="otelarrow"}[5m])
          + rate(otelcol_exporter_send_failed_log_records{exporter="otelarrow"}[5m])
          > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "OTel Arrow exporter experiencing errors"

      # Receiver memory usage
      - alert: ArrowReceiverMemoryHigh
        expr: arrow_memory_inuse > 0.8 * 128 * 1024 * 1024
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Arrow receiver memory usage is above 80% of the default 128 MiB limit"
```

## Receiver-Side Metrics

Do not forget to monitor the receiver as well:

```promql
# Memory used for Arrow decoding
arrow_memory_inuse

# Uncompressed bytes received by the Arrow receiver
rate(otelcol_receiver_recv{receiver="otelarrow"}[5m])

# Compressed bytes received on the wire
rate(otelcol_receiver_recv_wire{receiver="otelarrow"}[5m])

# Admission pressure
otelcol_otelarrow_admission_waiting_bytes{receiver="otelarrow"}
```

Admission waiting bytes indicate the receiver is under memory pressure. If you see these frequently, increase the receiver's `arrow.memory_limit_mib`, tune the receiver `admission` limits, or add more receiver instances.

Monitoring your OTel Arrow deployment is just as important as deploying it. These metrics tell you whether you are getting the compression savings you expected and whether the streams are healthy. Without them, you are flying blind.
