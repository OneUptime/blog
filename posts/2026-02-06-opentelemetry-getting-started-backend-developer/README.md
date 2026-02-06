# How to Get Started with OpenTelemetry as a Backend Developer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Backend, Developer, Instrumentation, Tracing

Description: Learn how to instrument backend services with OpenTelemetry, from basic tracing setup to advanced patterns for distributed systems and microservices.

Backend systems are the heart of modern applications, and understanding what happens inside them is critical. OpenTelemetry gives you deep visibility into your services, from HTTP handlers to database queries to message processing. This guide focuses on what backend developers need to know to instrument their services effectively.

## Why Backend Developers Need OpenTelemetry

You build services that handle business logic, process data, and coordinate between systems. When something goes wrong, you need to answer questions like:

- Why is this API endpoint slow?
- Which database query is causing the bottleneck?
- How does a request flow through our microservices?
- Why did this background job fail?
- What caused this spike in error rates?

OpenTelemetry captures the data you need to answer these questions. Unlike traditional logging, it automatically tracks request context across service boundaries, timing information for every operation, and structured data that's easy to query.

## Core Concepts for Backend Development

OpenTelemetry organizes telemetry into three signal types:

**Traces** track requests as they flow through your system. Each trace contains spans, representing individual operations. When a user hits your API, OpenTelemetry creates a trace that follows that request through every function call, database query, and external service call.

**Metrics** measure what's happening at scale. They track things like request rates, error percentages, latency distributions, and queue depths. Unlike traces, which sample individual requests, metrics aggregate data to show trends.

**Logs** capture detailed information about specific events. OpenTelemetry doesn't replace your existing logging library but adds context (trace IDs, span IDs) to connect logs with traces.

## Setting Up Your First Instrumentation

Pick your language and install the OpenTelemetry SDK. Here's Node.js as an example:

```bash
# Install core OpenTelemetry packages
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http
```

Create an initialization file that configures OpenTelemetry before your application starts:

```javascript
// tracing.js - Initialize OpenTelemetry before importing your app
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Configure the trace exporter to send data to your collector
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Initialize the SDK with auto-instrumentation
const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'my-backend-service',
});

// Start the SDK
sdk.start();

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

Import this file before your application code:

```javascript
// index.js - Your application entry point
require('./tracing'); // Must be first import
const express = require('express');
const app = express();

app.get('/api/users', async (req, res) => {
  // This request is automatically traced
  const users = await database.query('SELECT * FROM users');
  res.json(users);
});

app.listen(3000);
```

That's it. With auto-instrumentation, OpenTelemetry automatically traces HTTP requests, database queries, and calls to external services.

## Language-Specific Setup Examples

Each language has its own patterns. Here's Python with Flask:

```python
# Install OpenTelemetry packages
# pip install opentelemetry-distro opentelemetry-exporter-otlp
# pip install opentelemetry-instrumentation-flask

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from flask import Flask

# Set up the tracer provider
trace.set_tracer_provider(TracerProvider())
tracer_provider = trace.get_tracer_provider()

# Configure the OTLP exporter
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces")
span_processor = BatchSpanProcessor(otlp_exporter)
tracer_provider.add_span_processor(span_processor)

# Create and instrument Flask app
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route('/api/users')
def get_users():
    # Automatically traced by Flask instrumentation
    users = database.query('SELECT * FROM users')
    return jsonify(users)
```

For Java with Spring Boot:

```java
// Add dependencies to pom.xml or build.gradle
// io.opentelemetry:opentelemetry-api
// io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter

// application.properties configuration
// otel.service.name=my-backend-service
// otel.traces.exporter=otlp
// otel.exporter.otlp.endpoint=http://localhost:4318

// Spring Boot auto-configuration handles the rest
@RestController
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/api/users")
    public List<User> getUsers() {
        // Automatically traced by Spring Boot instrumentation
        return userRepository.findAll();
    }
}
```

For Go:

```go
// Install OpenTelemetry packages
// go get go.opentelemetry.io/otel
// go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
// go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

package main

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func initTracer() (*trace.TracerProvider, error) {
    // Create OTLP exporter
    exporter, err := otlptracehttp.New(context.Background(),
        otlptracehttp.WithEndpoint("localhost:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create tracer provider
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        panic(err)
    }
    defer tp.Shutdown(context.Background())

    // Wrap HTTP handlers with OpenTelemetry middleware
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // This handler is automatically traced
        w.Write([]byte("Hello, World!"))
    })

    wrappedHandler := otelhttp.NewHandler(handler, "my-handler")
    http.ListenAndServe(":8080", wrappedHandler)
}
```

## Adding Manual Instrumentation

Auto-instrumentation covers common frameworks, but you'll want to add custom spans for business logic:

```javascript
// Get a tracer instance
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('my-service');

async function processOrder(orderId) {
  // Create a custom span for business logic
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      // Add attributes to provide context
      span.setAttribute('order.id', orderId);
      span.setAttribute('order.type', 'purchase');

      // Your business logic here
      const order = await fetchOrder(orderId);
      const validated = await validateOrder(order);
      const result = await saveOrder(validated);

      // Set span status to indicate success
      span.setStatus({ code: SpanStatusCode.OK });

      return result;
    } catch (error) {
      // Record errors in the span
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      // Always end the span
      span.end();
    }
  });
}
```

Custom spans appear in your traces alongside auto-instrumented operations, giving you complete visibility into your application's behavior.

## Tracing Database Operations

Database queries are often performance bottlenecks. OpenTelemetry instruments popular database clients automatically, but you can add custom attributes:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def get_user_orders(user_id):
    with tracer.start_as_current_span("get_user_orders") as span:
        # Add business context to the span
        span.set_attribute("user.id", user_id)

        # The database query is automatically instrumented
        query = "SELECT * FROM orders WHERE user_id = %s"
        orders = database.execute(query, [user_id])

        # Add result information
        span.set_attribute("orders.count", len(orders))

        return orders
```

When you view this trace, you'll see the overall `get_user_orders` span with a child span for the SQL query, including query text, execution time, and any errors.

## Propagating Context Across Services

When your service calls another service, OpenTelemetry automatically propagates trace context via HTTP headers:

```javascript
// Outgoing HTTP request automatically includes trace context
const axios = require('axios');

async function callPaymentService(orderId, amount) {
  // OpenTelemetry instrumentation adds W3C Trace Context headers
  const response = await axios.post('http://payment-service/charge', {
    orderId,
    amount
  });

  return response.data;
}
```

The payment service receives these headers and continues the trace:

```javascript
// Payment service receives request with trace context
app.post('/charge', async (req, res) => {
  // This span is automatically linked to the parent trace
  const { orderId, amount } = req.body;

  const result = await processPayment(orderId, amount);
  res.json(result);
});
```

The entire distributed transaction appears as a single trace in your observability backend, showing exactly how the request flowed through multiple services.

## Adding Metrics

Traces show individual requests, but metrics show aggregate patterns. Add custom metrics for business-critical operations:

```javascript
const { metrics } = require('@opentelemetry/api');

// Get a meter instance
const meter = metrics.getMeter('my-service');

// Create counters for business events
const orderCounter = meter.createCounter('orders.processed', {
  description: 'Number of orders processed',
});

// Create histograms for value distributions
const orderValueHistogram = meter.createHistogram('order.value', {
  description: 'Distribution of order values',
  unit: 'USD',
});

async function processOrder(order) {
  // Increment counter when processing orders
  orderCounter.add(1, {
    'order.type': order.type,
    'order.status': 'processed'
  });

  // Record the order value
  orderValueHistogram.record(order.total, {
    'order.type': order.type
  });

  // Process the order...
}
```

These metrics export alongside traces, giving you both detailed request data and high-level trends.

## Connecting Logs to Traces

Connect your application logs to traces by including trace context:

```javascript
const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

// Configure Winston to include trace context
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Helper to add trace context to logs
function logWithTrace(level, message, meta = {}) {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    meta.trace_id = spanContext.traceId;
    meta.span_id = spanContext.spanId;
  }
  logger.log(level, message, meta);
}

// Use in your code
async function processOrder(orderId) {
  logWithTrace('info', 'Processing order', { orderId });

  try {
    const result = await handleOrder(orderId);
    logWithTrace('info', 'Order processed successfully', { orderId, result });
    return result;
  } catch (error) {
    logWithTrace('error', 'Order processing failed', { orderId, error: error.message });
    throw error;
  }
}
```

Now when you view a trace, you can query logs with the trace ID to see all log messages related to that specific request.

## Handling Asynchronous Operations

Background jobs and message processing need special attention. OpenTelemetry provides context propagation for async operations:

```javascript
// Extract trace context from message headers
const { propagation, context, trace } = require('@opentelemetry/api');

async function handleMessage(message) {
  // Extract parent context from message metadata
  const parentContext = propagation.extract(
    context.active(),
    message.headers
  );

  // Create a new span linked to the parent
  const tracer = trace.getTracer('message-processor');

  await context.with(parentContext, async () => {
    await tracer.startActiveSpan('processMessage', async (span) => {
      try {
        span.setAttribute('message.id', message.id);
        span.setAttribute('message.type', message.type);

        // Process the message
        await processMessageContent(message);

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  });
}
```

This creates a trace that connects the original request (which published the message) to the background processing.

## Performance Considerations

OpenTelemetry has minimal overhead, but you should still be thoughtful about instrumentation:

**Use sampling for high-traffic services.** Not every request needs to be traced. Configure head-based sampling:

```javascript
const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  traceExporter,
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
  instrumentations: [getNodeAutoInstrumentations()],
});
```

**Batch exports.** Don't export every span immediately. Use batch processors:

```python
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Export spans in batches every 5 seconds
span_processor = BatchSpanProcessor(
    otlp_exporter,
    max_export_batch_size=512,
    schedule_delay_millis=5000
)
```

**Be selective with attributes.** Don't add massive payloads as span attributes. Store large data elsewhere and reference it by ID.

## Testing Your Instrumentation

Write tests to verify your instrumentation:

```javascript
const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');

describe('Order processing instrumentation', () => {
  let spanExporter;

  beforeEach(() => {
    // Use in-memory exporter for testing
    spanExporter = new InMemorySpanExporter();
    // Configure your tracer to use this exporter
  });

  it('creates spans with correct attributes', async () => {
    await processOrder('order-123');

    const spans = spanExporter.getFinishedSpans();
    const orderSpan = spans.find(s => s.name === 'processOrder');

    expect(orderSpan).toBeDefined();
    expect(orderSpan.attributes['order.id']).toBe('order-123');
    expect(orderSpan.status.code).toBe(SpanStatusCode.OK);
  });
});
```

This ensures your instrumentation works correctly and catches regressions.

## Common Pitfalls to Avoid

**Forgetting to end spans.** Always call `span.end()` or use the callback pattern. Unended spans leak memory and never export.

**Over-instrumenting.** Don't create spans for every function call. Focus on operations that matter: external calls, database queries, significant business logic.

**Ignoring errors.** Always call `span.recordException(error)` and set error status. This data is crucial for debugging.

**Not testing locally.** Set up a local collector and backend (like Jaeger) to see your traces before deploying to production.

OpenTelemetry transforms how you understand backend systems. Start with auto-instrumentation to get immediate value, then add custom spans for business-critical operations. With proper instrumentation, you'll spend less time guessing what went wrong and more time building features.
