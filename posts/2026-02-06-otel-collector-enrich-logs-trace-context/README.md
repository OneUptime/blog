# How to Configure the OpenTelemetry Collector to Enrich Logs with Trace Context from the Same Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Logs, Trace Context, Enrichment

Description: Configure the OpenTelemetry Collector to automatically enrich log records with trace context from matching spans in the same request.

Not every application injects trace IDs into its logs at the SDK level. Legacy services, third-party applications, and some language frameworks make it difficult to modify the logging pipeline. For these cases, the OpenTelemetry Collector can enrich logs with trace context after the fact, matching log records to spans based on shared attributes like timestamp, resource, and correlation IDs.

## The Problem

You have a legacy service that emits structured logs via OTLP but does not inject trace IDs:

```json
{
  "timestamp": "2026-02-06T14:23:45.123Z",
  "level": "ERROR",
  "message": "Database connection timeout",
  "service.name": "legacy-billing",
  "request_id": "req-abc-123"
}
```

The same service is also instrumented for traces (perhaps via auto-instrumentation), and the traces carry the same `request_id` as a span attribute. You want the collector to match these and add the trace ID to the log record.

## Approach 1: Correlation via Shared Attributes

The OpenTelemetry Collector's `transform` processor can copy attributes between telemetry types when they pass through the same pipeline. However, the more practical approach for trace-log correlation is to use the `correlation` connector:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # The correlation connector matches logs to traces
  correlation:
    # How to match logs to spans
    stale_duration: 30s  # how long to keep spans in the correlation cache
    max_requests_in_flight: 1000

processors:
  batch:
    timeout: 5s

  # Add resource attributes to logs for consistent context
  resource:
    attributes:
      - key: service.name
        from_attribute: service.name
        action: upsert

exporters:
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true

  otlp/logs:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, correlation]

    logs:
      receivers: [otlp, correlation]
      processors: [resource, batch]
      exporters: [otlp/logs]
```

## Approach 2: Transform Processor for Log Enrichment

If your logs already have trace IDs in a non-standard field, use the `transform` processor to move them to the correct OTLP fields:

```yaml
processors:
  transform/logs:
    log_statements:
      - context: log
        statements:
          # If trace_id exists as a log attribute, move it to the trace context
          - set(trace_id.string, attributes["trace_id"])
            where attributes["trace_id"] != nil

          # Same for span_id
          - set(span_id.string, attributes["span_id"])
            where attributes["span_id"] != nil

          # Clean up the redundant attributes
          - delete_key(attributes, "trace_id")
            where trace_id.string != ""
          - delete_key(attributes, "span_id")
            where span_id.string != ""
```

This handles the common case where your logging library puts `trace_id` in the log body or as a log attribute instead of in the OTLP trace context fields.

## Approach 3: Using the Attributes Processor

For simpler enrichment where you just need to add or transform attributes:

```yaml
processors:
  # Add trace context fields from different attribute formats
  attributes/logs:
    actions:
      # Copy request_id to a standardized field
      - key: "correlation.request_id"
        from_attribute: "request_id"
        action: "upsert"

      # Add timestamp-based correlation hint
      - key: "correlation.timestamp"
        from_attribute: "timestamp"
        action: "upsert"

  # Enrich logs with resource information for better correlation
  resource/logs:
    attributes:
      - key: "service.name"
        value: "${SERVICE_NAME}"
        action: "upsert"
      - key: "deployment.environment"
        value: "${DEPLOY_ENV}"
        action: "upsert"
```

## Approach 4: File Log Receiver with Trace Context Parsing

If your legacy service writes logs to files instead of OTLP, use the `filelog` receiver with regex parsing to extract trace context:

```yaml
receivers:
  filelog:
    include:
      - /var/log/legacy-billing/*.log
    operators:
      # Parse JSON logs
      - type: json_parser
        parse_from: body
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

      # Extract trace_id if present in the log body
      - type: regex_parser
        parse_from: attributes.message
        regex: 'trace_id=(?P<trace_id>[a-f0-9]{32})'
        on_error: send  # continue even if regex does not match

      # Move parsed trace_id to the OTLP trace context field
      - type: trace_parser
        trace_id:
          parse_from: attributes.trace_id
        span_id:
          parse_from: attributes.span_id

      # Add resource attributes
      - type: add
        field: resource["service.name"]
        value: "legacy-billing"
```

## Approach 5: Log Body Transform for Legacy Formats

Some legacy services embed trace context in the log message itself. Parse it out with the transform processor:

```yaml
processors:
  transform/parse_trace_from_body:
    log_statements:
      - context: log
        statements:
          # Extract trace_id from log body like "[trace_id=abc123def456...]"
          - merge_maps(attributes,
              ExtractPatterns(body, "\\[trace_id=(?P<trace_id>[a-f0-9]{32})\\]"),
              "upsert")
            where body != nil

          # Set the OTLP trace context from the extracted attribute
          - set(trace_id.string, attributes["trace_id"])
            where attributes["trace_id"] != nil
```

## Complete Production Configuration

Here is a full collector config that handles both modern (OTLP with trace context) and legacy (logs without trace context) services:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

  # Legacy service logs from files
  filelog/legacy:
    include:
      - /var/log/legacy-billing/*.json
    operators:
      - type: json_parser
        parse_from: body
      - type: trace_parser
        trace_id:
          parse_from: attributes.trace_id
        span_id:
          parse_from: attributes.span_id

processors:
  batch:
    timeout: 5s

  # Transform logs to standardize trace context fields
  transform/logs:
    log_statements:
      - context: log
        statements:
          # Move trace_id from attribute to OTLP trace context
          - set(trace_id.string, attributes["trace_id"])
            where attributes["trace_id"] != nil and trace_id.string == ""
          - set(span_id.string, attributes["span_id"])
            where attributes["span_id"] != nil and span_id.string == ""

  # Add consistent resource attributes
  resource/logs:
    attributes:
      - key: deployment.environment
        value: "${DEPLOY_ENV}"
        action: "upsert"

exporters:
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true
  otlp/logs:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces]

    logs:
      receivers: [otlp, filelog/legacy]
      processors: [transform/logs, resource/logs, batch]
      exporters: [otlp/logs]
```

## Wrapping Up

Not every service can inject trace context at the application level, but that should not prevent trace-log correlation. The OpenTelemetry Collector gives you multiple tools to enrich logs after the fact: the transform processor for reformatting, the filelog receiver for parsing log files, and the correlation connector for matching logs to spans. Choose the approach that fits your legacy service's log format, and you get the same trace-to-log navigation as services with native OpenTelemetry instrumentation.
