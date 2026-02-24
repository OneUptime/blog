# How to Propagate Trace Headers in Node.js Applications with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Node.js, Distributed Tracing, Express, Observability

Description: Complete guide to propagating Istio distributed tracing headers in Node.js applications using Express, Fastify, and various HTTP clients.

---

When your Node.js services run in an Istio mesh, the sidecar proxies automatically create trace spans for every request. But for those spans to link together into a complete trace across multiple services, your Node.js code needs to forward the trace headers from incoming requests to any outgoing HTTP calls. This is often called "context propagation" and it is the one piece that the mesh cannot handle automatically.

Here are several approaches for doing this in Node.js, from simple middleware to production-ready patterns.

## The Headers You Need to Propagate

```javascript
const TRACE_HEADERS = [
  'x-request-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
  'x-b3-flags',
  'b3',
  'traceparent',
  'tracestate'
];
```

These cover both the Zipkin B3 format and the W3C Trace Context format. Propagate all of them because different parts of your infrastructure might use different formats.

## Method 1: Express Middleware with AsyncLocalStorage

This is the recommended approach for Express applications. It uses Node.js AsyncLocalStorage to make trace headers available anywhere in your request handling code without threading them through every function call:

```javascript
const { AsyncLocalStorage } = require('async_hooks');
const express = require('express');
const axios = require('axios');

const traceStore = new AsyncLocalStorage();

const TRACE_HEADERS = [
  'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
  'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
  'b3', 'traceparent', 'tracestate'
];

// Middleware to capture trace headers
function traceMiddleware(req, res, next) {
  const traceHeaders = {};
  for (const header of TRACE_HEADERS) {
    const value = req.headers[header];
    if (value) {
      traceHeaders[header] = value;
    }
  }
  traceStore.run(traceHeaders, () => next());
}

// Helper to get current trace headers
function getTraceHeaders() {
  return traceStore.getStore() || {};
}

// Create an axios instance that auto-includes trace headers
const tracedAxios = axios.create();
tracedAxios.interceptors.request.use((config) => {
  const traceHeaders = getTraceHeaders();
  config.headers = { ...config.headers, ...traceHeaders };
  return config;
});

module.exports = { traceMiddleware, getTraceHeaders, tracedAxios };
```

Set up your Express app:

```javascript
const express = require('express');
const { traceMiddleware, tracedAxios } = require('./tracing');

const app = express();

// Apply trace middleware to all routes
app.use(traceMiddleware);

app.get('/api/orders', async (req, res) => {
  try {
    // Trace headers are automatically included
    const products = await tracedAxios.get(
      'http://product-service:3000/api/products'
    );
    const inventory = await tracedAxios.get(
      'http://inventory-service:3000/api/stock'
    );

    res.json({
      orders: [],
      products: products.data,
      inventory: inventory.data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Running on port 3000'));
```

## Method 2: Fastify Plugin

For Fastify applications:

```javascript
const fastify = require('fastify')({ logger: true });
const { AsyncLocalStorage } = require('async_hooks');

const traceStore = new AsyncLocalStorage();

const TRACE_HEADERS = [
  'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
  'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
  'b3', 'traceparent', 'tracestate'
];

// Fastify plugin for trace context
fastify.register(async function tracePlugin(app) {
  app.addHook('onRequest', async (request, reply) => {
    const traceHeaders = {};
    for (const header of TRACE_HEADERS) {
      const value = request.headers[header];
      if (value) {
        traceHeaders[header] = value;
      }
    }
    request.traceHeaders = traceHeaders;
  });
});

// Decorate fastify with a traced HTTP client
fastify.decorate('tracedFetch', async function(url, request) {
  const headers = { ...request.traceHeaders };
  const response = await fetch(url, { headers });
  return response.json();
});

fastify.get('/api/orders', async (request, reply) => {
  const products = await fastify.tracedFetch(
    'http://product-service:3000/api/products',
    request
  );
  return { orders: [], products };
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
```

## Method 3: Using node-fetch or Native fetch

If you use the native `fetch` API (available in Node.js 18+):

```javascript
const { getTraceHeaders } = require('./tracing');

async function tracedFetch(url, options = {}) {
  const traceHeaders = getTraceHeaders();
  const headers = {
    ...options.headers,
    ...traceHeaders
  };

  return fetch(url, { ...options, headers });
}

// Usage
app.get('/api/orders', async (req, res) => {
  const response = await tracedFetch('http://product-service:3000/api/products');
  const products = await response.json();
  res.json({ products });
});
```

## Method 4: Using got HTTP Client

```javascript
const got = require('got');
const { getTraceHeaders } = require('./tracing');

const tracedClient = got.extend({
  hooks: {
    beforeRequest: [
      (options) => {
        const traceHeaders = getTraceHeaders();
        for (const [key, value] of Object.entries(traceHeaders)) {
          options.headers[key] = value;
        }
      }
    ]
  }
});

// Usage
const response = await tracedClient.get(
  'http://product-service:3000/api/products'
).json();
```

## Method 5: gRPC Clients

For Node.js gRPC clients, use metadata to propagate trace headers:

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { getTraceHeaders } = require('./tracing');

const packageDef = protoLoader.loadSync('./protos/payment.proto');
const proto = grpc.loadPackageDefinition(packageDef);

const client = new proto.payment.PaymentService(
  'payment-service:9090',
  grpc.credentials.createInsecure()
);

function tracedGrpcCall(method, request) {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    const traceHeaders = getTraceHeaders();

    for (const [key, value] of Object.entries(traceHeaders)) {
      metadata.set(key, value);
    }

    client[method](request, metadata, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

// Usage
app.post('/api/orders', async (req, res) => {
  const payment = await tracedGrpcCall('processPayment', {
    amount: req.body.amount,
    currency: 'USD'
  });
  res.json({ payment });
});
```

## Method 6: OpenTelemetry Auto-Instrumentation

The easiest approach if you want zero-code changes is using the OpenTelemetry Node.js SDK:

```javascript
// tracing-setup.js - require this FIRST before anything else
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
    }),
  ],
  // Don't export traces since Istio handles that
  traceExporter: undefined,
});

sdk.start();
```

Start your app with:

```bash
node --require ./tracing-setup.js app.js
```

Or in your Dockerfile:

```dockerfile
CMD ["node", "--require", "./tracing-setup.js", "app.js"]
```

This automatically instruments Express, http/https modules, and popular HTTP clients. It propagates trace context without any changes to your application code.

## Testing Trace Propagation

Write a simple test to verify headers are being propagated:

```javascript
const request = require('supertest');
const nock = require('nock');
const app = require('./app');

describe('Trace header propagation', () => {
  it('should forward trace headers to downstream services', async () => {
    const traceId = '463ac35c9f6413ad48485a3953bb6124';
    const spanId = '0020000000000001';

    // Mock downstream service and capture headers
    let capturedHeaders;
    nock('http://product-service:3000')
      .get('/api/products')
      .reply(function() {
        capturedHeaders = this.req.headers;
        return [200, { products: [] }];
      });

    await request(app)
      .get('/api/orders')
      .set('x-b3-traceid', traceId)
      .set('x-b3-spanid', spanId)
      .set('x-b3-sampled', '1')
      .expect(200);

    expect(capturedHeaders['x-b3-traceid']).toBe(traceId);
    expect(capturedHeaders['x-b3-spanid']).toBe(spanId);
    expect(capturedHeaders['x-b3-sampled']).toBe('1');
  });
});
```

## Common Mistakes in Node.js

**Forgetting about async context**: If you use callbacks instead of async/await, make sure your callback runs inside the same AsyncLocalStorage context. Most modern Node.js code uses async/await, which preserves context automatically.

**Creating HTTP clients outside the request context**: If you create an axios instance at module level with headers, those headers are set once and never updated. Use request interceptors or create headers at call time.

**Worker threads**: AsyncLocalStorage does not cross worker thread boundaries. If you use worker_threads, you need to manually pass trace headers to the worker.

**Event-driven architectures**: If your app processes events (from Redis pub/sub, Kafka, etc.), the trace context from the original HTTP request is not available. You need to embed trace information in the event payload and extract it when processing.

Trace header propagation in Node.js is straightforward once you set up AsyncLocalStorage middleware. The key insight is that you capture the headers once at the beginning of each request and make them available throughout the request lifecycle, so every outgoing HTTP call includes them automatically.
