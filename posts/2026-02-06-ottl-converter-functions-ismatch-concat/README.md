# How to Use OTTL Converter Functions (IsMatch, Concat, SpanID) for Advanced Telemetry Manipulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Converter Functions, Transform Processor

Description: Use OTTL converter functions like IsMatch, Concat, and SpanID for advanced telemetry manipulation in the Collector's transform processor.

OTTL converter functions transform values without modifying the telemetry directly. They are used inside OTTL statements to compute new values, match patterns, or extract information from existing fields. Functions like `IsMatch`, `Concat`, `SpanID`, `TraceID`, `Int`, and `Substring` give you the building blocks for complex transformations.

## Converter Functions Overview

Converter functions return a value. They do not modify telemetry on their own but are used as arguments to editor functions like `set`, or in `where` clauses as conditions.

```yaml
# Pattern: set(target, ConverterFunction(args)) where Condition(args)
- set(attributes["key"], Concat(["a", "b"], "-")) where IsMatch(name, "http.*")
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
          - set(attributes["span.type"], "http") where IsMatch(name, "^HTTP (GET|POST|PUT|DELETE).*")

          # Match spans with database operations
          - set(attributes["span.type"], "db") where IsMatch(name, "^(SELECT|INSERT|UPDATE|DELETE).*")

          # Match service names with a pattern
          - set(attributes["team"], "platform") where IsMatch(resource.attributes["service.name"], "^(auth|gateway|proxy)-.*")

          # Match URLs containing API version paths
          - set(attributes["api.versioned"], true) where IsMatch(attributes["http.url"], ".*/v[0-9]+/.*")

          # Match error messages containing specific patterns
          - set(attributes["error.category"], "timeout") where IsMatch(attributes["exception.message"], "(?i)timeout|timed out|deadline exceeded")
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
          - set(attributes["route.key"], Concat([attributes["http.method"], attributes["http.route"]], " "))
          # Result: "GET /api/users"

          # Create a fully qualified service identifier
          - set(attributes["service.fqn"], Concat([resource.attributes["k8s.namespace.name"], resource.attributes["service.name"]], "/"))
          # Result: "production/checkout-service"

          # Build an error summary
          - set(attributes["error.summary"], Concat([attributes["exception.type"], attributes["exception.message"]], ": ")) where status.code == 2
          # Result: "ValueError: invalid input"
```

## SpanID and TraceID: ID Extraction

`SpanID` and `TraceID` return the hex string representation of the current span or trace ID:

```yaml
processors:
  transform/ids:
    trace_statements:
      - context: span
        statements:
          # Store trace and span IDs as attributes for easier querying
          - set(attributes["trace.id.string"], TraceID())
          - set(attributes["span.id.string"], SpanID())

    log_statements:
      - context: log
        statements:
          # Store trace ID on logs for correlation
          - set(attributes["trace.id.string"], TraceID()) where TraceID() != nil
          - set(attributes["span.id.string"], SpanID()) where SpanID() != nil
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
          - set(attributes["http.status_code_int"], Int(attributes["http.status_code"])) where attributes["http.status_code"] != nil

          # Convert string duration to double
          - set(attributes["duration_seconds"], Double(attributes["duration_str"])) where attributes["duration_str"] != nil
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
          - set(attributes["trace.id.short"], Substring(TraceID(), 0, 8))

          # Extract HTTP method from span name like "HTTP GET /api/users"
          - set(attributes["http.method.extracted"], Substring(name, 5, 8)) where IsMatch(name, "^HTTP (GET|POST|PUT).*")
```

## Len: Getting Collection Size

```yaml
processors:
  transform/length:
    trace_statements:
      - context: span
        statements:
          # Count the length of a string attribute
          - set(attributes["url.length"], Len(attributes["http.url"])) where attributes["http.url"] != nil
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
          - set(attributes["span.description"], Concat([resource.attributes["service.name"], name, Substring(TraceID(), 0, 8)], " | "))
          # Result: "checkout-service | process_payment | a1b2c3d4"

          # Categorize spans by pattern matching
          - set(attributes["category"], "database") where IsMatch(name, "(?i)(select|insert|update|delete|query)")
          - set(attributes["category"], "http") where IsMatch(name, "(?i)(http|get|post|put|delete|patch)")
          - set(attributes["category"], "messaging") where IsMatch(name, "(?i)(publish|consume|receive|send)")
          - set(attributes["category"], "cache") where IsMatch(name, "(?i)(redis|memcached|cache)")

          # Set a default category for uncategorized spans
          - set(attributes["category"], "other") where attributes["category"] == nil
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
          - set(attributes["endpoint.key"], Concat([attributes["http.method"], attributes["http.route"]], " ")) where attributes["http.method"] != nil and attributes["http.route"] != nil

          # Categorize by span name pattern
          - set(attributes["op.type"], "db") where IsMatch(name, "^(SELECT|INSERT|UPDATE|DELETE|QUERY).*")
          - set(attributes["op.type"], "http") where IsMatch(name, "^HTTP .*")
          - set(attributes["op.type"], "grpc") where IsMatch(name, "^.*\\..*\\/.*")
          - set(attributes["op.type"], "internal") where attributes["op.type"] == nil

          # Add trace ID prefix for quick reference
          - set(attributes["trace.prefix"], Substring(TraceID(), 0, 8))

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
