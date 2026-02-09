# How to Route Logs to Different Backends Based on Severity Level Using OpenTelemetry Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Routing, Severity Filtering, Collector Configuration

Description: Configure the OpenTelemetry Collector to route logs to different backends based on their severity level for cost-effective log management.

Not all logs are created equal. An ERROR log from your payment service deserves fast, reliable storage with instant query capability. A DEBUG log from your development environment does not. Yet many teams send all their logs to the same backend, paying premium prices for storage that most of those logs will never justify.

The OpenTelemetry Collector's routing capabilities let you direct logs to different backends based on severity, namespace, service name, or any other attribute. This post focuses on severity-based routing, which is one of the highest-impact optimizations you can make.

## The Routing Architecture

The idea is simple: use the OpenTelemetry Collector as a smart router that inspects each log record and sends it to the appropriate destination.

- ERROR and FATAL logs go to a premium backend with fast indexing, long retention, and alerting integration
- WARN logs go to a mid-tier backend with moderate retention
- INFO and DEBUG logs go to cheap bulk storage

## Using the Routing Connector

The `routing` connector in the OpenTelemetry Collector Contrib distribution is purpose-built for this. It evaluates conditions on each log record and forwards it to the matching sub-pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing:
    # Define the attribute used for routing decisions
    # We use OTTL conditions on severity
    table:
      - statement: route()
        pipelines: [logs/errors]
        condition: 'severity_number >= 17'
      - statement: route()
        pipelines: [logs/warnings]
        condition: 'severity_number >= 13 and severity_number < 17'
      - statement: route()
        pipelines: [logs/info]
        condition: 'severity_number < 13'
    default_pipelines: [logs/info]

processors:
  batch/fast:
    timeout: 2s
    send_batch_size: 256

  batch/standard:
    timeout: 5s
    send_batch_size: 1024

  batch/bulk:
    timeout: 15s
    send_batch_size: 4096

exporters:
  # Premium backend for errors - fast queries, alerting
  otlp/errors:
    endpoint: "https://premium-logs.example.com:4317"
    tls:
      insecure: false
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  # Standard backend for warnings
  otlp/warnings:
    endpoint: "https://standard-logs.example.com:4317"
    tls:
      insecure: false

  # Cheap bulk storage for info/debug
  otlp/bulk:
    endpoint: "https://bulk-logs.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    # Ingestion pipeline feeds into the routing connector
    logs:
      receivers: [otlp]
      processors: []
      exporters: [routing]

    # Error logs pipeline
    logs/errors:
      receivers: [routing]
      processors: [batch/fast]
      exporters: [otlp/errors]

    # Warning logs pipeline
    logs/warnings:
      receivers: [routing]
      processors: [batch/standard]
      exporters: [otlp/warnings]

    # Info and debug logs pipeline
    logs/info:
      receivers: [routing]
      processors: [batch/bulk]
      exporters: [otlp/bulk]
```

## Understanding Severity Numbers

OpenTelemetry uses numeric severity levels. Here is the mapping for reference:

| Severity Text | Number Range |
|--------------|-------------|
| TRACE        | 1-4         |
| DEBUG        | 5-8         |
| INFO         | 9-12        |
| WARN         | 13-16       |
| ERROR        | 17-20       |
| FATAL        | 21-24       |

The conditions in the routing connector use these numbers, so `severity_number >= 17` captures ERROR and FATAL logs.

## Alternative: Using the Filter Processor

If the routing connector is too complex for your needs, you can achieve similar results with the `filter` processor and multiple pipelines that share the same receiver:

```yaml
processors:
  # Keep only errors
  filter/errors_only:
    logs:
      log_record:
        - 'severity_number < 17'

  # Keep only warnings
  filter/warnings_only:
    logs:
      log_record:
        - 'severity_number < 13 or severity_number >= 17'

  # Keep only info and debug
  filter/info_only:
    logs:
      log_record:
        - 'severity_number >= 13'

service:
  pipelines:
    logs/errors:
      receivers: [otlp]
      processors: [filter/errors_only, batch/fast]
      exporters: [otlp/errors]

    logs/warnings:
      receivers: [otlp]
      processors: [filter/warnings_only, batch/standard]
      exporters: [otlp/warnings]

    logs/info:
      receivers: [otlp]
      processors: [filter/info_only, batch/bulk]
      exporters: [otlp/bulk]
```

Note that with the filter processor approach, the `conditions` list specifies what to **drop**, not what to keep. The filter drops log records that match the condition.

## Adding Service-Based Routing

You can combine severity routing with service-based routing. For example, route all logs from critical services to the premium backend regardless of severity:

```yaml
connectors:
  routing:
    table:
      # Critical services always go to premium, regardless of severity
      - statement: route()
        pipelines: [logs/errors]
        condition: 'resource.attributes["service.name"] == "payment-service"'
      - statement: route()
        pipelines: [logs/errors]
        condition: 'resource.attributes["service.name"] == "auth-service"'
      # Standard severity-based routing for everything else
      - statement: route()
        pipelines: [logs/errors]
        condition: 'severity_number >= 17'
      - statement: route()
        pipelines: [logs/warnings]
        condition: 'severity_number >= 13 and severity_number < 17'
      - statement: route()
        pipelines: [logs/info]
        condition: 'severity_number < 13'
    default_pipelines: [logs/info]
```

## Monitoring Routing Effectiveness

After setting up routing, you will want to verify that logs are going where you expect. Enable the `telemetry` section in your collector config to expose internal metrics:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then query the `otelcol_exporter_sent_log_records` metric, which breaks down by exporter name. You should see the distribution across your three backends matching your expected severity distribution.

## Wrapping Up

Severity-based log routing is one of the simplest and most effective cost optimizations in a logging pipeline. By directing high-severity logs to premium storage and low-severity logs to cheap bulk storage, you get fast access to the logs that matter while keeping costs under control. The OpenTelemetry Collector makes this straightforward with the routing connector or the filter processor, and you can layer in additional routing dimensions like service name or namespace as needed.
