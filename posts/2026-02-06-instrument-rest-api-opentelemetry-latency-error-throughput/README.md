# How to Instrument REST API Endpoints with OpenTelemetry for Latency, Error Rate, and Throughput Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, REST API, Observability, Monitoring

Description: Learn how to instrument REST API endpoints with OpenTelemetry to track latency, error rates, and throughput in production systems.

If you run a REST API in production, you already know that "it works on my machine" does not count as monitoring. The three golden signals for any API are latency, error rate, and throughput. OpenTelemetry gives you a vendor-neutral way to capture all three without locking yourself into a specific backend.

This post walks through setting up OpenTelemetry instrumentation for a Node.js Express API, but the concepts apply to any language or framework.

## Setting Up the OpenTelemetry SDK

First, install the required packages:

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-trace-otlp-http
```

Create a `tracing.ts` file that initializes the SDK before your app starts:

```typescript
// tracing.ts - Load this BEFORE any other imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  serviceName: 'my-rest-api',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    // Export metrics every 15 seconds
    exportIntervalMillis: 15000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

The auto-instrumentation package handles Express, HTTP, and many other libraries out of the box. But for the three golden signals, we want more control.

## Custom Middleware for the Three Golden Signals

Auto-instrumentation gives you traces, but custom metrics let you build dashboards and alerts that match your exact needs.

```typescript
// metrics-middleware.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('rest-api-metrics');

// Histogram for latency - tracks the distribution of response times
const requestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'Duration of HTTP requests in milliseconds',
  unit: 'ms',
});

// Counter for throughput - total number of requests
const requestCount = meter.createCounter('http.server.request.count', {
  description: 'Total number of HTTP requests',
});

// Counter for errors - total number of failed requests
const errorCount = meter.createCounter('http.server.error.count', {
  description: 'Total number of HTTP error responses',
});

export function metricsMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();

  // Hook into the response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    // Common attributes for all metrics
    const attributes = {
      'http.method': method,
      'http.route': route,
      'http.status_code': statusCode,
    };

    // Record latency
    requestDuration.record(duration, attributes);

    // Record throughput
    requestCount.add(1, attributes);

    // Record errors (4xx and 5xx)
    if (statusCode >= 400) {
      errorCount.add(1, attributes);
    }
  });

  next();
}
```

## Wiring It Into Your Express App

```typescript
// app.ts
import './tracing'; // Must be first import
import express from 'express';
import { metricsMiddleware } from './metrics-middleware';

const app = express();
app.use(metricsMiddleware);

app.get('/api/users', async (req, res) => {
  // Your handler logic here
  const users = await fetchUsers();
  res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await fetchUser(req.params.id);
  if (!user) {
    // This will be tracked as a 404 error automatically
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.listen(3000);
```

## Adding Span Attributes for Richer Context

The auto-instrumentation creates spans for each request, but you can enrich them with business-specific context:

```typescript
import { trace } from '@opentelemetry/api';

app.get('/api/orders', async (req, res) => {
  const span = trace.getActiveSpan();

  // Add attributes that help you filter and group traces
  span?.setAttribute('api.version', 'v1');
  span?.setAttribute('user.tier', req.user?.tier || 'anonymous');
  span?.setAttribute('query.limit', parseInt(req.query.limit as string) || 50);

  const orders = await fetchOrders(req.query);

  // Record how many results were returned
  span?.setAttribute('response.count', orders.length);

  res.json(orders);
});
```

## What You Get Out of This

With this setup, you can answer questions like:

- What is the P99 latency for `GET /api/users/:id`?
- Which endpoints have the highest error rate in the last hour?
- How many requests per second is each route handling?
- Did latency spike after the last deployment?

The `http.server.request.duration` histogram gives you percentile breakdowns. The counters give you rates when you query them with a `rate()` function in your metrics backend.

## Tips for Production

Use `http.route` instead of `http.target` as your primary grouping attribute. If you use `http.target`, every unique URL (including path parameters and query strings) becomes a separate series, which causes cardinality explosion.

Set meaningful histogram bucket boundaries for your latency histogram if the defaults do not match your SLO targets. For example, if your P99 target is 200ms, make sure you have buckets around that value.

Finally, always include the HTTP method in your metric attributes. A `GET` and a `POST` to the same route often have very different latency profiles, and lumping them together hides problems.

OpenTelemetry makes it straightforward to capture these signals in a portable way. Once the data flows to your backend of choice, building dashboards and alerts becomes the easy part.
