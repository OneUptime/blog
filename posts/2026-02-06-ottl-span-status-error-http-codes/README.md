# How to Write OTTL Statements That Conditionally Set span.status to ERROR Based on HTTP Status Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Transform Processor, Error Handling

Description: Write OTTL statements in the OpenTelemetry Collector transform processor to set span status to ERROR based on HTTP status codes.

The OpenTelemetry Transformation Language (OTTL) is used in the Collector's transform processor to modify telemetry data as it flows through the pipeline. A common use case is marking spans as errors based on HTTP response status codes. By default, some instrumentation libraries only set span status to ERROR for 5xx responses, but you might want to also flag 4xx responses or specific status codes as errors.

## Basic OTTL Syntax

OTTL statements follow this pattern:

```
<function>(<arguments>) where <condition>
```

The `where` clause is optional and acts as a filter. The statement only executes for telemetry items that match the condition.

## Setting Span Status for 5xx Responses

```yaml
# otel-collector-config.yaml

processors:
  transform/set_error_status:
    trace_statements:
      - context: span
        statements:
          # Set span status to ERROR for any 5xx HTTP status code
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500

          # Set a descriptive status message
          - set(status.message, "Server Error") where attributes["http.response.status_code"] >= 500
```

In OTTL, `status.code` uses numeric values:
- `0` = Unset
- `1` = Ok
- `2` = Error

## Handling 4xx Responses

Some teams want to mark client errors as span errors too:

```yaml
processors:
  transform/http_errors:
    trace_statements:
      - context: span
        statements:
          # Mark all 5xx as errors
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500
          - set(status.message, "Server Error") where attributes["http.response.status_code"] >= 500

          # Mark specific 4xx codes as errors
          # 401 Unauthorized
          - set(status.code, 2) where attributes["http.response.status_code"] == 401
          - set(status.message, "Unauthorized") where attributes["http.response.status_code"] == 401

          # 403 Forbidden
          - set(status.code, 2) where attributes["http.response.status_code"] == 403
          - set(status.message, "Forbidden") where attributes["http.response.status_code"] == 403

          # 429 Too Many Requests
          - set(status.code, 2) where attributes["http.response.status_code"] == 429
          - set(status.message, "Rate Limited") where attributes["http.response.status_code"] == 429
```

## Using Range Conditions

To flag all 4xx and 5xx responses:

```yaml
processors:
  transform/all_http_errors:
    trace_statements:
      - context: span
        statements:
          # Any HTTP status >= 400 is an error
          - set(status.code, 2) where attributes["http.response.status_code"] >= 400

          # Build a descriptive message based on the range
          - set(status.message, "Client Error") where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500
          - set(status.message, "Server Error") where attributes["http.response.status_code"] >= 500
```

## Excluding Specific Status Codes

Maybe you want all 4xx as errors except 404 (which might be expected):

```yaml
processors:
  transform/selective_errors:
    trace_statements:
      - context: span
        statements:
          # Mark 4xx as errors, but skip 404
          - set(status.code, 2) where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500 and attributes["http.response.status_code"] != 404

          # Always mark 5xx as errors
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500

          # Set status message for errors
          - set(status.message, "HTTP Error") where status.code == 2
```

## Handling Legacy Attribute Names

The HTTP semantic conventions changed from `http.status_code` to `http.response.status_code`. Your OTTL should handle both:

```yaml
processors:
  transform/http_errors_compat:
    trace_statements:
      - context: span
        statements:
          # New convention
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500

          # Legacy convention (older instrumentation libraries)
          - set(status.code, 2) where attributes["http.status_code"] >= 500
```

## Full Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/http_errors:
    trace_statements:
      - context: span
        statements:
          # Set ERROR for 5xx responses
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500
          - set(status.message, "Server Error") where attributes["http.response.status_code"] >= 500

          # Set ERROR for 4xx responses except 404
          - set(status.code, 2) where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500 and attributes["http.response.status_code"] != 404
          - set(status.message, "Client Error") where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500 and attributes["http.response.status_code"] != 404

          # Set OK for 2xx responses that do not already have a status
          - set(status.code, 1) where attributes["http.response.status_code"] >= 200 and attributes["http.response.status_code"] < 300 and status.code == 0

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/http_errors, batch]
      exporters: [otlp]
```

## Combining with Service Name Filters

You might want different error rules per service:

```yaml
processors:
  transform/api_errors:
    trace_statements:
      - context: span
        statements:
          # For API services: 4xx and 5xx are errors
          - set(status.code, 2) where attributes["http.response.status_code"] >= 400 and resource.attributes["service.name"] == "api-gateway"

          # For web frontend: only 5xx are errors (404s are expected)
          - set(status.code, 2) where attributes["http.response.status_code"] >= 500 and resource.attributes["service.name"] == "web-frontend"
```

## Testing Your OTTL Statements

Before deploying, test with the Collector's debug exporter:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/http_errors]
      exporters: [debug]
```

Send test spans with different status codes and verify the output:

```bash
# Check the Collector's stdout for transformed spans
# Look for status.code and status.message in the output
```

OTTL-based status setting centralizes your error classification logic in the Collector rather than spreading it across every instrumented service. This gives you a single place to update when your error definitions change.
