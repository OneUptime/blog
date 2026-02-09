# How to use OpenTelemetry context propagation across services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Context Propagation, Distributed Tracing, Microservices, W3C

Description: Learn how to implement OpenTelemetry context propagation across microservices using W3C Trace Context headers to maintain trace continuity in distributed systems.

---

Context propagation is the mechanism that maintains trace continuity across service boundaries in distributed systems. OpenTelemetry uses W3C Trace Context headers to propagate trace and span IDs between services, creating unified distributed traces.

## Understanding Context Propagation

When a request flows through multiple services, each service needs trace context to correlate spans correctly. Context propagation ensures that spans created in different services link together into a single distributed trace.

The trace context contains a trace ID that uniquely identifies the entire request flow and a parent span ID that links child spans to their parents. This information travels with requests through HTTP headers or message metadata.

## W3C Trace Context Format

OpenTelemetry uses the W3C Trace Context standard for propagation. This format defines two HTTP headers that carry trace information.

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: vendorname=value,other=data
```

The traceparent header contains the trace ID, parent span ID, and sampling flag. The tracestate header carries vendor-specific information. OpenTelemetry automatically manages these headers when properly configured.

## Automatic Propagation with HTTP

HTTP client and server instrumentation handles context propagation automatically when using OpenTelemetry auto-instrumentation. The SDK injects headers on outgoing requests and extracts them on incoming requests.

```python
# service_a.py - Python service making HTTP calls
from flask import Flask, request
import requests
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

app = Flask(__name__)

# Instrument Flask and requests library
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route('/api/process')
def process_request():
    # OpenTelemetry automatically extracts trace context from incoming request
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("process_data") as span:
        span.set_attribute("operation", "data_processing")

        # Make HTTP call to service B
        # Context automatically propagated via traceparent header
        response = requests.get('http://service-b:8080/api/validate')

        return {'status': 'processed', 'validation': response.json()}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

The instrumentation injects traceparent headers automatically when making requests, ensuring trace continuity.

```python
# service_b.py - Receiving service
from flask import Flask, jsonify
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route('/api/validate')
def validate():
    # Context automatically extracted from incoming traceparent header
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("validate_data") as span:
        span.set_attribute("validation.type", "schema")

        # This span is automatically linked to the parent span from service A
        result = perform_validation()
        span.set_attribute("validation.result", result)

        return jsonify({'valid': result})

def perform_validation():
    # Validation logic
    return True

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

The receiving service extracts trace context automatically and creates child spans linked to the parent trace.

## Manual Context Propagation

Sometimes you need to propagate context manually, such as when using custom protocols or message queues. OpenTelemetry provides APIs for extracting and injecting context.

```python
# manual_propagation.py
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract
import json

def send_message_to_queue(message_data):
    """Send message with trace context"""
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("send_to_queue") as span:
        # Create carrier dictionary for propagation
        carrier = {}

        # Inject trace context into carrier
        inject(carrier)

        # Add context to message metadata
        message = {
            'data': message_data,
            'trace_context': carrier
        }

        # Send message to queue
        publish_to_queue(json.dumps(message))
        span.set_attribute("message.sent", True)

def receive_message_from_queue(message_json):
    """Receive message and extract trace context"""
    message = json.loads(message_json)

    # Extract trace context from message metadata
    carrier = message.get('trace_context', {})
    ctx = extract(carrier)

    # Create span with extracted context as parent
    tracer = trace.get_tracer(__name__)

    # Attach context and create span
    token = context.attach(ctx)
    try:
        with tracer.start_as_current_span("process_queue_message") as span:
            # Process message data
            process_data(message['data'])
            span.set_attribute("message.processed", True)
    finally:
        context.detach(token)

def publish_to_queue(message):
    """Placeholder for actual queue publish"""
    print(f"Publishing: {message}")

def process_data(data):
    """Process message data"""
    print(f"Processing: {data}")
```

Manual propagation gives you full control over how context travels through your system.

## Context Propagation with gRPC

gRPC services require metadata for context propagation. OpenTelemetry gRPC instrumentation handles this automatically.

```python
# grpc_service.py - gRPC server
import grpc
from concurrent import futures
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer

import order_pb2
import order_pb2_grpc

class OrderService(order_pb2_grpc.OrderServiceServicer):
    def CreateOrder(self, request, context):
        # Context automatically extracted from gRPC metadata
        tracer = trace.get_tracer(__name__)

        with tracer.start_as_current_span("create_order") as span:
            span.set_attribute("order.id", request.order_id)
            span.set_attribute("order.items", len(request.items))

            # Process order
            result = process_order(request)

            return order_pb2.OrderResponse(
                success=True,
                order_id=result['id']
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Instrument gRPC server
    GrpcInstrumentorServer().instrument_server(server)

    order_pb2_grpc.add_OrderServiceServicer_to_server(
        OrderService(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

def process_order(request):
    return {'id': 'ord-123'}
```

gRPC clients also propagate context automatically when instrumented.

```python
# grpc_client.py
import grpc
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient

import order_pb2
import order_pb2_grpc

# Instrument gRPC client
GrpcInstrumentorClient().instrument()

def create_order(order_data):
    """Make gRPC call with automatic context propagation"""
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = order_pb2_grpc.OrderServiceStub(channel)

        # Context automatically injected into gRPC metadata
        response = stub.CreateOrder(
            order_pb2.OrderRequest(
                order_id=order_data['id'],
                items=order_data['items']
            )
        )

        return response
```

## Kafka Message Propagation

Kafka messages require manual context injection into message headers for propagation.

```python
# kafka_producer.py
from kafka import KafkaProducer
from opentelemetry import trace
from opentelemetry.propagate import inject
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def send_event(topic, event_data):
    """Send Kafka message with trace context"""
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("kafka_publish") as span:
        # Create headers carrier for context propagation
        headers = {}
        inject(headers)

        # Convert headers to Kafka format
        kafka_headers = [(k, v.encode('utf-8')) for k, v in headers.items()]

        # Send message with context headers
        producer.send(
            topic,
            value=event_data,
            headers=kafka_headers
        )
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination", topic)

    producer.flush()
```

Kafka consumers extract context from message headers.

```python
# kafka_consumer.py
from kafka import KafkaConsumer
from opentelemetry import trace, context
from opentelemetry.propagate import extract
import json

consumer = KafkaConsumer(
    'order-events',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

def consume_messages():
    """Consume Kafka messages and extract trace context"""
    tracer = trace.get_tracer(__name__)

    for message in consumer:
        # Extract trace context from message headers
        headers = dict(message.headers or [])
        carrier = {k: v.decode('utf-8') for k, v in headers.items()}
        ctx = extract(carrier)

        # Attach context and create span
        token = context.attach(ctx)
        try:
            with tracer.start_as_current_span("kafka_consume") as span:
                span.set_attribute("messaging.system", "kafka")
                span.set_attribute("messaging.operation", "receive")

                # Process message
                process_event(message.value)
        finally:
            context.detach(token)

def process_event(event_data):
    """Process event data"""
    print(f"Processing event: {event_data}")
```

## Multiple Propagator Configuration

Configure multiple propagators to support different context formats. This helps when integrating with systems using different propagation standards.

```python
# propagator_config.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.propagators.jaeger import JaegerPropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

# Configure multiple propagators
composite_propagator = CompositePropagator([
    TraceContextTextMapPropagator(),  # W3C Trace Context
    W3CBaggagePropagator(),           # W3C Baggage
    B3MultiFormat(),                  # Zipkin B3
    JaegerPropagator(),               # Jaeger
])

# Set as global propagator
set_global_textmap(composite_propagator)

# Now services can interoperate with different tracing systems
trace.set_tracer_provider(TracerProvider())
```

This configuration allows your services to communicate with systems using different propagation formats.

## Testing Context Propagation

Verify context propagation works correctly by checking trace IDs across service boundaries.

```python
# test_propagation.py
from opentelemetry import trace
import requests

def test_context_propagation():
    """Test that trace context propagates correctly"""
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("test_span") as span:
        # Get current trace context
        span_context = span.get_span_context()
        trace_id = format(span_context.trace_id, '032x')
        span_id = format(span_context.span_id, '016x')

        print(f"Parent trace ID: {trace_id}")
        print(f"Parent span ID: {span_id}")

        # Make HTTP call
        response = requests.get('http://service-b:8080/api/validate')

        # Check response for trace continuity
        # Service B should log the same trace ID
        assert response.status_code == 200

test_context_propagation()
```

Check logs across services to verify they share the same trace ID.

## Troubleshooting Propagation Issues

When context propagation fails, traces appear fragmented. Check these common issues.

First, verify propagators are configured correctly. Missing or incorrect propagator configuration prevents context injection.

Second, ensure HTTP headers or message metadata isn't stripped by proxies or gateways. Some infrastructure components remove custom headers.

Third, check that both sending and receiving services use compatible propagation formats. Mixed formats can break trace continuity.

Fourth, verify instrumentation is active on both sides of the communication. Missing instrumentation on either end breaks the trace chain.

OpenTelemetry context propagation enables distributed tracing by maintaining trace continuity across service boundaries. Proper configuration and understanding of propagation mechanisms ensure complete visibility into request flows through your distributed system.
