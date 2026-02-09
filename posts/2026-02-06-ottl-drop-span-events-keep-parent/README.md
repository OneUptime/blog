# How to Use OTTL to Drop Specific Span Events While Keeping the Parent Span Intact

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Span Events, Transform Processor

Description: Use OTTL to selectively drop specific span events like verbose exception details while keeping the parent span and its attributes intact.

Span events add context to spans, but they can also add significant volume. Exception events with full stack traces, large log-like events attached to spans, and verbose debugging events all increase storage costs and can slow down trace rendering in your backend. OTTL lets you selectively remove specific span events while keeping the span itself and its other events intact.

## What Are Span Events

Span events are timestamped records attached to a span. Common examples:

- Exception events (added by `span.record_exception()`)
- Log events (added by some instrumentation libraries)
- Custom events (added by application code with `span.add_event()`)

Each event has a name, a timestamp, and a set of attributes.

## Dropping Events by Name

Use the `delete_matching_key` approach or the span event context in OTTL:

```yaml
processors:
  transform/drop_events:
    trace_statements:
      - context: spanevent
        statements:
          # Drop exception events that have specific exception types
          - delete_key(attributes, "exception.stacktrace") where name == "exception" and IsMatch(attributes["exception.type"], "(?i).*NotFound.*")

          # Remove the stack trace from all exception events
          # Keeps the exception type and message, just drops the trace
          - delete_key(attributes, "exception.stacktrace") where name == "exception"
```

## Removing Specific Event Attributes

Sometimes you want to keep the event but remove bulky attributes:

```yaml
processors:
  transform/trim_events:
    trace_statements:
      - context: spanevent
        statements:
          # Remove stack traces from all exception events
          # This can save significant storage
          - delete_key(attributes, "exception.stacktrace") where name == "exception"

          # Truncate exception messages to 500 characters
          - set(attributes["exception.message"], Substring(attributes["exception.message"], 0, 500)) where name == "exception" and attributes["exception.message"] != nil and Len(attributes["exception.message"]) > 500

          # Remove verbose debugging attributes from custom events
          - delete_key(attributes, "debug.payload") where name == "debug_info"
          - delete_key(attributes, "debug.raw_response") where name == "debug_info"
```

## Conditional Event Removal Based on Span Attributes

You might want to keep exception events for error spans but drop them for successful spans:

```yaml
processors:
  transform/conditional_events:
    trace_statements:
      # First, at the span level, mark spans that should keep exceptions
      - context: span
        statements:
          - set(attributes["_keep_exceptions"], true) where status.code == 2

      # Then, at the event level, handle based on the span's marker
      - context: spanevent
        statements:
          # Remove stack traces from exception events on non-error spans
          # These are typically caught-and-handled exceptions
          - delete_key(attributes, "exception.stacktrace") where name == "exception"
```

## Removing Verbose Log Events

Some instrumentation libraries attach log records as span events. These can be very verbose:

```yaml
processors:
  transform/drop_log_events:
    trace_statements:
      - context: spanevent
        statements:
          # Remove debug-level log events from spans
          - delete_key(attributes, "log.message") where IsMatch(name, "(?i)^log$") and attributes["log.severity"] == "DEBUG"

          # Truncate info-level log event messages
          - set(attributes["log.message"], Substring(attributes["log.message"], 0, 256)) where IsMatch(name, "(?i)^log$") and attributes["log.severity"] == "INFO" and Len(attributes["log.message"]) > 256
```

## Keeping Only the First N Events

While OTTL does not have a direct "limit events count" function, you can truncate events at the span level:

```yaml
processors:
  transform/limit_events:
    trace_statements:
      - context: span
        statements:
          # Limit the number of events and links per span
          # This uses the limit function if available
          - limit(span_events, 10, [])
```

Note: The `limit` function availability depends on your Collector version. Check the OTTL function documentation for your specific version.

## Removing Events from Health Check Spans

Health check spans often have unnecessary events:

```yaml
processors:
  transform/clean_health_checks:
    trace_statements:
      - context: spanevent
        statements:
          # Remove all events from health check spans
          # We do not need event details for health checks
          - delete_key(attributes, "exception.stacktrace") where IsMatch(name, "(?i)^exception$")
          - delete_key(attributes, "exception.message") where IsMatch(name, "(?i)^exception$")

      - context: span
        statements:
          # Alternative: remove all events from health check spans
          # by clearing the event list
          - limit(span_events, 0, []) where IsMatch(name, "(?i).*(health|ready|alive).*")
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/manage_events:
    trace_statements:
      # Span-level transformations
      - context: span
        statements:
          # Remove all events from noisy spans
          - limit(span_events, 0, []) where IsMatch(name, "(?i).*(health_check|ping|readiness).*")

          # Limit events on normal spans to prevent overload
          - limit(span_events, 5, []) where name != ""

      # Event-level transformations
      - context: spanevent
        statements:
          # Truncate stack traces to 2KB
          - set(attributes["exception.stacktrace"], Substring(attributes["exception.stacktrace"], 0, 2048)) where attributes["exception.stacktrace"] != nil and Len(attributes["exception.stacktrace"]) > 2048

          # Remove debug payloads from events
          - delete_key(attributes, "debug.payload")
          - delete_key(attributes, "debug.raw_request")
          - delete_key(attributes, "debug.raw_response")

          # Truncate event attributes
          - truncate_all(attributes, 512)

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
      processors: [transform/manage_events, batch]
      exporters: [otlp]
```

## Measuring the Impact

Before and after deploying event management, compare:

1. **Span payload size**: Check the average bytes per span in the Collector's internal metrics
2. **Export throughput**: Smaller spans export faster
3. **Storage costs**: Check your backend's storage usage

A common observation is that exception stack traces account for 60-80% of span data volume. Truncating them to 2KB or removing them entirely can dramatically reduce your telemetry bill.

Selective span event management gives you the observability data you need for debugging while keeping costs under control. Keep exception types and messages for error detection, truncate stack traces to reasonable lengths, and remove verbose debugging events from production spans.
