# How to Propagate Trace Context Across Message Queues (Kafka, RabbitMQ, SQS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, Context Propagation, Kafka, RabbitMQ, SQS, Message Queues

Description: Learn how to propagate OpenTelemetry trace context across message queues like Kafka, RabbitMQ, and SQS to maintain end-to-end distributed traces.

---

Message queues are the backbone of most modern distributed systems. They decouple producers from consumers, smooth out traffic spikes, and let services communicate without tight coupling. But they also create a blind spot in your observability stack. When a trace hits a message queue, the context often gets lost. The consumer starts a brand new trace, and you lose the connection between the request that produced the message and the service that processed it.

This is one of the most common problems teams run into when adopting OpenTelemetry. The good news is that it is solvable. The W3C Trace Context standard and OpenTelemetry's propagation APIs give you everything you need to carry trace context through Kafka, RabbitMQ, SQS, and pretty much any other message broker.

## Why Context Gets Lost in Message Queues

In a synchronous HTTP call, trace context travels in HTTP headers. The OpenTelemetry SDK automatically injects `traceparent` and `tracestate` headers on outgoing requests and extracts them on incoming ones. This works seamlessly because HTTP has a well-defined place for metadata: headers.

Message queues have a similar concept, but it is not standardized. Kafka has record headers. RabbitMQ has message properties (specifically the `headers` field in AMQP). SQS has message attributes. Each broker stores metadata differently, and none of them participate in the W3C Trace Context spec by default.

The result is a gap in your trace. Here is what that looks like:

```mermaid
graph LR
    A[Service A] -->|HTTP with traceparent| B[Service B]
    B -->|Produces message| Q[Message Queue]
    Q -->|Consumes message| C[Service C]

    style Q fill:#ff6b6b,stroke:#333
```

Service A calls Service B over HTTP, and the trace flows normally. Service B publishes a message to the queue. Service C picks it up and processes it. Without explicit context propagation, Service C starts a fresh trace with no connection to the original request.

## The General Pattern

The fix follows the same inject/extract pattern that OpenTelemetry uses everywhere. On the producer side, you inject the current trace context into the message metadata. On the consumer side, you extract it and use it as the parent for your processing span.

The key abstraction is the `TextMapPropagator` interface. You need to implement a carrier that maps the propagator's get/set operations onto your message broker's metadata format.

## Kafka: Using Record Headers

Kafka record headers are key-value pairs attached to each message. They are a natural fit for trace context propagation.

Here is how you set up the producer side in Python:

```python
# kafka_producer_tracing.py
from opentelemetry import trace, context
from opentelemetry.propagate import inject
from confluent_kafka import Producer

tracer = trace.get_tracer(__name__)

class KafkaHeaderCarrier:
    """Carrier that maps OpenTelemetry propagation to Kafka headers."""

    def __init__(self, headers=None):
        # Kafka headers are a list of (key, value) tuples
        self.headers = headers if headers is not None else []

    def get(self, key):
        # Find the header value for the given key
        for k, v in self.headers:
            if k == key:
                return v.decode("utf-8") if isinstance(v, bytes) else v
        return None

    def set(self, key, value):
        # Append the header (Kafka allows duplicate keys, but we replace)
        self.headers = [(k, v) for k, v in self.headers if k != key]
        self.headers.append((key, value.encode("utf-8")))

    def keys(self):
        return [k for k, v in self.headers]

def produce_message(producer: Producer, topic: str, key: str, value: str):
    # Start a span representing the publish operation
    with tracer.start_as_current_span(
        f"{topic} publish",
        kind=trace.SpanKind.PRODUCER
    ) as span:
        # Create a carrier and inject the current context into it
        carrier = KafkaHeaderCarrier()
        inject(carrier=carrier)

        # Add useful attributes to the span
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination", topic)
        span.set_attribute("messaging.operation", "publish")

        # Produce the message with the trace context in headers
        producer.produce(
            topic=topic,
            key=key,
            value=value,
            headers=carrier.headers
        )
        producer.flush()
```

The `KafkaHeaderCarrier` wraps the list of header tuples that Kafka uses. When `inject()` is called, the propagator writes `traceparent` and `tracestate` into this carrier, which then becomes part of the Kafka message.

On the consumer side, you reverse the process:

```python
# kafka_consumer_tracing.py
from opentelemetry import trace, context
from opentelemetry.propagate import extract
from confluent_kafka import Consumer

tracer = trace.get_tracer(__name__)

def consume_messages(consumer: Consumer):
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            continue

        # Build a carrier from the received message headers
        headers = msg.headers() or []
        carrier = KafkaHeaderCarrier(list(headers))

        # Extract the trace context from the message headers
        ctx = extract(carrier=carrier)

        # Start a consumer span linked to the producer's context
        with tracer.start_as_current_span(
            f"{msg.topic()} process",
            context=ctx,
            kind=trace.SpanKind.CONSUMER
        ) as span:
            span.set_attribute("messaging.system", "kafka")
            span.set_attribute("messaging.destination", msg.topic())
            span.set_attribute("messaging.operation", "process")
            span.set_attribute("messaging.kafka.partition", msg.partition())
            span.set_attribute("messaging.kafka.offset", msg.offset())

            # Process the message within the traced context
            process_message(msg.value())
```

When the consumer polls a message, it extracts the context from the headers and passes it to `start_as_current_span`. This creates a parent-child relationship between the producer span and the consumer span, reconnecting the distributed trace.

## RabbitMQ: Using AMQP Message Properties

RabbitMQ messages carry a `headers` dictionary inside the AMQP basic properties. The approach is similar but the carrier is simpler because AMQP headers are already a dictionary.

```python
# rabbitmq_tracing.py
import pika
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)

class RabbitMQCarrier(dict):
    """Simple dict-based carrier for RabbitMQ AMQP headers."""

    def get(self, key, default=None):
        # AMQP headers are a plain dictionary
        return super().get(key, default)

    def set(self, key, value):
        self[key] = value

    def keys(self):
        return list(super().keys())

def publish_to_rabbitmq(channel, exchange, routing_key, body):
    with tracer.start_as_current_span(
        f"{routing_key} publish",
        kind=trace.SpanKind.PRODUCER
    ) as span:
        # Inject context into a carrier dict
        carrier = RabbitMQCarrier()
        inject(carrier=carrier)

        span.set_attribute("messaging.system", "rabbitmq")
        span.set_attribute("messaging.destination", exchange)
        span.set_attribute("messaging.rabbitmq.routing_key", routing_key)

        # Pass the carrier as AMQP headers in BasicProperties
        properties = pika.BasicProperties(headers=dict(carrier))
        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=body,
            properties=properties
        )

def on_message_received(ch, method, properties, body):
    # Extract context from the AMQP headers
    carrier = RabbitMQCarrier(properties.headers or {})
    ctx = extract(carrier=carrier)

    with tracer.start_as_current_span(
        f"{method.routing_key} process",
        context=ctx,
        kind=trace.SpanKind.CONSUMER
    ) as span:
        span.set_attribute("messaging.system", "rabbitmq")
        span.set_attribute("messaging.rabbitmq.routing_key", method.routing_key)

        process_message(body)
```

Since RabbitMQ's AMQP headers are already a string-to-string dictionary, the carrier implementation is minimal. You just need to make sure you pass the headers through `BasicProperties` when publishing and read them from `properties.headers` when consuming.

## SQS: Using Message Attributes

AWS SQS has a concept called message attributes, which are typed key-value pairs. SQS limits you to 10 message attributes per message, so be mindful of how many you are already using.

```python
# sqs_tracing.py
import boto3
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)

class SQSCarrier:
    """Carrier that maps to SQS MessageAttributes format."""

    def __init__(self, message_attributes=None):
        # SQS attributes are dicts with DataType and StringValue
        self.attrs = message_attributes or {}

    def get(self, key, default=None):
        attr = self.attrs.get(key)
        if attr:
            return attr.get("StringValue", default)
        return default

    def set(self, key, value):
        # SQS requires specifying the DataType for each attribute
        self.attrs[key] = {
            "DataType": "String",
            "StringValue": value
        }

    def keys(self):
        return list(self.attrs.keys())

def send_sqs_message(queue_url: str, body: str):
    sqs = boto3.client("sqs")

    with tracer.start_as_current_span(
        "SQS publish",
        kind=trace.SpanKind.PRODUCER
    ) as span:
        carrier = SQSCarrier()
        inject(carrier=carrier)

        span.set_attribute("messaging.system", "aws_sqs")
        span.set_attribute("messaging.destination", queue_url)

        # Send the message with trace context in MessageAttributes
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=body,
            MessageAttributes=carrier.attrs
        )

def process_sqs_message(message: dict):
    # Extract context from SQS message attributes
    attrs = message.get("MessageAttributes", {})
    carrier = SQSCarrier(attrs)
    ctx = extract(carrier=carrier)

    with tracer.start_as_current_span(
        "SQS process",
        context=ctx,
        kind=trace.SpanKind.CONSUMER
    ) as span:
        span.set_attribute("messaging.system", "aws_sqs")

        process_message(message["Body"])
```

The SQS carrier needs to handle the nested structure that SQS uses for message attributes. Each attribute is a dictionary with `DataType` and `StringValue` fields, not a simple string.

## Span Links vs. Parent-Child Relationships

There is a design decision you should think about when tracing message queue operations. In the examples above, the consumer span is a child of the producer span. This works well for simple request-reply patterns.

But in batch processing scenarios where a single consumer processes messages from many different producers, parent-child relationships can create confusing traces. In these cases, span links are a better choice:

```python
# Using span links instead of parent-child for batch consumers
from opentelemetry.trace import Link

def process_batch(messages):
    links = []
    for msg in messages:
        carrier = KafkaHeaderCarrier(list(msg.headers() or []))
        ctx = extract(carrier=carrier)
        # Get the span context from the extracted context
        span_ctx = trace.get_current_span(ctx).get_span_context()
        if span_ctx.is_valid:
            links.append(Link(span_ctx))

    # Create a single span with links to all producer spans
    with tracer.start_as_current_span(
        "batch process",
        links=links,
        kind=trace.SpanKind.CONSUMER
    ) as span:
        span.set_attribute("messaging.batch.message_count", len(messages))
        for msg in messages:
            process_message(msg.value())
```

Links tell your tracing backend that these spans are related without imposing a strict parent-child hierarchy. Most modern tracing backends can visualize these links, making it easy to navigate from a consumer span back to the original producer spans.

## Verifying Propagation Works

After implementing context propagation, verify it by checking that your traces span across the queue boundary. Look for traces that include both producer and consumer spans with matching trace IDs. If the trace IDs differ on either side of the queue, the propagation is not working.

A quick sanity check is to log the `traceparent` value on both sides:

```python
# Quick debug logging for both producer and consumer
import logging

logger = logging.getLogger(__name__)

# On the producer side after inject()
logger.info(f"Produced message with traceparent: {carrier.get('traceparent')}")

# On the consumer side before extract()
logger.info(f"Consumed message with traceparent: {carrier.get('traceparent')}")
```

If both sides log the same trace ID (the first part of the traceparent value), your context is flowing correctly through the queue.

## Wrapping Up

Propagating trace context across message queues comes down to three steps: implement a carrier for your broker's metadata format, inject context on the producer side, and extract it on the consumer side. The pattern is identical regardless of whether you use Kafka, RabbitMQ, SQS, or any other message broker. The only thing that changes is how the carrier maps to the broker's metadata API.

Once you have this in place, your distributed traces will flow seamlessly across queue boundaries, giving you the full picture of how requests move through your system from start to finish.
