# How to Build a Logs-to-Metrics Pipeline in the OpenTelemetry Collector for Alert-Ready Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logs, Metrics, Alerting

Description: Build a pipeline in the OpenTelemetry Collector that converts log patterns into metrics you can alert on directly.

Logs are great for debugging, but they are terrible for alerting. You cannot easily set a threshold on unstructured text. What you can do is extract metrics from your logs and use those metrics as the basis for alerts. The OpenTelemetry Collector has built-in support for this through the `count` connector and the `spanmetrics` connector, but for log-to-metric conversion specifically, we will use the `transform` processor combined with the `count` connector.

This post shows you how to build a pipeline that reads logs, extracts meaningful counts and gauges, and exports them as proper metrics.

## The Use Case

Imagine you have an application that logs every HTTP request with a status code. You want a metric called `http_errors_total` that counts how many 5xx responses your service returned in the last minute. Instead of querying your log store, you want this metric available in your metrics backend, ready for alerting.

## Architecture Overview

The pipeline looks like this:

1. Logs come into the collector via OTLP or filelog receiver
2. A transform processor enriches or filters the logs
3. The count connector converts log records into metric data points
4. Metrics get exported to your metrics backend

## Collector Configuration

Here is the full configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # The count connector counts log records and produces metrics
  count:
    logs:
      # Each entry here defines a metric derived from logs
      http.server.error.count:
        description: "Count of HTTP 5xx log entries"
        conditions:
          # Only count logs where the severity is ERROR or higher
          - 'severity_number >= 17'
        attributes:
          - key: http.route
          - key: service.name
      http.server.request.count:
        description: "Total count of HTTP request log entries"
        attributes:
          - key: http.route
          - key: http.method
          - key: service.name

processors:
  # Use transform to extract structured fields from log bodies
  transform/extract:
    log_statements:
      - context: log
        statements:
          # Parse the status code from the log body if it exists
          - set(attributes["http.status_code"], body["status_code"])
            where body["status_code"] != nil
          # Mark 5xx responses with ERROR severity
          - set(severity_number, 17)
            where body["status_code"] != nil and body["status_code"] >= 500

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  # Send the generated metrics to your metrics backend
  otlp/metrics:
    endpoint: "https://metrics-backend.example.com:4317"
    tls:
      insecure: false

  # Optionally, still forward logs to your log backend
  otlp/logs:
    endpoint: "https://logs-backend.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    # Logs pipeline feeds into the count connector
    logs:
      receivers: [otlp]
      processors: [transform/extract, batch]
      exporters: [count, otlp/logs]
    # Metrics pipeline receives from the count connector
    metrics:
      receivers: [count]
      processors: [batch]
      exporters: [otlp/metrics]
```

## How the Count Connector Works

The `count` connector sits between a logs pipeline and a metrics pipeline. It receives log records from the logs pipeline and emits metric data points into the metrics pipeline. Each log record that matches the defined conditions increments the corresponding counter.

The `attributes` field controls which log attributes become metric labels. In the example above, `http.route` and `service.name` become dimensions on the metric, so you can break down error counts by route and service.

## Adding Rate-Based Metrics

Raw counts are useful, but sometimes you want a rate. You can handle this on the backend side (most metrics backends support `rate()` functions), or you can use the `metricstransform` processor to do some manipulation in the collector:

```yaml
processors:
  metricstransform:
    transforms:
      - include: http.server.error.count
        action: update
        # Add a static label to help identify the source
        operations:
          - action: add_label
            new_label: pipeline
            new_value: otel-collector
```

## Creating Alerts on the Derived Metrics

Once your metrics land in your backend (Prometheus, OneUptime, or any OTLP-compatible store), you can write alert rules against them. For example, in PromQL:

```promql
# Alert if more than 50 errors per minute on any route
rate(http_server_error_count_total[1m]) > 50
```

Or if you are using OneUptime, you can create a metric monitor that watches `http.server.error.count` and triggers when it exceeds your threshold.

## Going Beyond Counts

The count connector handles counting, but you might also want histograms or gauges derived from logs. For example, if your logs contain a `response_time_ms` field, you could use the `transform` processor to extract it and then use a custom connector or the OTTL (OpenTelemetry Transformation Language) to build histogram buckets.

Here is a snippet that extracts a numeric value from a log attribute:

```yaml
processors:
  transform/latency:
    log_statements:
      - context: log
        statements:
          # Convert the string field to a double for metric use
          - set(attributes["response.time.ms"],
              Double(body["response_time_ms"]))
            where body["response_time_ms"] != nil
```

## Performance Considerations

Converting logs to metrics adds processing overhead in the collector. A few tips to keep things efficient:

- Use `conditions` in the count connector to filter aggressively. Do not count every log line if you only care about errors.
- Keep the cardinality of your metric attributes low. Adding a `user_id` attribute to your metric will create a unique time series per user, which will blow up your metrics storage.
- Batch aggressively on the metrics export side. The derived metrics do not need sub-second granularity in most cases.

## Wrapping Up

A logs-to-metrics pipeline gives you the best of both worlds. You keep your detailed logs for debugging and get clean, aggregatable metrics for alerting. The OpenTelemetry Collector makes this possible without any application code changes. Set up the count connector, define your conditions and attributes, and start alerting on data that was previously buried in log lines.
