# How to Fix Span Events Being Silently Dropped Because They Exceed the Maximum Events Per Span Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Events, SDK Limits, Tracing

Description: Fix span events being silently dropped when they exceed the SDK default limit of 128 events per span.

You are adding events to spans to record important milestones: exceptions, log messages, state transitions. But when you look at the spans in your backend, only some events appear. The rest were silently dropped by the SDK because you hit the maximum events-per-span limit. Here is how to detect and fix this.

## Understanding Span Events

Span events are timestamped annotations attached to a span. They are commonly used for:

- Recording exceptions (`span.record_exception()`)
- Logging significant state changes
- Adding debugging context

```python
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

with tracer.start_as_current_span("process-batch") as span:
    for item in batch:
        try:
            process(item)
            span.add_event("item.processed", {"item.id": item.id})
        except Exception as e:
            span.record_exception(e)  # This also adds an event
            span.add_event("item.failed", {"item.id": item.id, "error": str(e)})
```

If your batch has 200 items, you could add 200+ events to a single span. The SDK default limit is 128 events per span.

## The Default Limit

The OpenTelemetry specification defines a default limit of 128 events per span. Once this limit is reached, new events are silently dropped:

```python
# Default SpanLimits in the Python SDK
# max_events = 128
# max_attributes = 128
# max_links = 128
# max_attribute_length = None
```

## Detecting the Problem

The SDK does not log a warning when events are dropped (in most implementations). You need to compare what you sent with what arrived at the backend:

```python
# Add debug logging to count events
import logging
logger = logging.getLogger(__name__)

event_count = 0
with tracer.start_as_current_span("process-batch") as span:
    for item in batch:
        span.add_event("item.processed", {"item.id": item.id})
        event_count += 1

    logger.info(f"Added {event_count} events to span")
    # If event_count > 128, events were dropped
```

In your backend, check the event count on the span:

```sql
-- Query your backend for span event counts
SELECT span_id, count(events) as event_count
FROM spans
WHERE span_name = 'process-batch'
AND event_count = 128  -- Spans at exactly the limit are suspicious
```

## Fix 1: Increase the Events Per Span Limit

```python
from opentelemetry.sdk.trace import TracerProvider, SpanLimits

provider = TracerProvider(
    span_limits=SpanLimits(
        max_events=512,  # Increase from default 128
    )
)
trace.set_tracer_provider(provider)
```

Via environment variable:

```bash
export OTEL_SPAN_EVENT_COUNT_LIMIT=512
```

For Go:

```go
import "go.opentelemetry.io/otel/sdk/trace"

provider := trace.NewTracerProvider(
    trace.WithSpanLimits(trace.SpanLimits{
        EventCountLimit: 512,
    }),
)
```

For Java:

```bash
# Java agent configuration
export OTEL_SPAN_EVENT_COUNT_LIMIT=512
```

## Fix 2: Reduce the Number of Events

Instead of adding an event per item, aggregate them:

```python
with tracer.start_as_current_span("process-batch") as span:
    processed = 0
    failed = 0
    errors = []

    for item in batch:
        try:
            process(item)
            processed += 1
        except Exception as e:
            failed += 1
            errors.append(str(e))

    # Add summary events instead of per-item events
    span.add_event("batch.completed", {
        "items.processed": processed,
        "items.failed": failed,
    })

    # Only log unique errors
    if errors:
        unique_errors = list(set(errors))[:10]  # Cap at 10 unique errors
        span.add_event("batch.errors", {
            "error.count": failed,
            "unique_errors": ", ".join(unique_errors),
        })
```

## Fix 3: Use Child Spans Instead of Events

If each item is a significant operation, create child spans instead of events:

```python
with tracer.start_as_current_span("process-batch") as parent:
    parent.set_attribute("batch.size", len(batch))

    for item in batch:
        with tracer.start_as_current_span("process-item") as child:
            child.set_attribute("item.id", item.id)
            try:
                process(item)
                child.set_status(trace.StatusCode.OK)
            except Exception as e:
                child.record_exception(e)
                child.set_status(trace.StatusCode.ERROR, str(e))
```

This moves the per-item data from events on a single span to individual child spans, each with their own event limits.

## Fix 4: Use Span Attributes for Aggregated Data

For batch processing metrics, attributes might be more appropriate than events:

```python
with tracer.start_as_current_span("process-batch") as span:
    results = process_batch(batch)

    # Use attributes for summary data
    span.set_attribute("batch.total_items", len(batch))
    span.set_attribute("batch.success_count", results.success)
    span.set_attribute("batch.failure_count", results.failure)
    span.set_attribute("batch.duration_ms", results.duration_ms)

    # Only add events for exceptional cases
    if results.failure > 0:
        span.add_event("batch.had_failures", {
            "failure_rate": results.failure / len(batch),
        })
```

## Fix 5: Configure Limits in the Collector

The Collector does not have a per-span event limit, but you can use the transform processor to trim events before exporting:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # You can filter events here, but there is no built-in
          # "limit events" function. Consider using a custom processor
          # or handling this at the SDK level.
```

## Best Practices

1. Use events for exceptional or notable occurrences, not routine operations
2. If you process items in a loop, aggregate results into a few summary events
3. Set the event limit explicitly rather than relying on the default
4. Monitor the number of events per span in your backend to catch limit issues early
5. Use the `OTEL_SPAN_EVENT_COUNT_LIMIT` environment variable for easy configuration without code changes

Events are a valuable part of the span data model, but they should be used judiciously. A span with 128 events is already quite large and will increase export payload size significantly. If you find yourself needing more events, consider whether the data model is right for your use case.
