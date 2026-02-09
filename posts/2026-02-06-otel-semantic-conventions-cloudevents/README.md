# How to Use OpenTelemetry Semantic Conventions for CloudEvents (cloudevents.event_id, cloudevents.event_source)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, CloudEvents, Span Attributes

Description: Apply OpenTelemetry semantic conventions for CloudEvents attributes to ensure consistent and queryable event-driven telemetry data.

OpenTelemetry semantic conventions define standard attribute names that all instrumentation should use. For CloudEvents, this means using attributes like `cloudevents.event_id`, `cloudevents.event_source`, and `cloudevents.event_type` consistently. When every service uses the same attribute names, you can query and correlate events across your entire system.

## The CloudEvents Semantic Convention Attributes

The CloudEvents specification defines several required and optional context attributes. Here is how they map to OpenTelemetry span attributes:

| CloudEvents Attribute | OTel Span Attribute | Description |
|---|---|---|
| id | `cloudevents.event_id` | Unique identifier of the event |
| source | `cloudevents.event_source` | URI identifying the event source |
| type | `cloudevents.event_type` | Type of the event |
| specversion | `cloudevents.event_spec_version` | CloudEvents spec version |
| subject | `cloudevents.event_subject` | Subject of the event in context of the source |
| datacontenttype | `cloudevents.event_data_content_type` | Content type of the data |

## Implementing a Helper Function

Create a utility that extracts CloudEvents attributes and sets them on spans consistently:

```python
from opentelemetry import trace

def set_cloudevent_attributes(span, cloud_event):
    """
    Set standard CloudEvents semantic convention attributes on a span.

    This ensures every span that touches a CloudEvent has consistent,
    queryable attributes regardless of which service produced it.
    """
    # Required CloudEvents attributes
    span.set_attribute("cloudevents.event_id", cloud_event.get("id", ""))
    span.set_attribute("cloudevents.event_source", cloud_event.get("source", ""))
    span.set_attribute("cloudevents.event_type", cloud_event.get("type", ""))
    span.set_attribute(
        "cloudevents.event_spec_version",
        cloud_event.get("specversion", "1.0")
    )

    # Optional CloudEvents attributes (only set if present)
    if "subject" in cloud_event:
        span.set_attribute("cloudevents.event_subject", cloud_event["subject"])

    if "datacontenttype" in cloud_event:
        span.set_attribute(
            "cloudevents.event_data_content_type",
            cloud_event["datacontenttype"]
        )

    if "time" in cloud_event:
        span.set_attribute("cloudevents.event_time", cloud_event["time"])
```

## Using the Helper in a Producer

```python
from cloudevents.http import CloudEvent
from cloudevents.conversion import to_json
import uuid
from datetime import datetime

tracer = trace.get_tracer("order-service")

def publish_order_event(order_data, event_type):
    """Publish an order event with proper semantic convention attributes."""
    with tracer.start_as_current_span(
        f"publish {event_type}",
        kind=trace.SpanKind.PRODUCER,
    ) as span:
        # Create the CloudEvent
        event = CloudEvent({
            "id": str(uuid.uuid4()),
            "source": "/services/order-service",
            "type": f"com.example.order.{event_type}",
            "specversion": "1.0",
            "subject": f"order/{order_data['order_id']}",
            "datacontenttype": "application/json",
            "time": datetime.utcnow().isoformat() + "Z",
        }, order_data)

        # Apply semantic conventions to the span
        set_cloudevent_attributes(span, {
            "id": event["id"],
            "source": event["source"],
            "type": event["type"],
            "specversion": event["specversion"],
            "subject": event["subject"],
            "datacontenttype": event["datacontenttype"],
            "time": event["time"],
        })

        # Also set messaging semantic conventions
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.operation", "publish")

        payload = to_json(event)
        send_to_broker(payload)
        return event
```

## Using the Helper in a Consumer

```python
consumer_tracer = trace.get_tracer("fulfillment-service")

def handle_incoming_event(raw_event):
    """Process an incoming CloudEvent with semantic convention attributes."""
    from cloudevents.http import from_json
    event = from_json(raw_event)

    with consumer_tracer.start_as_current_span(
        f"process {event['type']}",
        kind=trace.SpanKind.CONSUMER,
    ) as span:
        # Apply the same semantic conventions on the consumer side
        set_cloudevent_attributes(span, {
            "id": event["id"],
            "source": event["source"],
            "type": event["type"],
            "specversion": event["specversion"],
            "subject": event.get("subject", ""),
        })

        # Add consumer-specific attributes
        span.set_attribute("messaging.operation", "receive")
        span.set_attribute("messaging.consumer.group", "fulfillment-group")

        process_event(event)
```

## TypeScript Implementation

For Node.js services, here is the same pattern in TypeScript:

```typescript
import { Span } from "@opentelemetry/api";
import { CloudEvent } from "cloudevents";

interface CloudEventAttributes {
  id: string;
  source: string;
  type: string;
  specversion?: string;
  subject?: string;
  datacontenttype?: string;
  time?: string;
}

function setCloudEventAttributes(
  span: Span,
  event: CloudEventAttributes
): void {
  // Required attributes
  span.setAttribute("cloudevents.event_id", event.id);
  span.setAttribute("cloudevents.event_source", event.source);
  span.setAttribute("cloudevents.event_type", event.type);
  span.setAttribute("cloudevents.event_spec_version", event.specversion || "1.0");

  // Optional attributes
  if (event.subject) {
    span.setAttribute("cloudevents.event_subject", event.subject);
  }
  if (event.datacontenttype) {
    span.setAttribute("cloudevents.event_data_content_type", event.datacontenttype);
  }
  if (event.time) {
    span.setAttribute("cloudevents.event_time", event.time);
  }
}

// Usage in a producer
function publishEvent(orderData: any): void {
  tracer.startActiveSpan("publish order.created", { kind: SpanKind.PRODUCER }, (span) => {
    const event = new CloudEvent({
      id: crypto.randomUUID(),
      source: "/services/notification-service",
      type: "com.example.notification.sent",
      datacontenttype: "application/json",
      data: orderData,
    });

    setCloudEventAttributes(span, {
      id: event.id,
      source: event.source,
      type: event.type,
    });

    broker.publish("notifications", event);
    span.end();
  });
}
```

## Querying with Semantic Conventions

When all your services use these conventions, you can write powerful queries:

```
# Find all spans for a specific event type across all services
cloudevents.event_type = "com.example.order.created"

# Find all events from a specific source
cloudevents.event_source = "/services/order-service"

# Track a specific event through the system
cloudevents.event_id = "abc-123-def-456"

# Find events for a specific subject
cloudevents.event_subject = "order/ORD-789"
```

Consistent use of semantic conventions is what makes your telemetry data useful at scale. When every team and every service uses the same attribute names, you can build dashboards and alerts that work across the entire organization without per-service customization.
