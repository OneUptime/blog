# Use OTTL to Drop Specific Span Events While Keeping the Parent Span Intact

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

Use the filter processor with the span event context in OTTL:

```yaml
processors:
  filter/drop_events:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Drop exception events that have specific exception types
          - spanevent.name == "exception" and IsMatch(spanevent.attributes["exception.type"], "(?i).*NotFound.*")
```

## Removing Specific Event Attributes

Sometimes you want to keep the event but remove bulky attributes:

```yaml
processors:
  transform/trim_events:
    error_mode: ignore
    trace_statements:
      - context: spanevent
        statements:
          # Remove stack traces from all exception events
          # This can save significant storage
          - delete_key(spanevent.attributes, "exception.stacktrace") where spanevent.name == "exception"

          # Truncate exception messages to 500 characters
          - set(spanevent.attributes["exception.message"], Substring(spanevent.attributes["exception.message"], 0, 500)) where spanevent.name == "exception" and spanevent.attributes["exception.message"] != nil and Len(spanevent.attributes["exception.message"]) > 500

          # Remove verbose debugging attributes from custom events
          - delete_key(spanevent.attributes, "debug.payload") where spanevent.name == "debug_info"
          - delete_key(spanevent.attributes, "debug.raw_response") where spanevent.name == "debug_info"
```

## Conditional Event Removal Based on Span Attributes

You might want to keep exception events for error spans but drop them for successful spans:

```yaml
processors:
  filter/conditional_events:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Drop exception events on non-error spans
          # These are typically caught-and-handled exceptions
          - spanevent.name == "exception" and span.status.code != STATUS_CODE_ERROR
```

## Removing Verbose Log Events

Some instrumentation libraries attach log records as span events. These can be very verbose:

```yaml
processors:
  filter/drop_log_events:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Drop debug-level log events from spans
          - IsMatch(spanevent.name, "(?i)^log$") and spanevent.attributes["log.severity"] == "DEBUG"

  transform/trim_log_events:
    error_mode: ignore
    trace_statements:
      - context: spanevent
        statements:
          # Truncate info-level log event messages
          - set(spanevent.attributes["log.message"], Substring(spanevent.attributes["log.message"], 0, 256)) where IsMatch(spanevent.name, "(?i)^log$") and spanevent.attributes["log.severity"] == "INFO" and spanevent.attributes["log.message"] != nil and Len(spanevent.attributes["log.message"]) > 256
```

## Keeping Only the First N Events

The `limit` function applies to maps such as attributes, not the span event list. To keep only the first N events, drop span events whose `spanevent.event_index` is outside the range you want to keep:

```yaml
processors:
  filter/limit_events:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Keep the first 10 events and drop the rest
          - spanevent.event_index >= 10
```

## Removing Events from Health Check Spans

Health check spans often have unnecessary events:

```yaml
processors:
  filter/clean_health_checks:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Drop all events from health check spans
          # We do not need event details for health checks
          - IsMatch(span.name, "(?i).*(health|ready|alive).*")
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  filter/drop_events:
    error_mode: ignore
    trace_conditions:
      - context: spanevent
        conditions:
          # Drop all events from noisy spans
          - IsMatch(span.name, "(?i).*(health_check|ping|readiness).*")

          # Keep the first 5 events on normal spans and drop the rest
          - spanevent.event_index >= 5

  transform/manage_events:
    error_mode: ignore
    trace_statements:
      # Event-level transformations
      - context: spanevent
        statements:
          # Truncate stack traces to 2KB
          - set(spanevent.attributes["exception.stacktrace"], Substring(spanevent.attributes["exception.stacktrace"], 0, 2048)) where spanevent.attributes["exception.stacktrace"] != nil and Len(spanevent.attributes["exception.stacktrace"]) > 2048

          # Remove debug payloads from events
          - delete_key(spanevent.attributes, "debug.payload")
          - delete_key(spanevent.attributes, "debug.raw_request")
          - delete_key(spanevent.attributes, "debug.raw_response")

          # Truncate event attributes
          - truncate_all(spanevent.attributes, 512)

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
      processors: [filter/drop_events, transform/manage_events, batch]
      exporters: [otlp]
```

## Measuring the Impact

Before and after deploying event management, compare:

1. **Span payload size**: Check the average bytes per span in the Collector's internal metrics
2. **Export throughput**: Smaller spans export faster
3. **Storage costs**: Check your backend's storage usage

In workloads with large exception stack traces, those attributes can account for a large share of span event payload size. Truncating them to 2KB or removing them entirely can dramatically reduce your telemetry bill.

Selective span event management gives you the observability data you need for debugging while keeping costs under control. Keep exception types and messages for error detection, truncate stack traces to reasonable lengths, and remove verbose debugging events from production spans.
