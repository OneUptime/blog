# How to Use Artillery with OpenTelemetry for Load Testing Distributed Systems with Trace Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Artillery, Load Testing, Distributed Systems, Trace Correlation

Description: Set up Artillery load tests that propagate OpenTelemetry trace context, letting you correlate load test traffic with backend traces.

Artillery is a popular load testing tool that supports HTTP, WebSocket, and Socket.io protocols. By adding OpenTelemetry trace propagation to your Artillery scripts, every virtual user request becomes traceable through your entire distributed system. This gives you precise answers about which services slow down under load and why.

## Installing Artillery with the OpenTelemetry Plugin

Artillery supports plugins that hook into the request lifecycle. You can use this to inject trace context headers:

```bash
npm install -g artillery
npm install -g artillery-plugin-opentelemetry
```

## Basic Artillery Configuration with Tracing

Create an Artillery test script that enables the OpenTelemetry plugin:

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
    opentelemetry:
      exporter:
        type: otlp
        endpoint: "http://localhost:4318/v1/traces"
      propagate: true  # Inject traceparent headers into requests
      serviceName: "artillery-load-test"
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

## Custom Plugin for Trace Propagation

If the community plugin does not fit your needs, write a custom Artillery plugin that handles trace propagation:

```javascript
// artillery-otel-plugin.js
const { trace, context, propagation } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');

class OpenTelemetryPlugin {
  constructor(script, events) {
    // Set up the tracer provider
    const exporter = new OTLPTraceExporter({
      url: script.config.plugins.otel.endpoint || 'http://localhost:4318/v1/traces',
    });

    const provider = new NodeTracerProvider({
      resource: new Resource({
        'service.name': 'artillery-load-test',
        'test.id': Date.now().toString(),
      }),
    });

    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register();

    this.tracer = trace.getTracer('artillery');

    // Hook into Artillery's request lifecycle
    events.on('beforeRequest', this.beforeRequest.bind(this));
    events.on('afterResponse', this.afterResponse.bind(this));
    events.on('done', () => {
      provider.forceFlush().then(() => provider.shutdown());
    });

    // Store active spans keyed by request ID
    this.activeSpans = new Map();
  }

  beforeRequest(requestParams, eventContext, ee, next) {
    // Create a span for this request
    const span = this.tracer.startSpan(`${requestParams.method} ${requestParams.url}`, {
      attributes: {
        'http.method': requestParams.method,
        'http.url': requestParams.url,
        'artillery.scenario': eventContext._scenario || 'default',
        'artillery.vu_id': eventContext._uid,
      },
    });

    // Inject trace context into the request headers
    const spanContext = trace.setSpan(context.active(), span);
    const headers = requestParams.headers || {};
    propagation.inject(spanContext, headers);
    requestParams.headers = headers;

    // Store the span so we can end it in afterResponse
    this.activeSpans.set(eventContext._uid + requestParams.url, span);

    next();
  }

  afterResponse(requestParams, response, eventContext, ee, next) {
    const key = eventContext._uid + requestParams.url;
    const span = this.activeSpans.get(key);

    if (span) {
      span.setAttribute('http.status_code', response.statusCode);
      span.setAttribute('http.response_time_ms', response.timings.phases.total);

      if (response.statusCode >= 400) {
        span.setStatus({ code: 2, message: `HTTP ${response.statusCode}` });
      }

      span.end();
      this.activeSpans.delete(key);
    }

    next();
  }
}

module.exports = { Plugin: OpenTelemetryPlugin };
```

Register the plugin in your Artillery config:

```yaml
config:
  plugins:
    otel:
      endpoint: "http://localhost:4318/v1/traces"
```

## Analyzing Results with Traces

After the load test completes, you have two datasets: Artillery's aggregate metrics and OpenTelemetry traces from every request. Here is how to use them together.

First, check Artillery's output for high-level problems:

```bash
artillery run load-test.yaml --output results.json

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
