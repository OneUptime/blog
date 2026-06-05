# How to Convert Span Events into Log Records and Metric Data Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Events, Connector, Log, Metric

Description: Convert OpenTelemetry span events into standalone log records and metric data points using Collector connectors and processors.

Span events are timestamped annotations attached to a span. They capture things like exceptions, retry attempts, cache hits/misses, and state transitions. But span events are buried inside traces. If you want to search for all exceptions across your system, or count cache miss rates as a metric, you need to extract those events into standalone log records and metric data points. The OpenTelemetry Collector makes this possible with the exceptions connector, the count connector, and processors.

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

## Converting Exception Span Events to Log Records

The `exceptions` connector in the collector can extract exception span events and convert them to standalone log records:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # Exceptions connector: converts exception span events to logs
  exceptions:

processors:
  batch:
    timeout: 5s

  # Enrich exception logs emitted by the connector
  transform/exception_logs:
    log_statements:
      - context: log
        statements:
          - set(log.attributes["source"], "span_event")
          - set(log.event_name, "exception") where log.attributes["exception.type"] != nil

exporters:
  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true

  otlphttp/logs:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, exceptions]

    logs:
      receivers: [otlp, exceptions]
      processors: [transform/exception_logs, batch]
      exporters: [otlphttp/logs]
```

The connector takes exception span events from the trace pipeline and emits them as log records in the log pipeline. Each log record carries:

- The original event timestamp and exception attributes
- The trace ID and span ID from the parent span (preserving correlation)
- The service name, span name, span kind, status code, stack trace, and span attributes

## Using the Transform Processor for Event Extraction

If you need to prepare span event attributes before deriving logs or metrics, you can use the transform processor. The transform processor modifies telemetry in the current pipeline; it does not create a new log pipeline by itself:

```yaml
processors:
  transform/extract_events:
    trace_statements:
      - context: spanevent
        conditions:
          # Only process exception events
          - spanevent.name == "exception"
        statements:
          # These attributes stay on the span event for downstream connectors/exporters
          - set(spanevent.attributes["log.source"], "span_event")
          - set(spanevent.attributes["original.span.name"], span.name)
          - set(spanevent.attributes["event.name"], spanevent.name)
```

## Converting Span Events to Metrics

Some span events are better represented as metrics. For example, counting `payment.retry` events as a counter tells you how often retries happen across your system. Use the `count` connector to count arbitrary span events:

```yaml
connectors:
  # Custom counting connector for specific span events
  count:
    spanevents:
      span.events.exception:
        description: "Count of exception events"
        conditions:
          - 'spanevent.name == "exception"'
        attributes:
          - key: service.name
            default_value: "unknown"
          - key: exception.type

      payment.retry.count:
        description: "Count of payment retry events"
        conditions:
          - 'spanevent.name == "payment.retry"'
        attributes:
          - key: provider
```

Alternative approach using the transform processor before the count connector:

```yaml
processors:
  # Normalize span events before metric extraction
  transform/event_metrics:
    trace_statements:
      - context: spanevent
        statements:
          # Tag events for metric extraction
          - set(spanevent.attributes["metric.name"], Concat(["event.", spanevent.name], "")) where spanevent.name == "payment.retry" or spanevent.name == "cache.miss" or spanevent.name == "exception"
```

## A Practical Example: Exception Tracking

One of the most valuable event-to-log conversions is turning exception span events into searchable log records:

```yaml
# collector-config.yaml focused on exception extraction
connectors:
  exceptions:

processors:
  # Enrich the extracted exception logs
  transform/exceptions:
    log_statements:
      - context: log
        conditions:
          - log.attributes["exception.type"] != nil
        statements:
          # Set severity to ERROR for exception events
          - set(log.severity_text, "ERROR")
          - set(log.severity_number, SEVERITY_NUMBER_ERROR)
          # Create a structured log body
          - |
            set(log.body, Concat([
              "Exception in ",
              log.attributes["span.name"],
              ": ",
              log.attributes["exception.type"],
              " - ",
              log.attributes["exception.message"]
            ], ""))

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, exceptions]

    logs:
      receivers: [exceptions]
      processors: [transform/exceptions, batch]
      exporters: [otlphttp/logs]
```

Now you can search all exceptions across all services in your log backend:

```text
# LogQL query for all exceptions derived from span events
{service_name=~".+"} | json | exception_type!="" | line_format "{{.exception_type}}: {{.exception_message}}"
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
          - 'spanevent.name == "cache.hit"'
      cache.misses:
        description: "Cache miss count"
        conditions:
          - 'spanevent.name == "cache.miss"'
```

This gives you a `cache.hits` and `cache.misses` counter metric that you can use to calculate cache hit rates:

```promql
# Cache hit rate
sum(rate(cache_hits[5m])) / (sum(rate(cache_hits[5m])) + sum(rate(cache_misses[5m])))
```

## Wrapping Up

Span events contain valuable structured data that is otherwise locked inside individual traces. By extracting exception events into standalone log records and counting selected span events as metric data points, you make that data searchable, countable, and alertable. Use the exceptions connector for exception log extraction, the count connector for metric derivation, and the transform processor for enrichment. The correlation is preserved through trace IDs on generated exception logs, so you can navigate back from a derived log to the original span.
