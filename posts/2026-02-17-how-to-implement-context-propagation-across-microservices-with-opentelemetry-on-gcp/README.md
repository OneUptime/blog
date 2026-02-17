# How to Implement Context Propagation Across Microservices with OpenTelemetry on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, OpenTelemetry, Distributed Tracing, Microservices, Cloud Trace

Description: Learn how to implement distributed context propagation across microservices with OpenTelemetry on GCP so traces connect correctly across service boundaries.

---

When a request flows through five microservices, you need a way to connect the dots. Which span in Service B belongs to which trace that started in Service A? That is what context propagation does - it passes trace identifiers and other metadata across service boundaries so your distributed traces form a complete picture.

Without proper context propagation, you end up with disconnected spans in Cloud Trace. Each service shows its own isolated trace, and you cannot follow a request end to end. Getting this right is one of the most important things to set up when adopting OpenTelemetry on GCP.

## How Context Propagation Works

When Service A calls Service B, OpenTelemetry injects trace context (trace ID, span ID, trace flags) into the outgoing request headers. When Service B receives the request, OpenTelemetry extracts that context and creates child spans under the same trace.

The standard format for these headers is W3C Trace Context, which uses two headers:

- `traceparent`: Contains the trace ID, parent span ID, and trace flags
- `tracestate`: Contains vendor-specific data (like the GCP project for Cloud Trace)

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: gcp=project-id
```

## Setting Up Context Propagation in Python

Here is a complete setup for a Python service using Flask that both receives and propagates trace context:

```python
# app.py - Flask service with OpenTelemetry context propagation
from flask import Flask
import requests
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# Configure the propagator - W3C Trace Context is the standard
propagator = CompositePropagator([
    TraceContextTextMapPropagator(),
    W3CBaggagePropagator(),
])
set_global_textmap(propagator)

# Set up the tracer provider with Cloud Trace exporter
provider = TracerProvider()
exporter = CloudTraceSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Create the Flask app
app = Flask(__name__)

# Instrument Flask to automatically extract context from incoming requests
FlaskInstrumentor().instrument_app(app)

# Instrument requests library to automatically inject context into outgoing requests
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.route('/api/orders/<order_id>')
def get_order(order_id):
    # This span is automatically a child of the incoming trace
    with tracer.start_as_current_span('fetch-order-details') as span:
        span.set_attribute('order.id', order_id)

        # When this request goes out, trace context is automatically injected
        inventory_response = requests.get(
            f'http://inventory-service/api/stock/{order_id}'
        )

        # Another downstream call - also gets the trace context
        payment_response = requests.get(
            f'http://payment-service/api/status/{order_id}'
        )

        return {
            'order_id': order_id,
            'inventory': inventory_response.json(),
            'payment': payment_response.json(),
        }

if __name__ == '__main__':
    app.run(port=8080)
```

## Context Propagation in Node.js

For Node.js services, the setup is similar:

```javascript
// tracing.js - OpenTelemetry setup for a Node.js service
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { GrpcInstrumentation } = require('@opentelemetry/instrumentation-grpc');
const opentelemetry = require('@opentelemetry/api');

// Set up W3C Trace Context propagation
opentelemetry.propagation.setGlobalPropagator(
  new W3CTraceContextPropagator()
);

// Create and configure the tracer provider
const provider = new NodeTracerProvider();

// Export to Cloud Trace
const exporter = new TraceExporter({ projectId: 'my-project' });
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register();

// Register auto-instrumentation for HTTP, Express, and gRPC
registerInstrumentations({
  instrumentations: [
    // Automatically propagates context for outgoing HTTP requests
    new HttpInstrumentation(),
    // Automatically extracts context from incoming Express requests
    new ExpressInstrumentation(),
    // Handles context propagation for gRPC calls between services
    new GrpcInstrumentation(),
  ],
});
```

```javascript
// server.js - Express service that uses the tracing setup
require('./tracing');  // Must be imported before anything else

const express = require('express');
const axios = require('axios');
const opentelemetry = require('@opentelemetry/api');

const app = express();
const tracer = opentelemetry.trace.getTracer('order-service');

app.get('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Create a child span - automatically linked to the incoming trace
  const span = tracer.startSpan('process-order');
  span.setAttribute('order.id', orderId);

  try {
    // Context is automatically injected into outgoing requests by HttpInstrumentation
    const [inventory, payment] = await Promise.all([
      axios.get(`http://inventory-service/api/stock/${orderId}`),
      axios.get(`http://payment-service/api/status/${orderId}`),
    ]);

    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    res.json({
      orderId,
      inventory: inventory.data,
      payment: payment.data,
    });
  } catch (error) {
    span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

app.listen(8080);
```

## Context Propagation with gRPC

Many GCP microservice architectures use gRPC for inter-service communication. OpenTelemetry handles gRPC context propagation through metadata:

```python
# Python gRPC service with automatic context propagation
import grpc
from opentelemetry.instrumentation.grpc import (
    GrpcInstrumentorServer,
    GrpcInstrumentorClient,
)

# Instrument the gRPC server to extract context from incoming metadata
GrpcInstrumentorServer().instrument()

# Instrument the gRPC client to inject context into outgoing metadata
GrpcInstrumentorClient().instrument()

# Now all gRPC calls automatically propagate trace context
# Server side: incoming trace context is extracted from gRPC metadata
# Client side: outgoing trace context is injected into gRPC metadata
```

## Manual Context Propagation

Sometimes you need to propagate context through systems that do not support automatic instrumentation, like message queues or custom protocols. Here is how to do it manually:

```python
# Manual context injection (sender side)
from opentelemetry import trace, context
from opentelemetry.propagate import inject

tracer = trace.get_tracer(__name__)

def send_to_queue(message):
    """Send a message to Pub/Sub with trace context."""
    with tracer.start_as_current_span('publish-message') as span:
        # Create a carrier dictionary to hold the propagated context
        carrier = {}

        # Inject the current trace context into the carrier
        inject(carrier)

        # Add the carrier as message attributes
        publisher.publish(
            topic_path,
            data=message.encode('utf-8'),
            # Pass trace context as Pub/Sub message attributes
            **carrier,
        )

        span.set_attribute('messaging.system', 'pubsub')
        span.set_attribute('messaging.destination', topic_path)
```

```python
# Manual context extraction (receiver side)
from opentelemetry.propagate import extract
from opentelemetry import trace, context

tracer = trace.get_tracer(__name__)

def process_message(message):
    """Process a Pub/Sub message and continue the trace."""
    # Extract trace context from message attributes
    carrier = dict(message.attributes)
    ctx = extract(carrier)

    # Start a new span as a child of the extracted context
    with tracer.start_as_current_span(
        'process-message',
        context=ctx,
    ) as span:
        span.set_attribute('messaging.system', 'pubsub')
        span.set_attribute('messaging.message_id', message.message_id)

        # Process the message - any spans created here will be
        # children of this span, which is part of the original trace
        handle_business_logic(message.data)

    message.ack()
```

## Propagation Through Cloud Tasks and Cloud Scheduler

When using Cloud Tasks or Cloud Scheduler, you need to manually include trace context in the task/job headers:

```python
# Propagate context through Cloud Tasks
from google.cloud import tasks_v2
from opentelemetry.propagate import inject

def create_traced_task(queue_path, url, payload):
    """Create a Cloud Task with trace context in headers."""
    client = tasks_v2.CloudTasksClient()

    # Collect headers with trace context
    headers = {'Content-Type': 'application/json'}
    inject(headers)  # Adds traceparent and tracestate headers

    task = {
        'http_request': {
            'http_method': tasks_v2.HttpMethod.POST,
            'url': url,
            'headers': headers,
            'body': payload.encode(),
        }
    }

    response = client.create_task(parent=queue_path, task=task)
    return response
```

## Verifying Context Propagation

After setting up propagation, verify it works by checking Cloud Trace:

1. Make a request to your entry service
2. Open Cloud Trace in the Google Cloud Console
3. Find the trace and verify it shows spans from all downstream services
4. Check that the trace waterfall shows correct parent-child relationships

You can also verify programmatically:

```python
# Log trace context for debugging propagation issues
from opentelemetry import trace

def debug_context():
    span = trace.get_current_span()
    ctx = span.get_span_context()
    print(f"Trace ID: {format(ctx.trace_id, '032x')}")
    print(f"Span ID: {format(ctx.span_id, '016x')}")
    print(f"Trace Flags: {ctx.trace_flags}")
```

## Common Propagation Problems

A few issues that come up regularly:

**Broken traces across load balancers.** Some load balancers strip custom headers. Make sure your GCP load balancer is configured to pass through `traceparent` and `tracestate` headers.

**Missing instrumentation in one service.** If Service B does not have OpenTelemetry configured, it will not extract the context from Service A's request, and it will not pass it to Service C. The trace breaks at that point.

**Async operations losing context.** In async frameworks, the trace context can be lost if you are not careful. Use context propagation utilities specific to your async framework.

With proper context propagation, your distributed traces in Cloud Trace become a single connected view of every request. Combined with monitoring in OneUptime, you get full visibility into request flows and can quickly pinpoint where latency or errors originate.
