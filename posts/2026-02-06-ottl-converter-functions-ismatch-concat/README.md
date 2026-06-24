# How to Use OTTL Converter Functions for Advanced Telemetry Manipulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Converter Functions, Transform Processor

Description: Use OTTL converter functions like IsMatch, Concat, and SpanID for advanced telemetry manipulation in the Collector's transform processor.

OTTL converter functions transform values without modifying the telemetry directly. They are used inside OTTL statements to compute new values, match patterns, or extract information from existing fields. Functions like `IsMatch`, `Concat`, `Int`, `Double`, `Substring`, and ID string accessors give you the building blocks for complex transformations.

## Converter Functions Overview

Converter functions return a value. They do not modify telemetry on their own but are used as arguments to editor functions like `set`, or in `where` clauses as conditions.

```yaml
# Pattern: set(target, ConverterFunction(args)) where Condition(args)

- set(span.attributes["key"], Concat(["a", "b"], "-")) where IsMatch(span.name, "http.*")
```

## IsMatch: Regex Pattern Testing

`IsMatch` tests whether a string matches a regular expression and returns a boolean. It is primarily used in `where` clauses:

```yaml
processors:
  transform/ismatch:
    trace_statements:
      - context: span
        statements:
          # Match spans with HTTP method in the name
          - set(span.attributes["span.type"], "http") where IsMatch(span.name, "^HTTP (GET|POST|PUT|DELETE).*")

          # Match spans with database operations
          - set(span.attributes["span.type"], "db") where IsMatch(span.name, "^(SELECT|INSERT|UPDATE|DELETE).*")

          # Match service names with a pattern
          - set(span.attributes["team"], "platform") where IsMatch(resource.attributes["service.name"], "^(auth|gateway|proxy)-.*")

          # Match URLs containing API version paths
          - set(span.attributes["api.versioned"], true) where IsMatch(span.attributes["http.url"], ".*/v[0-9]+/.*")

          # Match error messages containing specific patterns
          - set(span.attributes["error.category"], "timeout") where IsMatch(span.attributes["exception.message"], "(?i)timeout|timed out|deadline exceeded")
```

## Concat: String Concatenation

`Concat` joins an array of values with a delimiter:

```yaml
processors:
  transform/concat:
    trace_statements:
      - context: span
        statements:
          # Build a compound key from multiple attributes
          - set(span.attributes["route.key"], Concat([span.attributes["http.method"], span.attributes["http.route"]], " "))
          # Result: "GET /api/users"

          # Create a fully qualified service identifier
          - set(span.attributes["service.fqn"], Concat([resource.attributes["k8s.namespace.name"], resource.attributes["service.name"]], "/"))
          # Result: "production/checkout-service"

          # Build an error summary
          - 'set(span.attributes["error.summary"], Concat([span.attributes["exception.type"], span.attributes["exception.message"]], ": ")) where span.status.code == STATUS_CODE_ERROR'
          # Result: "ValueError: invalid input"
```

## Trace and Span ID String Access

The span and log contexts expose trace and span ID string paths for correlation:

```yaml
processors:
  transform/ids:
    trace_statements:
      - context: span
        statements:
          # Store trace and span IDs as attributes for easier querying
          - set(span.attributes["trace.id.string"], span.trace_id.string)
          - set(span.attributes["span.id.string"], span.span_id.string)

    log_statements:
      - context: log
        statements:
          # Store trace ID on logs for correlation
          - set(log.attributes["trace.id.string"], log.trace_id.string) where log.trace_id != TraceID(0x00000000000000000000000000000000)
          - set(log.attributes["span.id.string"], log.span_id.string) where log.span_id != SpanID(0x0000000000000000)
```

## Int and Double: Type Conversion

Convert string attributes to numeric types:

```yaml
processors:
  transform/type_convert:
    trace_statements:
      - context: span
        statements:
          # Convert string status code to integer
          - set(span.attributes["http.status_code_int"], Int(span.attributes["http.status_code"])) where span.attributes["http.status_code"] != nil

          # Convert string duration to double
          - set(span.attributes["duration_seconds"], Double(span.attributes["duration_str"])) where span.attributes["duration_str"] != nil
```

## Substring: String Slicing

Extract a portion of a string:

```yaml
processors:
  transform/substring:
    trace_statements:
      - context: span
        statements:
          # Extract the first 8 characters of trace ID as a short reference
          - set(span.attributes["trace.id.short"], Substring(span.trace_id.string, 0, 8))

          # Extract HTTP method from span name like "HTTP GET /api/users"
          - set(span.attributes["http.method.extracted"], Substring(span.name, 5, 8)) where IsMatch(span.name, "^HTTP (GET|POST|PUT).*")
```

## Len: Getting Collection Size

```yaml
processors:
  transform/length:
    trace_statements:
      - context: span
        statements:
          # Count the length of a string attribute
          - set(span.attributes["url.length"], Len(span.attributes["http.url"])) where span.attributes["http.url"] != nil
```

## Combining Multiple Functions

The real power comes from combining functions:

```yaml
processors:
  transform/combined:
    trace_statements:
      - context: span
        statements:
          # Build a descriptive span identifier
          - set(span.attributes["span.description"], Concat([resource.attributes["service.name"], span.name, Substring(span.trace_id.string, 0, 8)], " | "))
          # Result: "checkout-service | process_payment | a1b2c3d4"

          # Categorize spans by pattern matching
          - set(span.attributes["category"], "database") where IsMatch(span.name, "(?i)(select|insert|update|delete|query)")
          - set(span.attributes["category"], "http") where IsMatch(span.name, "(?i)(http|get|post|put|delete|patch)")
          - set(span.attributes["category"], "messaging") where IsMatch(span.name, "(?i)(publish|consume|receive|send)")
          - set(span.attributes["category"], "cache") where IsMatch(span.name, "(?i)(redis|memcached|cache)")

          # Set a default category for uncategorized spans
          - set(span.attributes["category"], "other") where span.attributes["category"] == nil
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/enrich:
    trace_statements:
      - context: span
        statements:
          # Build composite keys for grouping
          - set(span.attributes["endpoint.key"], Concat([span.attributes["http.method"], span.attributes["http.route"]], " ")) where span.attributes["http.method"] != nil and span.attributes["http.route"] != nil

          # Categorize by span name pattern
          - set(span.attributes["op.type"], "db") where IsMatch(span.name, "^(SELECT|INSERT|UPDATE|DELETE|QUERY).*")
          - set(span.attributes["op.type"], "http") where IsMatch(span.name, "^HTTP .*")
          - set(span.attributes["op.type"], "grpc") where IsMatch(span.name, "^.*\\..*\\/.*")
          - set(span.attributes["op.type"], "internal") where span.attributes["op.type"] == nil

          # Add trace ID prefix for quick reference
          - set(span.attributes["trace.prefix"], Substring(span.trace_id.string, 0, 8))

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
      processors: [transform/enrich, batch]
      exporters: [otlp]
```

OTTL converter functions are the building blocks for Collector-side telemetry enrichment. Combined with `set` and `where` clauses, they let you compute derived attributes, categorize spans, and normalize data without changing your application code.
