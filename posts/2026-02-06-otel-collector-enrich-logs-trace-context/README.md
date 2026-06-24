# How to Configure the OpenTelemetry Collector to Enrich Logs with Trace Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Log, Trace Context, Enrichment

Description: Configure the OpenTelemetry Collector to automatically enrich log records with trace context from matching spans in the same request.

Not every application injects trace IDs into its logs at the SDK level. Legacy services, third-party applications, and some language frameworks make it difficult to modify the logging pipeline. For these cases, the OpenTelemetry Collector can enrich logs with trace context after the fact when the trace ID is already present in a non-standard log field, and it can standardize shared attributes like request IDs for backend correlation.

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

The same service is also instrumented for traces (perhaps via auto-instrumentation), and the traces carry the same `request_id` as a span attribute. You want the collector to preserve a common correlation key, and to move trace IDs into the OTLP trace context fields whenever the logs already carry those IDs in non-standard fields.

## Approach 1: Correlation via Shared Attributes

The OpenTelemetry Collector does not have a built-in generic connector that looks up spans by `request_id` and writes the matching trace ID into log records. If your logs and spans share an application correlation ID, standardize that attribute on both signals and let your backend correlate or query by it:

```yaml
# collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:
    timeout: 5s

  # Standardize the request ID on spans.
  transform/traces:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - set(span.attributes["correlation.request_id"], span.attributes["request_id"])
            where span.attributes["request_id"] != nil

  # Standardize the request ID on logs.
  attributes/logs:
    actions:
      - key: "correlation.request_id"
        from_attribute: "request_id"
        action: "upsert"

exporters:
  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true

  otlphttp/logs:
    endpoint: "http://loki:3100/otlp"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/traces, batch]
      exporters: [otlp/traces]

    logs:
      receivers: [otlp]
      processors: [attributes/logs, batch]
      exporters: [otlphttp/logs]
```

## Approach 2: Transform Processor for Log Enrichment

If your logs already have trace IDs in a non-standard field, use the `transform` processor to move them to the correct OTLP fields:

```yaml
processors:
  transform/logs:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          # If trace_id exists as a log attribute, move it to the trace context
          - set(log.trace_id.string, log.attributes["trace_id"])
            where log.attributes["trace_id"] != nil

          # Same for span_id
          - set(log.span_id.string, log.attributes["span_id"])
            where log.attributes["span_id"] != nil

          # Clean up the redundant attributes
          - delete_key(log.attributes, "trace_id")
            where log.trace_id.string != ""
          - delete_key(log.attributes, "span_id")
            where log.span_id.string != ""
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
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          # Extract trace_id from log body like "[trace_id=abc123def456...]"
          - merge_maps(log.attributes,
              ExtractPatterns(log.body.string, "\\[trace_id=(?P<trace_id>[a-f0-9]{32})\\]"),
              "upsert")
            where log.body.string != ""

          # Set the OTLP trace context from the extracted attribute
          - set(log.trace_id.string, log.attributes["trace_id"])
            where log.attributes["trace_id"] != nil
```

## Complete Production Configuration

Here is a full collector config that handles both modern OTLP logs with trace context and legacy file logs that carry trace IDs in fields:

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
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          # Move trace_id from attribute to OTLP trace context
          - set(log.trace_id.string, log.attributes["trace_id"])
            where log.attributes["trace_id"] != nil and log.trace_id.string == ""
          - set(log.span_id.string, log.attributes["span_id"])
            where log.attributes["span_id"] != nil and log.span_id.string == ""

  # Keep a shared request ID for backend correlation when no trace ID is present
  attributes/logs:
    actions:
      - key: "correlation.request_id"
        from_attribute: "request_id"
        action: "upsert"

  # Add consistent resource attributes
  resource/logs:
    attributes:
      - key: deployment.environment
        value: "${DEPLOY_ENV}"
        action: "upsert"

exporters:
  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true
  otlphttp/logs:
    endpoint: "http://loki:3100/otlp"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces]

    logs:
      receivers: [otlp, filelog/legacy]
      processors: [transform/logs, attributes/logs, resource/logs, batch]
      exporters: [otlphttp/logs]
```

## Wrapping Up

Not every service can inject trace context at the application level, but that should not prevent trace-log correlation. The OpenTelemetry Collector gives you multiple tools to enrich logs after the fact: the transform processor for reformatting trace context that already exists in log fields, the filelog receiver for parsing log files, and the attributes and resource processors for standardizing correlation keys. Choose the approach that fits your legacy service's log format, and you get the same trace-to-log navigation as services with native OpenTelemetry instrumentation when valid trace context is available.
