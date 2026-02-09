# How to Extract Nested JSON Fields from Log Bodies into Top-Level Attributes Using OTTL Expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Logs, JSON Parsing

Description: Use OTTL expressions in the OpenTelemetry Collector to extract nested JSON fields from log bodies into top-level log attributes.

Application logs often arrive at the Collector as JSON-encoded strings in the log body. To query, filter, and aggregate on specific fields, you need to extract them into top-level log record attributes. The OTTL `ParseJSON` function combined with attribute assignment lets you do this in the transform processor.

## The Problem

Your application logs JSON like this:

```json
{
  "timestamp": "2026-02-06T10:30:00Z",
  "level": "ERROR",
  "message": "Payment failed",
  "request_id": "req-abc123",
  "user": {
    "id": "user-456",
    "plan": "premium"
  },
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "provider": "stripe"
  },
  "duration_ms": 342
}
```

This arrives as a string in the log body. Your backend needs `user.id`, `error.code`, and `duration_ms` as structured attributes for filtering and alerting.

## Parsing JSON Log Bodies

```yaml
processors:
  transform/parse_json:
    log_statements:
      - context: log
        statements:
          # Parse the JSON body into a map
          # After this, body becomes a structured map instead of a string
          - set(cache, ParseJSON(body)) where IsString(body)

          # Extract top-level fields into attributes
          - set(attributes["log.message"], cache["message"]) where cache["message"] != nil
          - set(attributes["request_id"], cache["request_id"]) where cache["request_id"] != nil
          - set(attributes["duration_ms"], cache["duration_ms"]) where cache["duration_ms"] != nil

          # Extract nested fields
          - set(attributes["user.id"], cache["user"]["id"]) where cache["user"]["id"] != nil
          - set(attributes["user.plan"], cache["user"]["plan"]) where cache["user"]["plan"] != nil
          - set(attributes["error.code"], cache["error"]["code"]) where cache["error"]["code"] != nil
          - set(attributes["error.provider"], cache["error"]["provider"]) where cache["error"]["provider"] != nil

          # Set severity from the parsed JSON
          - set(severity_text, cache["level"]) where cache["level"] != nil
```

## Alternative: Using the JSON Parser Operator

For log pipelines that use the filelog receiver, the json_parser operator is more appropriate:

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    operators:
      # Parse JSON from each log line
      - type: json_parser
        parse_from: body
        parse_to: attributes

      # Now all JSON fields are in attributes
      # Move nested fields to top-level attributes
      - type: move
        from: attributes.user.id
        to: attributes.user_id

      - type: move
        from: attributes.error.code
        to: attributes.error_code
```

## Using the Transform Processor for OTLP-Received Logs

When logs come via OTLP (from an SDK), use the transform processor:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/extract_fields:
    log_statements:
      - context: log
        statements:
          # First, check if the body is a JSON string and parse it
          - set(cache, ParseJSON(body)) where IsString(body)

          # Extract fields we care about
          - set(attributes["trace.id"], cache["trace_id"]) where cache["trace_id"] != nil
          - set(attributes["span.id"], cache["span_id"]) where cache["span_id"] != nil
          - set(attributes["service.operation"], cache["operation"]) where cache["operation"] != nil
          - set(attributes["http.status_code"], cache["status_code"]) where cache["status_code"] != nil

          # Extract from nested objects
          - set(attributes["db.query"], cache["database"]["query"]) where cache["database"]["query"] != nil
          - set(attributes["db.duration_ms"], cache["database"]["duration_ms"]) where cache["database"]["duration_ms"] != nil

          # Set the clean message as the body
          - set(body, cache["message"]) where cache["message"] != nil

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/extract_fields, batch]
      exporters: [otlp]
```

## Handling Deeply Nested JSON

For deeply nested structures, chain the field access:

```yaml
processors:
  transform/deep_extract:
    log_statements:
      - context: log
        statements:
          - set(cache, ParseJSON(body)) where IsString(body)

          # Three levels deep: response.headers.content_type
          - set(attributes["response.content_type"], cache["response"]["headers"]["content_type"]) where cache["response"]["headers"]["content_type"] != nil

          # Extract array elements (first item)
          - set(attributes["first_tag"], cache["tags"][0]) where cache["tags"] != nil
```

## Handling Parse Failures

Not all log bodies are valid JSON. Use the `where IsString(body)` guard to avoid errors, and optionally add a marker attribute for unparseable logs:

```yaml
processors:
  transform/safe_parse:
    log_statements:
      - context: log
        statements:
          # Try to parse JSON body
          - set(cache, ParseJSON(body)) where IsString(body)

          # If parsing succeeded, extract fields
          - set(attributes["parsed"], true) where cache != nil
          - set(attributes["request_id"], cache["request_id"]) where cache["request_id"] != nil

          # The body remains unchanged if ParseJSON fails
          # so unparseable logs pass through without errors
```

## Combining with Severity Mapping

Map JSON log levels to OpenTelemetry severity numbers:

```yaml
processors:
  transform/parse_and_severity:
    log_statements:
      - context: log
        statements:
          - set(cache, ParseJSON(body)) where IsString(body)

          # Map level strings to severity numbers
          - set(severity_text, cache["level"]) where cache["level"] != nil
          - set(severity_number, 1) where cache["level"] == "TRACE"
          - set(severity_number, 5) where cache["level"] == "DEBUG"
          - set(severity_number, 9) where cache["level"] == "INFO"
          - set(severity_number, 13) where cache["level"] == "WARN"
          - set(severity_number, 17) where cache["level"] == "ERROR"
          - set(severity_number, 21) where cache["level"] == "FATAL"

          # Extract the message
          - set(body, cache["message"]) where cache["message"] != nil
```

## Performance Tips

JSON parsing is CPU-intensive. For high-volume log pipelines:

1. **Filter before parsing.** If you only need to parse logs from specific services, add a `where` clause on `resource.attributes["service.name"]`.

2. **Extract only what you need.** Do not extract every field from a 50-field JSON object. Pick the 5-10 fields you actually query on.

3. **Consider parsing in the SDK.** If your application generates structured logs, use the OpenTelemetry Log Bridge API to set attributes directly instead of serializing to JSON and re-parsing in the Collector.

OTTL-based JSON extraction turns unstructured log strings into queryable structured data. This happens in the Collector pipeline, so it works regardless of which logging library or language your application uses.
