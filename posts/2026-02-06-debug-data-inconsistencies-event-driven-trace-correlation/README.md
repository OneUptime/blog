# How to Debug Data Inconsistencies in Event-Driven Systems Using OpenTelemetry Trace Correlation Across Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Event-Driven, Data Consistency, Message Queues, Trace Correlation

Description: Debug data inconsistencies in event-driven architectures by correlating OpenTelemetry traces across message queues and event handlers.

In event-driven systems, data inconsistencies are the silent killer. Service A publishes an "order created" event. Services B, C, and D all consume it and update their own data stores. But sometimes Service C misses the event, or processes it out of order, and suddenly the data across services does not agree. Debugging this without tracing is nearly impossible because the problem spans multiple services, multiple queues, and multiple time windows. OpenTelemetry trace correlation gives you the thread to pull.

## The Core Problem

Event-driven architectures trade strong consistency for scalability. Each service processes events independently, which means:

- Events can arrive out of order
- Events can be processed more than once (at-least-once delivery)
- Events can be lost (if the queue is misconfigured)
- Events can be processed at different times by different consumers

Any of these scenarios can cause data to diverge across services.

## Setting Up Cross-Queue Trace Correlation

The key is to maintain trace context as events flow through queues. Here is how to propagate context through a multi-stage event pipeline:

```python
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract
import json
import time

tracer = trace.get_tracer("event-pipeline")

class EventPublisher:
    def __init__(self, queue_client):
        self.queue = queue_client

    def publish(self, event_type, payload, correlation_id=None):
        """Publish an event with full trace context."""
        with tracer.start_as_current_span(
            f"event.publish.{event_type}",
            kind=trace.SpanKind.PRODUCER,
        ) as span:
            # Generate or reuse correlation ID for tracking
            # across the entire event chain
            if not correlation_id:
                correlation_id = span.get_span_context().trace_id

            span.set_attribute("event.type", event_type)
            span.set_attribute("event.correlation_id", format(correlation_id, '032x'))

            # Build the event envelope with trace context
            headers = {}
            inject(headers)

            envelope = {
                "type": event_type,
                "payload": payload,
                "metadata": {
                    "correlation_id": format(correlation_id, '032x'),
                    "published_at": time.time(),
                    "source_service": "order-service",
                    "trace_context": headers,
                },
            }

            self.queue.publish(
                topic=f"events.{event_type}",
                message=json.dumps(envelope),
            )

            return envelope["metadata"]["correlation_id"]
```

## Consumer with Trace Correlation

Each consumer extracts the trace context and continues the trace:

```python
class EventConsumer:
    def __init__(self, service_name, queue_client):
        self.service_name = service_name
        self.queue = queue_client
        self.handlers = {}

    def register_handler(self, event_type, handler):
        self.handlers[event_type] = handler

    def process_event(self, raw_message):
        envelope = json.loads(raw_message)
        event_type = envelope["type"]
        correlation_id = envelope["metadata"]["correlation_id"]

        # Extract parent trace context from the event
        parent_ctx = extract(envelope["metadata"]["trace_context"])

        with tracer.start_as_current_span(
            f"event.process.{event_type}",
            context=parent_ctx,
            kind=trace.SpanKind.CONSUMER,
        ) as span:
            span.set_attribute("event.type", event_type)
            span.set_attribute("event.correlation_id", correlation_id)
            span.set_attribute("event.consumer_service", self.service_name)

            # Calculate delivery latency
            published_at = envelope["metadata"]["published_at"]
            delivery_latency_ms = (time.time() - published_at) * 1000
            span.set_attribute("event.delivery_latency_ms", delivery_latency_ms)

            # Process the event
            handler = self.handlers.get(event_type)
            if handler:
                try:
                    handler(envelope["payload"], span)
                    span.set_attribute("event.processed", True)
                except Exception as e:
                    span.set_attribute("event.processed", False)
                    span.set_attribute("error", True)
                    span.record_exception(e)
                    raise
            else:
                span.set_attribute("event.processed", False)
                span.set_attribute("event.no_handler", True)
```

## Detecting Missing Event Processing

The most common cause of data inconsistency is a service that fails to process an event. You can detect this by checking which services processed each event:

```python
def find_missing_event_processing(traces, expected_consumers):
    """
    For each event, verify that all expected consumers processed it.

    expected_consumers = {
        "order.created": ["inventory-service", "billing-service", "notification-service"],
        "order.cancelled": ["inventory-service", "billing-service"],
    }
    """
    events = {}

    for trace_data in traces:
        for span in trace_data["spans"]:
            attrs = span.get("attributes", {})

            if span["name"].startswith("event.publish."):
                event_type = attrs.get("event.type")
                correlation_id = attrs.get("event.correlation_id")
                if correlation_id:
                    events.setdefault(correlation_id, {
                        "type": event_type,
                        "published_at": span["startTime"],
                        "consumers": set(),
                    })

            elif span["name"].startswith("event.process."):
                correlation_id = attrs.get("event.correlation_id")
                consumer = attrs.get("event.consumer_service")
                processed = attrs.get("event.processed", False)

                if correlation_id and consumer and processed:
                    if correlation_id in events:
                        events[correlation_id]["consumers"].add(consumer)

    # Find events with missing consumers
    missing = []
    for corr_id, event_info in events.items():
        expected = set(expected_consumers.get(event_info["type"], []))
        actual = event_info["consumers"]
        missed = expected - actual

        if missed:
            missing.append({
                "correlation_id": corr_id,
                "event_type": event_info["type"],
                "expected_consumers": list(expected),
                "actual_consumers": list(actual),
                "missing_consumers": list(missed),
            })

    return missing
```

## Detecting Out-of-Order Processing

Events that arrive out of order can cause logical inconsistencies (for example, processing "order.shipped" before "order.created"):

```python
def detect_out_of_order_events(traces, expected_order):
    """
    Detect events processed out of their expected logical order.

    expected_order = ["order.created", "order.paid", "order.shipped"]
    """
    # Group events by correlation ID
    event_chains = {}

    for trace_data in traces:
        for span in trace_data["spans"]:
            if not span["name"].startswith("event.process."):
                continue

            attrs = span.get("attributes", {})
            corr_id = attrs.get("event.correlation_id")
            event_type = attrs.get("event.type")
            consumer = attrs.get("event.consumer_service")

            if corr_id and event_type:
                key = (corr_id, consumer)
                event_chains.setdefault(key, []).append({
                    "type": event_type,
                    "processed_at": span["startTime"],
                })

    # Check ordering
    violations = []
    for (corr_id, consumer), events in event_chains.items():
        events.sort(key=lambda e: e["processed_at"])
        actual_order = [e["type"] for e in events]

        # Check if actual order matches expected order
        actual_indices = []
        for event_type in actual_order:
            if event_type in expected_order:
                actual_indices.append(expected_order.index(event_type))

        # If indices are not monotonically increasing, we have an ordering violation
        for i in range(1, len(actual_indices)):
            if actual_indices[i] < actual_indices[i - 1]:
                violations.append({
                    "correlation_id": corr_id,
                    "consumer": consumer,
                    "expected_order": expected_order,
                    "actual_order": actual_order,
                })
                break

    return violations
```

## Building a Reconciliation Check

Use traces to build a periodic reconciliation that verifies data consistency:

```python
def reconciliation_report(traces, time_window_hours=1):
    """Generate a report of event processing health."""
    missing = find_missing_event_processing(traces, EXPECTED_CONSUMERS)
    out_of_order = detect_out_of_order_events(traces, EVENT_ORDER)

    total_events = count_published_events(traces)

    return {
        "time_window_hours": time_window_hours,
        "total_events_published": total_events,
        "missing_processing": len(missing),
        "out_of_order": len(out_of_order),
        "missing_rate_pct": round(len(missing) / total_events * 100, 2) if total_events > 0 else 0,
        "details": {
            "missing": missing[:10],
            "ordering_violations": out_of_order[:10],
        },
    }
```

## Summary

Data inconsistencies in event-driven systems come from missed events, duplicate processing, or out-of-order delivery. OpenTelemetry trace correlation across queues lets you verify that every event published was consumed by every expected service, that events were processed in the right order, and that the delivery latency was within bounds. Build a correlation ID into your event envelope, propagate trace context through queue headers, and run regular reconciliation checks against your trace data. When inconsistencies arise, the traces give you the exact event, the exact service, and the exact timestamp where things went wrong.
