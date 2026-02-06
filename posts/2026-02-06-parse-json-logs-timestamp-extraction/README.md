# How to Parse JSON-Formatted Application Logs with the json_parser Operator and Timestamp Extraction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JSON Logs, Filelog Receiver, Timestamp Parsing, Log Parsing

Description: Parse JSON-formatted application logs with the filelog receiver json_parser operator including timestamp and severity extraction.

Most modern applications output structured JSON logs. Frameworks like Logback (Java), structlog (Python), Serilog (.NET), and Zap (Go) all support JSON output. The filelog receiver's `json_parser` operator makes it simple to turn these into proper OpenTelemetry log records with correct timestamps and severity levels.

## Typical JSON Log Formats

Here are examples from popular frameworks:

```json
{"timestamp":"2026-02-06T14:23:45.123Z","level":"ERROR","logger":"com.example.PaymentService","message":"Payment failed","orderId":"ORD-12345","error":"insufficient_funds"}
```

```json
{"ts":1738851825.123,"level":"error","caller":"handler.go:42","msg":"request failed","method":"POST","path":"/api/orders","status":500,"duration_ms":234}
```

## Basic json_parser Configuration

The `json_parser` operator automatically expands JSON fields into log attributes:

```yaml
receivers:
  filelog/app:
    include:
      - /var/log/app/*.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"
        severity:
          parse_from: attributes.level
          mapping:
            fatal: ["FATAL", "fatal", "CRITICAL", "critical"]
            error: ["ERROR", "error"]
            warn: ["WARN", "warn", "WARNING", "warning"]
            info: ["INFO", "info"]
            debug: ["DEBUG", "debug", "TRACE", "trace"]
```

After parsing, each JSON field becomes a log attribute. The `timestamp` and `severity` directives tell the parser which fields to use for the log record's timestamp and severity.

## Handling Different Timestamp Formats

Applications use many timestamp formats. Here are the most common ones and their layout strings:

```yaml
# ISO 8601 with timezone
# "2026-02-06T14:23:45.123Z"
timestamp:
  parse_from: attributes.timestamp
  layout: "%Y-%m-%dT%H:%M:%S.%LZ"

# ISO 8601 with offset
# "2026-02-06T14:23:45.123+05:30"
timestamp:
  parse_from: attributes.timestamp
  layout: "%Y-%m-%dT%H:%M:%S.%L%z"

# Unix epoch seconds (float)
# 1738851825.123
timestamp:
  parse_from: attributes.ts
  layout_type: epoch
  layout: s.ms

# Unix epoch milliseconds
# 1738851825123
timestamp:
  parse_from: attributes.ts
  layout_type: epoch
  layout: ms

# Custom format
# "06/Feb/2026 14:23:45"
timestamp:
  parse_from: attributes.time
  layout: "%d/%b/%Y %H:%M:%S"
```

## Complete Configuration for a Go Zap Logger

Go's Zap logger outputs JSON with Unix timestamps by default:

```yaml
receivers:
  filelog/go-app:
    include:
      - /var/log/go-app/*.log
    start_at: end
    operators:
      # Parse the JSON structure
      - type: json_parser
        timestamp:
          parse_from: attributes.ts
          layout_type: epoch
          layout: s.ms
        severity:
          parse_from: attributes.level

      # Move the message field to the log body
      - type: move
        from: attributes.msg
        to: body

      # Map Zap-specific fields to OTel conventions
      - type: move
        from: attributes.caller
        to: attributes["code.filepath"]

      # Clean up the extracted timestamp
      - type: remove
        field: attributes.ts
      - type: remove
        field: attributes.level

processors:
  resource:
    attributes:
      - key: service.name
        value: "go-app"
        action: upsert
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/go-app]
      processors: [resource, batch]
      exporters: [otlp]
```

## Handling Nested JSON Objects

When your JSON logs contain nested objects, the json_parser flattens them with dot notation:

```json
{"timestamp":"2026-02-06T14:23:45Z","level":"error","message":"DB query failed","context":{"query":"SELECT * FROM users","duration_ms":5230,"database":"userdb"}}
```

After parsing, you get attributes like `context.query`, `context.duration_ms`, and `context.database`. You can move or rename these:

```yaml
operators:
  - type: json_parser
    timestamp:
      parse_from: attributes.timestamp
      layout: "%Y-%m-%dT%H:%M:%SZ"

  # Flatten nested context fields
  - type: move
    from: attributes["context.query"]
    to: attributes["db.statement"]
  - type: move
    from: attributes["context.duration_ms"]
    to: attributes["db.operation.duration_ms"]
  - type: move
    from: attributes["context.database"]
    to: attributes["db.name"]
```

## Parsing Logs with Multiple JSON Formats

If your log file contains JSON from different loggers with different schemas, use the router operator:

```yaml
operators:
  - type: json_parser
    # Parse JSON first to get all fields
  - type: router
    routes:
      - output: handle_zap
        expr: 'attributes.ts != nil'
      - output: handle_logback
        expr: 'attributes.timestamp != nil'
    default: handle_generic

  - id: handle_zap
    type: move
    from: attributes.msg
    to: body
  - id: handle_logback
    type: move
    from: attributes.message
    to: body
  - id: handle_generic
    type: noop
```

## Error Handling for Malformed JSON

Not every line in your log file will be valid JSON. A crash might produce raw text output, or a log rotation could cause a partial line. Handle this gracefully:

```yaml
operators:
  - type: json_parser
    on_error: send
    # If JSON parsing fails, the line is sent as-is in the body
```

With `on_error: send`, lines that fail JSON parsing still flow through the pipeline with the raw text as the log body. You will not lose data, but those records will lack structured attributes.

## Performance Tips

For high-volume JSON log ingestion:

1. Use `start_at: end` to avoid reprocessing old logs on restart
2. Set `poll_interval` to match your log write frequency
3. Avoid overly complex operator chains; each operator adds latency
4. If you do not need all JSON fields, consider using the attributes processor to delete unwanted ones after parsing

JSON log parsing with the filelog receiver gives you structured, queryable log data without any changes to your application's logging configuration. Just point the receiver at your log files and define how to extract timestamps and severity.
