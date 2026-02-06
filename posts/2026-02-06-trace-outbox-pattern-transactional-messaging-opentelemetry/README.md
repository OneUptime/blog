# How to Trace Outbox Pattern and Transactional Messaging with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Outbox Pattern, Transactional Messaging, Distributed Tracing, Microservices, Database

Description: Learn how to trace the outbox pattern and transactional messaging with OpenTelemetry to maintain end-to-end visibility across database commits and message publishing.

---

The outbox pattern solves one of the hardest problems in distributed systems: making sure a database write and a message publish either both happen or neither happens. Without it, you risk situations where you save an order to the database but the "OrderCreated" event never gets published, leaving downstream services out of sync.

The pattern works by writing the outgoing event to an "outbox" table within the same database transaction as the business data. A separate process then reads from the outbox table and publishes the messages to the broker. It's reliable, but it introduces a tracing challenge. The database write and the message publish happen in different processes at different times. How do you keep the trace connected?

This post shows you exactly how to trace through the outbox pattern using OpenTelemetry, maintaining end-to-end visibility from the original API call through the database transaction, the outbox relay, and the downstream consumer.

## How the Outbox Pattern Works

Before diving into tracing, let's make sure the pattern is clear:

```mermaid
sequenceDiagram
    participant API as API Handler
    participant DB as Database
    participant Relay as Outbox Relay
    participant Broker as Message Broker
    participant Consumer as Consumer Service

    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT INTO orders (...)
    API->>DB: INSERT INTO outbox (event_type, payload, trace_context)
    API->>DB: COMMIT
    Note over Relay: Polls outbox table periodically
    Relay->>DB: SELECT * FROM outbox WHERE published = false
    Relay->>Broker: Publish event with trace context
    Relay->>DB: UPDATE outbox SET published = true
    Broker->>Consumer: Deliver event
```

The key insight for tracing is step 3: when we write to the outbox table, we also store the serialized trace context. This lets the relay process pick up where the API handler left off.

## Setting Up the Outbox Table

Your outbox table needs a column for trace context. This is where the serialized `traceparent` and `tracestate` headers will be stored so the relay can reconstruct the trace.

```sql
-- Create the outbox table with a trace_context column for OpenTelemetry
CREATE TABLE outbox (
    id            BIGSERIAL PRIMARY KEY,
    event_type    VARCHAR(255) NOT NULL,        -- e.g., "OrderCreated"
    aggregate_id  VARCHAR(255) NOT NULL,        -- e.g., the order ID
    payload       JSONB NOT NULL,               -- The event data
    trace_context JSONB,                        -- Serialized OpenTelemetry context
    created_at    TIMESTAMP DEFAULT NOW(),
    published     BOOLEAN DEFAULT FALSE,
    published_at  TIMESTAMP
);

-- Index for the relay to efficiently find unpublished events
CREATE INDEX idx_outbox_unpublished ON outbox (published, created_at)
    WHERE published = FALSE;
```

## Writing to the Outbox with Trace Context

When the API handler processes a request, it writes both the business data and the outbox event in a single transaction. The trace context gets serialized and stored alongside the event.

This Python example uses SQLAlchemy and the OpenTelemetry API:

```python
# order_service.py
import json
from opentelemetry import trace, context
from opentelemetry.propagate import inject
from sqlalchemy.orm import Session

tracer = trace.get_tracer("order-service")

def create_order(db: Session, order_data: dict):
    """Create an order and write to the outbox in a single transaction."""
    with tracer.start_as_current_span("order.create") as span:
        span.set_attribute("app.order.customer_id", order_data["customer_id"])

        # Create the order record
        order = Order(
            customer_id=order_data["customer_id"],
            total=order_data["total"],
            items=order_data["items"],
            status="created",
        )
        db.add(order)
        db.flush()  # Get the generated order ID without committing

        span.set_attribute("app.order.id", str(order.id))

        # Serialize the current trace context into a dict
        # This is what allows the relay to continue the trace later
        trace_headers = {}
        inject(trace_headers)

        # Write the event to the outbox table within the SAME transaction
        outbox_entry = OutboxEvent(
            event_type="OrderCreated",
            aggregate_id=str(order.id),
            payload=json.dumps({
                "order_id": str(order.id),
                "customer_id": order_data["customer_id"],
                "total": order_data["total"],
                "items": order_data["items"],
            }),
            trace_context=json.dumps(trace_headers),  # Store trace context as JSON
        )
        db.add(outbox_entry)

        # Both the order and the outbox entry are committed together
        db.commit()

        span.add_event("outbox.event.written", {
            "event_type": "OrderCreated",
            "outbox_id": str(outbox_entry.id),
        })

        return order
```

## Building the Outbox Relay with Tracing

The relay is the bridge between the database and the message broker. It polls the outbox table, extracts the stored trace context, creates a linked span, and publishes the event with the context propagated.

There's an important design decision here. You can either continue the original trace (making the relay span a child of the API handler span) or start a new trace and link it to the original. Continuing the original trace is usually better because it gives you a single, connected view of the entire flow.

```python
# outbox_relay.py
import json
import time
from opentelemetry import trace, context
from opentelemetry.propagate import extract, inject
from opentelemetry.trace import SpanKind
from sqlalchemy import create_engine, text
from confluent_kafka import Producer

tracer = trace.get_tracer("outbox-relay")

# Configure Kafka producer
kafka_producer = Producer({'bootstrap.servers': 'kafka:9092'})

# Topic mapping based on event type
TOPIC_MAP = {
    "OrderCreated": "orders.created",
    "OrderCancelled": "orders.cancelled",
    "PaymentProcessed": "payments.processed",
}

def poll_outbox(db_engine):
    """Poll the outbox table and publish unpublished events."""
    with db_engine.connect() as conn:
        # Fetch unpublished events in order
        result = conn.execute(text("""
            SELECT id, event_type, aggregate_id, payload, trace_context
            FROM outbox
            WHERE published = FALSE
            ORDER BY created_at ASC
            LIMIT 100
        """))

        for row in result:
            publish_outbox_event(conn, row)

def publish_outbox_event(conn, row):
    """Publish a single outbox event to Kafka with trace context."""
    event_id = row.id
    event_type = row.event_type
    payload = row.payload
    stored_trace_context = json.loads(row.trace_context) if row.trace_context else {}

    # Extract the original trace context stored in the outbox row
    # This reconnects us to the trace started by the API handler
    parent_ctx = extract(carrier=stored_trace_context)

    # Create a span that continues the original trace
    with tracer.start_as_current_span(
        f"outbox.relay.{event_type}",
        context=parent_ctx,
        kind=SpanKind.PRODUCER,
    ) as span:
        span.set_attribute("outbox.event.id", event_id)
        span.set_attribute("outbox.event.type", event_type)
        span.set_attribute("messaging.system", "kafka")

        topic = TOPIC_MAP.get(event_type, "events.unknown")
        span.set_attribute("messaging.destination.name", topic)

        # Inject the (now continued) trace context into Kafka headers
        kafka_headers = {}
        inject(kafka_headers)
        kafka_header_list = [
            (k, v.encode('utf-8') if isinstance(v, str) else v)
            for k, v in kafka_headers.items()
        ]

        try:
            # Publish to Kafka
            kafka_producer.produce(
                topic=topic,
                key=row.aggregate_id.encode('utf-8'),
                value=payload.encode('utf-8') if isinstance(payload, str) else payload,
                headers=kafka_header_list,
            )
            kafka_producer.flush()

            # Mark as published in the database
            conn.execute(text("""
                UPDATE outbox
                SET published = TRUE, published_at = NOW()
                WHERE id = :id
            """), {"id": event_id})
            conn.commit()

            span.set_attribute("outbox.published", True)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            conn.rollback()

def run_relay():
    """Main loop for the outbox relay process."""
    engine = create_engine("postgresql://user:pass@localhost/mydb")
    print("Outbox relay started. Polling every 1 second.")
    while True:
        try:
            poll_outbox(engine)
        except Exception as e:
            print(f"Relay error: {e}")
        time.sleep(1)  # Poll interval

if __name__ == "__main__":
    run_relay()
```

## The Consumer Side

On the consumer side, you extract the trace context from the Kafka message headers just as you would in any event-driven system. The trace context has been propagated through the outbox relay, so the consumer's span will be a grandchild of the original API handler span.

```python
# order_consumer.py
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer("inventory-service")

def handle_order_created(message):
    """Process an OrderCreated event from Kafka."""
    # Decode Kafka headers into a dict
    headers = {}
    if message.headers():
        headers = {k: v.decode('utf-8') for k, v in message.headers()}

    # Extract trace context - this connects back through the relay
    # to the original API handler that created the order
    ctx = extract(carrier=headers)

    with tracer.start_as_current_span(
        "inventory.process.OrderCreated",
        context=ctx,
        kind=SpanKind.CONSUMER,
    ) as span:
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.source.name", message.topic())

        event = json.loads(message.value())
        span.set_attribute("app.order.id", event["order_id"])

        # Reserve inventory for the order items
        for item in event["items"]:
            reserve_item(item["product_id"], item["quantity"])

        span.add_event("inventory.reserved", {
            "item_count": len(event["items"]),
        })
```

## The Complete Trace

When everything is wired up, a single trace shows the complete journey:

```mermaid
flowchart TD
    A["API Span: order.create (50ms)"] --> B["DB Span: INSERT orders (8ms)"]
    A --> C["DB Span: INSERT outbox (3ms)"]
    A --> D["Relay Span: outbox.relay.OrderCreated (120ms later)"]
    D --> E["Kafka Span: produce orders.created (5ms)"]
    E --> F["Consumer Span: inventory.process.OrderCreated (15ms)"]
    F --> G["DB Span: UPDATE inventory (6ms)"]

    style A fill:#e1f5fe,stroke:#333
    style D fill:#fff3e0,stroke:#333
    style F fill:#e8f5e9,stroke:#333
```

Notice the gap between the API span and the relay span. That's the polling interval of the relay. In your tracing UI, you'll see this as a time gap in the trace waterfall, which is expected and normal for outbox-based systems.

## Handling Relay Failures and Retries

The relay should handle failures gracefully. If publishing fails, the outbox entry stays unpublished and will be retried on the next poll. But you want visibility into these retries.

Add a retry counter to the outbox table and track it in your spans:

```sql
-- Add retry tracking columns to the outbox table
ALTER TABLE outbox ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE outbox ADD COLUMN last_error TEXT;
ALTER TABLE outbox ADD COLUMN next_retry_at TIMESTAMP DEFAULT NOW();
```

```python
# Enhanced relay with retry tracking
def publish_with_retry(conn, row, parent_ctx):
    """Publish with retry tracking in spans."""
    with tracer.start_as_current_span(
        f"outbox.relay.{row.event_type}",
        context=parent_ctx,
        kind=SpanKind.PRODUCER,
    ) as span:
        span.set_attribute("outbox.retry_count", row.retry_count)

        # If this is a retry, add an event noting it
        if row.retry_count > 0:
            span.add_event("outbox.retry", {
                "attempt": row.retry_count + 1,
                "last_error": row.last_error or "unknown",
            })

        try:
            publish_to_kafka(row)
            mark_published(conn, row.id)
        except Exception as e:
            # Increment retry count and set backoff
            conn.execute(text("""
                UPDATE outbox
                SET retry_count = retry_count + 1,
                    last_error = :error,
                    next_retry_at = NOW() + (INTERVAL '1 second' * POWER(2, retry_count))
                WHERE id = :id
            """), {"id": row.id, "error": str(e)})
            conn.commit()
            span.record_exception(e)
```

## Change Data Capture Alternative

Some teams use Change Data Capture (CDC) instead of polling for the outbox relay. Tools like Debezium watch the database transaction log and publish events when new outbox rows appear. The tracing approach is the same: store the trace context in the outbox row, and the CDC connector extracts it when creating the Kafka message.

If you're using Debezium, you'll need a Single Message Transform (SMT) to move the trace context from the payload into the Kafka message headers:

```json
{
  "transforms": "extractTraceContext",
  "transforms.extractTraceContext.type": "com.example.ExtractTraceContextSMT",
  "transforms.extractTraceContext.trace.context.field": "trace_context"
}
```

You'll typically need to write a custom SMT for this, but the concept is the same: get the trace context out of the row data and into the message headers where OpenTelemetry expects it.

## Monitoring Outbox Health

Beyond tracing individual events, you should monitor the outbox table's health. A growing backlog of unpublished events means your relay is falling behind.

```python
# outbox_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("outbox-relay")

# Track the outbox backlog size
outbox_backlog = meter.create_observable_gauge(
    name="outbox.backlog.size",
    description="Number of unpublished events in the outbox table",
    callbacks=[lambda options: observe_backlog()],
)

# Track relay publish latency (time from creation to publish)
outbox_latency = meter.create_histogram(
    name="outbox.publish.latency",
    description="Time between event creation and successful publish",
    unit="ms",
)
```

## Wrapping Up

The outbox pattern is essential for reliable messaging in microservices, but it introduces a tracing gap that you need to bridge explicitly. The key steps are: store the serialized trace context in the outbox table, extract it in the relay process, and continue the trace when publishing to the broker. This gives you end-to-end visibility from the original API call through the transactional write, the relay, and all downstream consumers. The small investment in storing and propagating trace context pays off enormously when you need to debug why an event never arrived or why it arrived with stale data.
