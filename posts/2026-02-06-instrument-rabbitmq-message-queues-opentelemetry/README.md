# How to Instrument RabbitMQ Message Queues with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RabbitMQ, Message Queues, Distributed Tracing, Observability, Messaging

Description: A complete guide to instrumenting RabbitMQ producers and consumers with OpenTelemetry for distributed tracing, metrics, and observability across async messaging workflows.

---

RabbitMQ is a workhorse in many architectures. It handles task queues, event distribution, pub/sub messaging, and request-reply patterns across thousands of production systems. But when something goes wrong with a message - it gets delayed, processed incorrectly, or lost - tracking it down is painful without proper instrumentation. Messages disappear into queues and pop out somewhere else, and your traces just stop at the publisher.

OpenTelemetry gives you the tools to trace messages through RabbitMQ from the moment they're published to the moment they're consumed and processed. You get spans for publish and consume operations, trace context propagation through message headers, and metrics on queue depth and processing latency. Let's set all of that up.

## How RabbitMQ Tracing Works

RabbitMQ itself doesn't natively support OpenTelemetry (unlike some newer messaging systems). The instrumentation happens at the client library level. When your application publishes a message, the OpenTelemetry instrumentation library injects trace context into the AMQP message headers. When another application consumes that message, the instrumentation extracts the context and creates a linked or child span.

```mermaid
graph LR
    A[Publisher App] -->|Message with trace headers| B[RabbitMQ Exchange]
    B -->|Route| C[Queue]
    C -->|Deliver| D[Consumer App]
    A -->|OTLP| E[OTel Collector]
    D -->|OTLP| E
    E --> F[Tracing Backend]
```

The publisher creates a "publish" span, and the consumer creates a "process" span that links back to the publisher's span. Together, they form a connected trace showing the full lifecycle of the message.

## Setting Up OpenTelemetry for Node.js with RabbitMQ

Let's start with a Node.js example using the `amqplib` library, which is the most popular RabbitMQ client for Node. OpenTelemetry provides an instrumentation package specifically for amqplib.

Install all the required packages.

```bash
# Install OpenTelemetry SDK, amqplib instrumentation, and the RabbitMQ client
npm install @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/instrumentation-amqplib \
  @opentelemetry/api \
  amqplib
```

Set up the tracing configuration. This needs to run before any other code so the instrumentation can patch the amqplib module.

```javascript
// tracing.js - Must be loaded before any other imports
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { AmqplibInstrumentation } = require('@opentelemetry/instrumentation-amqplib');
const { Resource } = require('@opentelemetry/resources');

// Configure the OpenTelemetry SDK with amqplib instrumentation
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'order-service',
    'service.version': '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [
    // This patches amqplib to automatically create spans
    // and propagate trace context through message headers
    new AmqplibInstrumentation({
      // Capture the message payload in span attributes (careful with large payloads)
      publishHook: (span, publishInfo) => {
        span.setAttribute('messaging.rabbitmq.routing_key', publishInfo.routingKey);
        span.setAttribute('messaging.destination.name', publishInfo.exchange);
      },
      consumeHook: (span, consumeInfo) => {
        span.setAttribute('messaging.rabbitmq.routing_key', consumeInfo.msg.fields.routingKey);
        span.setAttribute('messaging.rabbitmq.delivery_tag', consumeInfo.msg.fields.deliveryTag);
      },
    }),
  ],
});

// Start the SDK before your application code runs
sdk.start();
console.log('OpenTelemetry tracing initialized');

// Gracefully shut down on exit
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

## Publishing Messages with Tracing

Now write the publisher code. Because the amqplib instrumentation is active, every `channel.publish()` and `channel.sendToQueue()` call automatically creates a span and injects trace context.

```javascript
// publisher.js
require('./tracing'); // Initialize tracing first

const amqp = require('amqplib');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service');

async function setupPublisher() {
  // Connect to RabbitMQ
  const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672');
  const channel = await connection.createChannel();

  // Declare exchange and queue
  const exchange = 'order-events';
  const queue = 'order-processing';
  const routingKey = 'order.created';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  return { connection, channel, exchange };
}

async function publishOrder(channel, exchange, order) {
  // Create a parent span for the entire order creation flow
  return tracer.startActiveSpan('create-order', async (span) => {
    try {
      span.setAttribute('order.id', order.id);
      span.setAttribute('order.total', order.total);

      const message = Buffer.from(JSON.stringify(order));

      // Publish the message - trace context is injected automatically
      // into the AMQP message headers by the instrumentation
      channel.publish(exchange, 'order.created', message, {
        persistent: true,        // Survive broker restart
        contentType: 'application/json',
        messageId: order.id,     // Useful for deduplication
        timestamp: Date.now(),
      });

      span.setStatus({ code: 1 }); // OK
      console.log(`Published order ${order.id}`);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage
(async () => {
  const { channel, exchange } = await setupPublisher();

  // Publish a sample order
  await publishOrder(channel, exchange, {
    id: 'order-12345',
    customer: 'jane.doe@example.com',
    items: [{ sku: 'WIDGET-01', qty: 3, price: 29.99 }],
    total: 89.97,
  });
})();
```

## Consuming Messages with Tracing

The consumer side is where the trace context gets extracted. The amqplib instrumentation reads the trace headers from the consumed message and creates a span linked to the producer's span.

```javascript
// consumer.js
require('./tracing'); // Initialize tracing first

const amqp = require('amqplib');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('payment-service');

async function startConsumer() {
  // Connect to RabbitMQ
  const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672');
  const channel = await connection.createChannel();

  const queue = 'order-processing';

  // Set prefetch to control how many messages are processed concurrently
  await channel.prefetch(10);
  await channel.assertQueue(queue, { durable: true });

  console.log(`Waiting for messages on queue: ${queue}`);

  // Consume messages - the instrumentation automatically:
  // 1. Extracts trace context from message headers
  // 2. Creates a "deliver" span linked to the producer's "publish" span
  channel.consume(queue, async (msg) => {
    if (!msg) return;

    // Create a processing span as a child of the deliver span
    const span = tracer.startSpan('process-order-payment', {
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.operation': 'process',
        'messaging.destination.name': queue,
        'messaging.rabbitmq.delivery_tag': msg.fields.deliveryTag,
      },
    });

    try {
      const order = JSON.parse(msg.content.toString());
      span.setAttribute('order.id', order.id);
      span.setAttribute('order.total', order.total);

      // Simulate payment processing
      await processPayment(order);

      // Acknowledge the message after successful processing
      channel.ack(msg);
      span.setStatus({ code: 1 }); // OK
      console.log(`Processed payment for order ${order.id}`);
    } catch (error) {
      // Reject and requeue on failure
      channel.nack(msg, false, true);
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
      console.error(`Failed to process order: ${error.message}`);
    } finally {
      span.end();
    }
  });
}

async function processPayment(order) {
  // Simulate some async work
  await new Promise((resolve) => setTimeout(resolve, 100));
}

startConsumer();
```

## Python Implementation with Pika

For Python services using the `pika` RabbitMQ client, OpenTelemetry provides the `opentelemetry-instrumentation-pika` package.

```bash
# Install OpenTelemetry with Pika instrumentation
pip install opentelemetry-api \
    opentelemetry-sdk \
    opentelemetry-exporter-otlp \
    opentelemetry-instrumentation-pika \
    pika
```

Here's a Python publisher and consumer with automatic instrumentation.

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.pika import PikaInstrumentor

def setup_tracing(service_name):
    """Initialize OpenTelemetry tracing with Pika instrumentation."""
    # Create a resource identifying this service
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
    })

    # Set up the tracer provider with OTLP export
    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317")
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    # Instrument the pika library globally
    PikaInstrumentor().instrument()

    return trace.get_tracer(service_name)
```

```python
# publisher.py
import pika
import json
from tracing_setup import setup_tracing

tracer = setup_tracing("order-service")

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="rabbitmq", port=5672)
)
channel = connection.channel()

# Declare exchange and queue
channel.exchange_declare(exchange="order-events", exchange_type="topic", durable=True)
channel.queue_declare(queue="order-processing", durable=True)
channel.queue_bind(queue="order-processing", exchange="order-events", routing_key="order.created")

def publish_order(order):
    """Publish an order event with trace context automatically injected."""
    with tracer.start_as_current_span(
        "publish-order",
        attributes={
            "messaging.system": "rabbitmq",
            "messaging.destination.name": "order-events",
            "messaging.rabbitmq.routing_key": "order.created",
            "order.id": order["id"],
        },
    ):
        # Trace context is injected into AMQP message properties by the instrumentation
        channel.basic_publish(
            exchange="order-events",
            routing_key="order.created",
            body=json.dumps(order),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
                content_type="application/json",
                message_id=order["id"],
            ),
        )
        print(f"Published order {order['id']}")

# Publish a test order
publish_order({
    "id": "order-67890",
    "customer": "john.smith@example.com",
    "items": [{"sku": "GADGET-02", "qty": 1, "price": 149.99}],
    "total": 149.99,
})

connection.close()
```

```python
# consumer.py
import pika
import json
from opentelemetry import trace
from tracing_setup import setup_tracing

tracer = setup_tracing("payment-service")

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="rabbitmq", port=5672)
)
channel = connection.channel()
channel.queue_declare(queue="order-processing", durable=True)
channel.basic_qos(prefetch_count=10)

def on_message(ch, method, properties, body):
    """Handle incoming messages with trace context automatically extracted."""
    # The Pika instrumentation extracts trace context from message headers
    # and creates a span for the delivery
    order = json.loads(body)

    # Create a processing span within the extracted trace context
    with tracer.start_as_current_span(
        "process-payment",
        attributes={
            "messaging.system": "rabbitmq",
            "messaging.operation": "process",
            "order.id": order["id"],
            "order.total": order["total"],
        },
    ) as span:
        try:
            # Process the payment
            process_payment(order)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            span.set_status(trace.StatusCode.OK)
            print(f"Processed payment for order {order['id']}")
        except Exception as e:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))

def process_payment(order):
    """Simulate payment processing."""
    pass

# Start consuming
channel.basic_consume(queue="order-processing", on_message_callback=on_message)
print("Waiting for messages...")
channel.start_consuming()
```

## Trace Structure for RabbitMQ Messages

Understanding the span hierarchy helps when you're querying traces in your backend. Here's what a typical RabbitMQ trace looks like.

```mermaid
gantt
    title RabbitMQ Message Trace Timeline
    dateFormat X
    axisFormat %s

    section Publisher
    create-order           :a1, 0, 50
    publish order.created  :a2, 10, 30

    section RabbitMQ
    Queue transit time     :a3, 30, 80

    section Consumer
    deliver order-processing :a4, 80, 90
    process-payment          :a5, 90, 180
```

The publisher's `create-order` span is the root. Inside it, there's a `publish` span representing the act of sending the message to RabbitMQ. On the consumer side, there's a `deliver` span (created by the instrumentation when the message is received) and your custom `process-payment` span as a child of that.

## Monitoring RabbitMQ Metrics

Beyond tracing, you should also collect metrics from RabbitMQ itself. The OpenTelemetry Collector has a RabbitMQ receiver that scrapes the management API for queue metrics.

```yaml
# otel-collector-config.yaml
receivers:
  # Receive traces from your applications
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Scrape RabbitMQ management API for queue metrics
  rabbitmq:
    endpoint: http://rabbitmq:15672
    username: guest
    password: guest
    collection_interval: 30s

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

exporters:
  otlp:
    endpoint: https://your-backend:4317

  # Export metrics to Prometheus
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [rabbitmq]
      processors: [batch]
      exporters: [prometheus]
```

This gives you metrics like `rabbitmq.message.current` (queue depth), `rabbitmq.message.published` (publish rate), and `rabbitmq.message.delivered` (delivery rate). Combining these with your trace data gives you the full picture: you can see that a queue is backing up and then drill into individual message traces to understand why processing is slow.

## Handling Dead Letter Queues

Dead letter queues (DLQs) are where messages end up when they fail processing too many times. Instrumenting DLQ consumers is just as important as instrumenting your primary consumers. When a message lands in a DLQ, it still carries the original trace context in its headers, so you can trace it all the way back to the original publisher.

```javascript
// dlq-consumer.js - Consumer for dead letter queue
require('./tracing');
const amqp = require('amqplib');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('dlq-handler-service');

async function startDLQConsumer() {
  const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672');
  const channel = await connection.createChannel();

  const dlqName = 'order-processing-dlq';
  await channel.assertQueue(dlqName, { durable: true });

  channel.consume(dlqName, (msg) => {
    if (!msg) return;

    // The trace context from the original publish is still in the headers
    // The instrumentation extracts it and links this span to the original trace
    const span = tracer.startSpan('handle-dead-letter', {
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination.name': dlqName,
        'messaging.rabbitmq.delivery_tag': msg.fields.deliveryTag,
        // Capture the reason for dead-lettering from RabbitMQ's x-death header
        'dlq.reason': msg.properties.headers?.['x-death']?.[0]?.reason || 'unknown',
        'dlq.original_queue': msg.properties.headers?.['x-death']?.[0]?.queue || 'unknown',
      },
    });

    try {
      const order = JSON.parse(msg.content.toString());
      span.setAttribute('order.id', order.id);

      // Log for manual investigation, alert the team, etc.
      console.error(`Dead letter received for order ${order.id}`);
      alertOpsTeam(order);

      channel.ack(msg);
    } catch (error) {
      span.recordException(error);
      channel.ack(msg); // Ack even on error to avoid infinite DLQ loop
    } finally {
      span.end();
    }
  });
}

function alertOpsTeam(order) {
  // Send alert to Slack, PagerDuty, etc.
}

startDLQConsumer();
```

## Best Practices

A few things to keep in mind when instrumenting RabbitMQ with OpenTelemetry:

**Don't capture message payloads in spans by default.** Message bodies can be large and may contain sensitive data. If you need payload visibility, capture only a hash or a truncated version, and make sure you're not logging PII.

**Set meaningful routing key attributes.** RabbitMQ routing keys carry semantic meaning about what the message is. Including them as span attributes makes it much easier to filter and search traces.

**Use consistent naming.** Follow the OpenTelemetry semantic conventions for messaging. Span names should follow the pattern `{destination} {operation}`, for example `order-processing publish` or `order-processing process`.

**Monitor consumer lag.** The time between when a message is published and when it's consumed shows up as the gap between the publish span's end time and the consume span's start time. If this gap grows, your consumers aren't keeping up.

## Wrapping Up

Instrumenting RabbitMQ with OpenTelemetry bridges the gap between your synchronous and asynchronous tracing. Messages no longer vanish into a queue and reappear on the other side with no connection to the original request. With automatic instrumentation for amqplib and pika, the setup is minimal, and you get full trace context propagation through AMQP headers. Combine that with RabbitMQ metrics from the collector, and you have complete observability over your messaging infrastructure.
