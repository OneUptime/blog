# How to Convert Span Events into Log Records and Metric Data Points Using Collector Connectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Events, Connectors, Logs, Metrics

Description: Convert OpenTelemetry span events into standalone log records and metric data points using Collector connectors and processors.

Span events are timestamped annotations attached to a span. They capture things like exceptions, retry attempts, cache hits/misses, and state transitions. But span events are buried inside traces. If you want to search for all exceptions across your system, or count cache miss rates as a metric, you need to extract those events into standalone log records and metric data points. The OpenTelemetry Collector makes this possible with connectors and processors.

## What Are Span Events?

A span event is a structured annotation with a timestamp, a name, and attributes. Here is what they look like in application code:

```python
# Python: adding span events
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        # Event: order validation started
        span.add_event("order.validation.started", {
            "order.id": order.id,
            "item_count": len(order.items),
        })

        validate(order)

        # Event: payment attempt
        span.add_event("payment.attempt", {
            "provider": "stripe",
            "amount": order.total,
            "currency": "USD",
        })

        try:
            charge(order)
        except PaymentError as e:
            # Exception events are a special type of span event
            span.record_exception(e)
            span.add_event("payment.retry", {
                "attempt": 2,
                "reason": str(e),
            })
            charge(order)  # retry

        span.add_event("order.completed", {
            "order.id": order.id,
        })
```

These events are only visible when you open a specific trace in your trace UI. You cannot search across all traces for `payment.retry` events or count how many times they occur.

## Converting Span Events to Log Records

The `transform` processor in the collector can extract span events and convert them to standalone log records:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # Span-to-log connector: converts span events to log records
  spantolog:
    # Which events to convert
    events:
      - name: "exception"        # convert exception events
      - name: "payment.retry"    # convert retry events
      - name: "payment.attempt"  # convert payment attempts

processors:
  batch:
    timeout: 5s

  # Transform span events into structured log records
  transform/events_to_logs:
    trace_statements:
      - context: spanevent
        statements:
          # Copy event attributes to the log record
          - set(attributes["event.name"], name)
          - set(attributes["source"], "span_event")

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
      exporters: [otlp/traces, spantolog]

    logs:
      receivers: [otlp, spantolog]
      processors: [batch]
      exporters: [otlp/logs]
```

The connector takes span events from the trace pipeline and emits them as log records in the log pipeline. Each log record carries:

- The original event name, timestamp, and attributes
- The trace ID and span ID from the parent span (preserving correlation)
- The resource attributes from the parent span

## Using the Transform Processor for Event Extraction

If the spantolog connector is not available in your collector build, you can use the transform processor to achieve similar results:

```yaml
processors:
  transform/extract_events:
    trace_statements:
      - context: spanevent
        conditions:
          # Only process exception events
          - name == "exception"
        statements:
          # These attributes will be available in derived log records
          - set(attributes["log.source"], "span_event")
          - set(attributes["original.span.name"], span.name)
          - set(attributes["event.name"], name)
```

## Converting Span Events to Metrics

Some span events are better represented as metrics. For example, counting `payment.retry` events as a counter tells you how often retries happen across your system. Use the `count` connector or build it with the `spanmetrics` connector:

```yaml
connectors:
  # Custom counting connector for specific span events
  count:
    spans:
      span.events.exception:
        description: "Count of exception events"
        conditions:
          - 'IsMatch(events["exception"].name, "exception")'
        attributes:
          - key: service.name
            default_value: "unknown"
          - key: exception.type

    spanevents:
      payment.retry.count:
        description: "Count of payment retry events"
        conditions:
          - 'name == "payment.retry"'
        attributes:
          - key: payment.provider
```

Alternative approach using the transform and routing processors:

```yaml
processors:
  # Count span events and emit as metrics
  transform/event_metrics:
    trace_statements:
      - context: spanevent
        statements:
          # Tag events for metric extraction
          - set(attributes["metric.name"], Concat(["event.", name], ""))
            where name == "payment.retry" or name == "cache.miss" or name == "exception"
```

## A Practical Example: Exception Tracking

One of the most valuable event-to-log conversions is turning exception span events into searchable log records:

```yaml
# collector-config.yaml focused on exception extraction
connectors:
  spantolog/exceptions:
    events:
      - name: "exception"

processors:
  # Enrich the extracted exception logs
  transform/exceptions:
    log_statements:
      - context: log
        conditions:
          - attributes["event.name"] == "exception"
        statements:
          # Set severity to ERROR for exception events
          - set(severity_text, "ERROR")
          - set(severity_number, 17)
          # Create a structured log body
          - set(body, Concat([
              "Exception in ",
              attributes["original.span.name"],
              ": ",
              attributes["exception.type"],
              " - ",
              attributes["exception.message"]
            ], ""))

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, spantolog/exceptions]

    logs:
      receivers: [spantolog/exceptions]
      processors: [transform/exceptions, batch]
      exporters: [otlp/logs]
```

Now you can search all exceptions across all services in your log backend:

```
# LogQL query for all exceptions derived from span events
{source="span_event"} | json | event_name="exception" | line_format "{{.exception_type}}: {{.exception_message}}"
```

## Cache Hit/Miss Metrics from Span Events

Another practical use case is converting cache-related span events into metrics:

```python
# Application code that records cache events
def get_user(user_id):
    with tracer.start_as_current_span("get_user") as span:
        cached = cache.get(f"user:{user_id}")
        if cached:
            span.add_event("cache.hit", {"cache.key": f"user:{user_id}"})
            return cached
        else:
            span.add_event("cache.miss", {"cache.key": f"user:{user_id}"})
            user = db.query_user(user_id)
            cache.set(f"user:{user_id}", user)
            return user
```

The collector config to extract cache metrics:

```yaml
connectors:
  count:
    spanevents:
      cache.hits:
        description: "Cache hit count"
        conditions:
          - 'name == "cache.hit"'
      cache.misses:
        description: "Cache miss count"
        conditions:
          - 'name == "cache.miss"'
```

This gives you a `cache.hits` and `cache.misses` counter metric that you can use to calculate cache hit rates:

```promql
# Cache hit rate
sum(rate(cache_hits[5m])) / (sum(rate(cache_hits[5m])) + sum(rate(cache_misses[5m])))
```

## Wrapping Up

Span events contain valuable structured data that is otherwise locked inside individual traces. By extracting them into standalone log records and metric data points, you make that data searchable, countable, and alertable. Use the spantolog connector for log extraction, the count connector for metric derivation, and the transform processor for enrichment. The correlation is preserved through trace IDs, so you can always navigate back from a derived log or metric to the original span.
