# How to Implement Log Level Filtering (Drop DEBUG in Production) in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Filtering, Collector, Production Logging

Description: Configure the OpenTelemetry Collector to filter out DEBUG and TRACE level logs in production to reduce noise and storage costs.

Running DEBUG-level logging in production is a fast way to blow your log storage budget and bury important signals in noise. But telling developers to never log at DEBUG level is not realistic either. DEBUG logs are essential during development and useful for temporary troubleshooting in production. The practical solution is to let applications log at whatever level they want and filter at the collector level.

The OpenTelemetry Collector's filter processor gives you a clean way to drop low-severity logs before they reach your backend. This post shows how to set it up, including some more advanced patterns like per-service filtering and conditional debug retention.

## Basic Log Level Filtering

The simplest setup drops all DEBUG and TRACE logs at the collector. Here is the configuration:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Drop DEBUG and TRACE logs before they reach the exporter
  filter/drop-debug:
    logs:
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO'

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [filter/drop-debug, batch]
      exporters: [otlp]
```

The `severity_number < SEVERITY_NUMBER_INFO` condition uses OpenTelemetry's severity number scale. In this scale, TRACE is 1-4, DEBUG is 5-8, INFO is 9-12, WARN is 13-16, ERROR is 17-20, and FATAL is 21-24. By filtering out everything below INFO (severity number 9), you drop both TRACE and DEBUG records.

## Understanding Severity Numbers

OpenTelemetry defines a numeric severity scale that maps to the familiar text levels. Here is the mapping:

```
TRACE:  1-4
DEBUG:  5-8
INFO:   9-12
WARN:   13-16
ERROR:  17-20
FATAL:  21-24
```

Applications that use the OpenTelemetry Log Bridge API set severity numbers automatically. But logs ingested from files or syslog might not have severity numbers set correctly. Make sure your parsing operators map severity properly before the filter processor runs.

Here is an example of a Filelog receiver that sets severity numbers correctly, so the filter can work:

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\S+) (?P<severity>\w+) (?P<message>.*)'
        severity:
          parse_from: attributes.severity
          mapping:
            # Map text levels to OTel severity
            trace: "TRACE"
            debug: "DEBUG"
            info: "INFO"
            warn: "WARN"
            error: "ERROR"
            fatal: "FATAL"
```

## Per-Service Filtering

Not all services are equal. Maybe your payment service should keep all logs including DEBUG (for audit and compliance), while your chatty health-check service should only keep WARN and above. You can set this up using multiple pipelines:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Route logs based on service name
  filter/standard:
    logs:
      log_record:
        # Drop DEBUG and TRACE for most services
        - 'severity_number < SEVERITY_NUMBER_INFO'

  filter/strict:
    logs:
      log_record:
        # Only keep WARN and above for noisy services
        - 'severity_number < SEVERITY_NUMBER_WARN'

  # Route logs to different pipelines based on resource attributes
  routing:
    from_attribute: service.name
    attribute_source: resource
    table:
      # Payment service gets all logs (no filtering)
      - value: payment-service
        pipelines: [logs/all]
      # Health check service is filtered aggressively
      - value: health-checker
        pipelines: [logs/strict]
    # Everything else goes to standard filtering
    default_pipelines: [logs/standard]

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  pipelines:
    logs/all:
      receivers: [routing]
      processors: [batch]
      exporters: [otlp]
    logs/standard:
      receivers: [routing]
      processors: [filter/standard, batch]
      exporters: [otlp]
    logs/strict:
      receivers: [routing]
      processors: [filter/strict, batch]
      exporters: [otlp]
```

## Keeping DEBUG Logs That Are Attached to Error Traces

One useful pattern is to keep DEBUG logs that are part of a trace that also contains an error. These logs provide the context you need for debugging production issues. Unfortunately, the collector cannot do this natively in real-time because it would need to buffer all logs until the trace completes.

However, you can approximate this by keeping DEBUG logs that have an associated trace ID and error status. Here is a filter that drops DEBUG logs only when they are not part of an active trace:

```yaml
processors:
  # Keep DEBUG logs that have trace context (they are correlated with a request)
  # Drop DEBUG logs that have no trace context (standalone debug noise)
  filter/smart-debug:
    logs:
      log_record:
        # Drop if: severity is DEBUG AND there is no trace_id
        - 'severity_number >= SEVERITY_NUMBER_DEBUG and severity_number < SEVERITY_NUMBER_INFO and trace_id == ""'
```

This is a compromise. It keeps DEBUG logs from instrumented code paths (where they are most useful) and drops standalone DEBUG output (which is usually just noise).

## Measuring What You Are Dropping

Before deploying aggressive filtering, understand how much data each level contributes. Use the `count` connector or add metrics from the filter processor:

```yaml
service:
  telemetry:
    metrics:
      # Enable internal metrics on this endpoint
      address: 0.0.0.0:8888
      level: detailed
```

With `level: detailed`, the filter processor reports `otelcol_processor_filter_logs_filtered` which tells you how many log records were dropped. Monitor this after deploying to confirm the filter is working as expected and to track the volume reduction.

## Dynamic Log Level Control

For troubleshooting, you sometimes want to temporarily enable DEBUG logs for a specific service without redeploying the collector. You can achieve this by using environment variables in the filter condition and updating them via a config reload:

```yaml
processors:
  filter/dynamic:
    logs:
      log_record:
        - 'severity_number < ${env:MIN_LOG_SEVERITY}'
```

Then set the environment variable and trigger a reload:

```bash
# Normal operation: filter out DEBUG (severity < 9)
export MIN_LOG_SEVERITY=9

# Troubleshooting mode: keep everything (severity < 1 drops nothing)
export MIN_LOG_SEVERITY=1

# Reload the collector config without restart
kill -SIGHUP $(pidof otelcol-contrib)
```

## Wrapping Up

Filtering DEBUG logs at the collector level is a practical approach that lets developers keep their detailed logging while protecting your backend from log volume explosions. Start with the basic severity filter, then graduate to per-service policies and smart filtering as your needs grow. The key is to filter as early as possible in the pipeline to reduce processing and export costs.
