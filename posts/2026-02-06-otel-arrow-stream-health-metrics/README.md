# How to Monitor OTel Arrow Stream Health and Compression Ratios with Collector Internal Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Monitoring, Metrics

Description: Monitor OTel Arrow stream health and compression ratios using the OpenTelemetry Collector's internal metrics.

You have deployed OTel Arrow in your telemetry pipeline. How do you know it is working well? The OpenTelemetry Collector exposes internal metrics that give you visibility into Arrow stream behavior, compression ratios, errors, and throughput. This post covers which metrics to monitor, how to set up dashboards for them, and what alert thresholds to configure.

## Enabling Collector Internal Metrics

The Collector exposes its own metrics via a Prometheus endpoint. Enable it in your Collector configuration:

```yaml
service:
  telemetry:
    metrics:
      level: detailed    # Use 'detailed' for Arrow-specific metrics
      address: 0.0.0.0:8888
```

The `detailed` level is important. The `basic` level does not include Arrow-specific metrics like compression ratios and stream counts.

## Key Metrics to Monitor

### Compression Ratio

This is the most important metric for validating that OTel Arrow is delivering value:

```promql
# Current compression ratio (higher is better)
# A ratio of 5.0 means the data is 5x smaller after Arrow + compression
otelcol_otelarrow_exporter_compression_ratio
```

Expected values:
- 3-5: Modest compression. Data has high cardinality or small batch sizes.
- 5-8: Good compression. Typical for microservices with standard attributes.
- 8-12: Excellent compression. Data has highly repetitive attributes and large batches.

If the compression ratio drops below 3, investigate whether batch sizes have decreased or whether new high-cardinality attributes were added.

### Active Stream Count

```promql
# Number of currently active Arrow streams
otelcol_otelarrow_exporter_active_streams

# Compare with configured num_streams
# If active < configured, some streams may be failing to connect
```

This should equal your configured `num_streams` value. If it is lower, streams are failing to establish or are being terminated prematurely.

### Stream Reconnection Rate

```promql
# Rate of stream reconnections per second
rate(otelcol_otelarrow_exporter_stream_reconnections_total[5m])
```

Expected behavior:
```
reconnections_per_minute = num_streams / max_stream_lifetime_minutes

# Example: 4 streams with 10-minute lifetime
# Expected: 4/10 = 0.4 reconnections per minute
```

If the reconnection rate is significantly higher than expected, streams are being terminated before their configured lifetime. Check for network issues, load balancer timeouts, or receiver-side connection limits.

### Bytes Sent and Received

```promql
# Bytes sent by the Arrow exporter (compressed)
rate(otelcol_exporter_sent_bytes_total{exporter="otelarrow"}[5m])

# Compare with what standard OTLP would send
# (If you have a parallel pipeline for benchmarking)
rate(otelcol_exporter_sent_bytes_total{exporter="otlp"}[5m])
```

### Error Rates

```promql
# Export failures
rate(otelcol_exporter_send_failed_spans{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_metric_points{exporter="otelarrow"}[5m])
rate(otelcol_exporter_send_failed_log_records{exporter="otelarrow"}[5m])

# Arrow-specific errors (encoding failures, stream errors)
rate(otelcol_otelarrow_exporter_errors_total[5m])
```

Any non-zero error rate needs investigation. Common causes:
- `memory_limit_exceeded`: The receiver's Arrow memory limit was hit. Increase `arrow.memory_limit_mib` on the receiver.
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
        "expr": "otelcol_otelarrow_exporter_compression_ratio",
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
      "title": "Active Arrow Streams",
      "type": "timeseries",
      "targets": [{
        "expr": "otelcol_otelarrow_exporter_active_streams",
        "legendFormat": "{{instance}}"
      }]
    },
    {
      "title": "Bandwidth (bytes/sec)",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_exporter_sent_bytes_total{exporter=\"otelarrow\"}[5m])",
        "legendFormat": "Arrow - {{instance}}"
      }]
    },
    {
      "title": "Stream Reconnections",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_otelarrow_exporter_stream_reconnections_total[5m]) * 60",
        "legendFormat": "{{instance}} (per min)"
      }]
    },
    {
      "title": "Export Errors",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(otelcol_otelarrow_exporter_errors_total[5m]) * 60",
        "legendFormat": "{{instance}} - {{error_type}}"
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
        expr: otelcol_otelarrow_exporter_compression_ratio < 3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "OTel Arrow compression ratio below 3:1"

      # Streams are failing
      - alert: ArrowStreamCountLow
        expr: |
          otelcol_otelarrow_exporter_active_streams
          < otelcol_otelarrow_exporter_configured_streams * 0.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Less than 50% of configured Arrow streams are active"

      # High error rate
      - alert: ArrowExportErrors
        expr: rate(otelcol_otelarrow_exporter_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "OTel Arrow exporter experiencing errors"

      # Excessive reconnections (possible network instability)
      - alert: ArrowExcessiveReconnections
        expr: |
          rate(otelcol_otelarrow_exporter_stream_reconnections_total[5m]) * 60
          > otelcol_otelarrow_exporter_configured_streams * 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Arrow streams reconnecting more than twice per minute per stream"
```

## Receiver-Side Metrics

Do not forget to monitor the receiver as well:

```promql
# Memory used for Arrow decoding
otelcol_otelarrow_receiver_memory_usage_bytes

# Number of active incoming Arrow streams
otelcol_otelarrow_receiver_active_streams

# Backpressure events (receiver told sender to slow down)
rate(otelcol_otelarrow_receiver_backpressure_events_total[5m])
```

Backpressure events indicate the receiver is under memory pressure. If you see these frequently, increase the receiver's `arrow.memory_limit_mib` or add more receiver instances.

Monitoring your OTel Arrow deployment is just as important as deploying it. These metrics tell you whether you are getting the compression savings you expected and whether the streams are healthy. Without them, you are flying blind.
