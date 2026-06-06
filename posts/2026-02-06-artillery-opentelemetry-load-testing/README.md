# How to Use Artillery with OpenTelemetry for Load Testing Distributed Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Artillery, Load Testing, Distributed System, Trace Correlation

Description: Set up Artillery load tests that propagate OpenTelemetry trace context, letting you correlate load test traffic with backend traces.

Artillery is a popular load testing tool that supports HTTP, WebSocket, and Socket.io protocols. By adding OpenTelemetry tracing to your Artillery scripts, every virtual user request can be traced from the load generator and correlated with backend telemetry. If you also propagate W3C trace context to instrumented backend services, this gives you precise answers about which services slow down under load and why.

## Installing Artillery with OpenTelemetry Support

Artillery includes OpenTelemetry support through the built-in `publish-metrics` plugin:

```bash
npm install -g artillery
```

## Basic Artillery Configuration with Tracing

Create an Artillery test script that enables the built-in OpenTelemetry reporter:

```yaml
# load-test.yaml

config:
  target: "http://api.example.com"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm-up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"

  plugins:
    expect: {}
    publish-metrics:
      - type: "open-telemetry"
        serviceName: "artillery-load-test"
        resourceAttributes:
          test.suite: "checkout-flow"
          test.environment: "staging"
        traces:
          exporter: "otlp-http"
          endpoint: "http://localhost:4318/v1/traces"
          sampleRate: 1
          attributes:
            test.suite: "checkout-flow"
            test.environment: "staging"

scenarios:
  - name: "Browse and checkout"
    flow:
      - get:
          url: "/api/products"
          capture:
            - json: "$.products[0].id"
              as: "productId"

      - post:
          url: "/api/cart"
          json:
            productId: "{{ productId }}"
            quantity: 1

      - post:
          url: "/api/checkout"
          json:
            paymentMethod: "card"
          expect:
            - statusCode: 200
```

## Custom Processor for Trace Propagation

If the built-in plugin does not fit your needs, write a custom Artillery processor that handles trace propagation:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources
```

```javascript
// artillery-otel-processor.js
const { trace, context: otelContext, propagation, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    'service.name': 'artillery-load-test',
    'test.id': Date.now().toString(),
  }),
  spanProcessors: [new BatchSpanProcessor(exporter)],
});

provider.register();

const tracer = trace.getTracer('artillery');
const activeSpans = new WeakMap();
let shuttingDown = false;

async function shutdownProvider() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await provider.forceFlush();
  await provider.shutdown();
}

module.exports = {
  beforeRequest(requestParams, vuContext, ee, next) {
    // Create a span for this request
    const method = (requestParams.method || 'GET').toUpperCase();
    const span = tracer.startSpan(`${method} ${requestParams.url}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.request.method': method,
        'http.method': method,
        'url.full': requestParams.url,
        'http.url': requestParams.url,
        'artillery.scenario': vuContext.scenario?.name || 'default',
      },
    });

    // Inject trace context into the request headers
    const spanContext = trace.setSpan(otelContext.active(), span);
    const headers = requestParams.headers || {};
    propagation.inject(spanContext, headers);
    requestParams.headers = headers;

    // Store the span so we can end it in afterResponse
    activeSpans.set(requestParams, span);

    next();
  },

  afterResponse(requestParams, response, vuContext, ee, next) {
    const span = activeSpans.get(requestParams);

    if (span) {
      span.setAttribute('http.response.status_code', response.statusCode);
      span.setAttribute('http.status_code', response.statusCode);

      if (response.timings?.phases?.total) {
        span.setAttribute('http.response_time_ms', response.timings.phases.total);
      }

      if (response.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.statusCode}` });
      }

      span.end();
      activeSpans.delete(requestParams);
    }

    next();
  },
};

process.once('beforeExit', shutdownProvider);
process.once('SIGINT', shutdownProvider);
process.once('SIGTERM', shutdownProvider);
```

Register the processor and hooks in your Artillery config:

```yaml
config:
  processor: "./artillery-otel-processor.js"

scenarios:
  - flow:
      - get:
          url: "/api/products"
          beforeRequest: "beforeRequest"
          afterResponse: "afterResponse"
```

## Analyzing Results with Traces

After the load test completes, you have two datasets: Artillery's aggregate metrics and OpenTelemetry traces from every request. Here is how to use them together.

First, check Artillery's output for high-level problems:

```bash
artillery run --output results.json load-test.yaml

# Summarize results
artillery report results.json
```

Then query your trace backend for the slow requests:

```bash
# Find the slowest traces from the load test
curl -G "http://trace-backend/api/traces" \
  --data-urlencode "service=artillery-load-test" \
  --data-urlencode "minDuration=2s" \
  --data-urlencode "limit=20" \
  | jq '.traces[] | {
    traceId: .traceID,
    duration_ms: (.spans[0].duration / 1000),
    error: (.spans[] | select(.tags[] | select(.key == "error" and .value == "true")) | .operationName)
  }'
```

## Combining with Custom Metrics

You can also record custom Artillery metrics alongside traces:

```yaml
scenarios:
  - name: "Checkout with timing"
    flow:
      - post:
          url: "/api/checkout"
          json:
            paymentMethod: "card"
          afterResponse: "recordCustomMetrics"

config:
  processor: "./custom-metrics.js"
```

```javascript
// custom-metrics.js
module.exports = {
  recordCustomMetrics: function (requestParams, response, context, ee, next) {
    // Record custom metrics that align with your trace attributes
    const responseTime = response.timings.phases.total;

    if (responseTime > 1000) {
      ee.emit('counter', 'slow_checkouts', 1);
      console.log(`Slow checkout: trace_id in response headers = ${response.headers['x-trace-id']}`);
    }

    ee.emit('histogram', 'checkout_response_time', responseTime);
    next();
  },
};
```

Artillery with OpenTelemetry gives you the best of both worlds: high-level load test metrics to see when things degrade, and distributed traces to see exactly why. The trace propagation means that a slow request in Artillery's report can be followed all the way through your service mesh to the exact database query or external API call causing the bottleneck.
