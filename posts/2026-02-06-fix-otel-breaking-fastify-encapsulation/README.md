# How to Fix OpenTelemetry Breaking Fastify's Encapsulation and Plugin System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fastify, Node.js, Plugin System

Description: Resolve the issue where OpenTelemetry instrumentation breaks Fastify's plugin encapsulation by leaking context across scopes.

Fastify's plugin system is built on encapsulation. Each plugin gets its own scope for decorators, hooks, and route prefixes. Some OpenTelemetry Fastify instrumentation setups can make traces harder to read by creating hook and handler spans that cross plugin boundaries, causing unexpected parent-child relationships and confusing timing in traces.

## How Fastify Encapsulation Works

```javascript
const fastify = require('fastify')();

// Plugin A - encapsulated scope
fastify.register(async function pluginA(instance) {
  instance.decorate('dbA', new DatabaseA());

  instance.get('/api/a', async (req, reply) => {
    return instance.dbA.query('SELECT * FROM a');
  });
});

// Plugin B - separate encapsulated scope
fastify.register(async function pluginB(instance) {
  instance.decorate('dbB', new DatabaseB());

  instance.get('/api/b', async (req, reply) => {
    return instance.dbB.query('SELECT * FROM b');
  });
});
```

Each plugin has its own scope. `pluginA` cannot access `dbB` and vice versa. This is fundamental to Fastify's design.

## The Encapsulation Problem

OpenTelemetry's legacy `@opentelemetry/instrumentation-fastify` package wraps Fastify's lifecycle hooks and request handlers. When it creates spans for hooks (onRequest, preHandler, etc.), those spans can become parents for work that is logically owned by another plugin:

```text
GET /api/a                          [========================] 50ms
  onRequest (global auth hook)      [===]                      5ms
  preHandler (pluginA hook)           [===]                    5ms
    DB query (pluginB scope!)           [===]                  3ms  // WRONG PARENT
```

The DB query from pluginB should not be a child of pluginA's preHandler span.

## Fix 1: Use requestHook to Add Route Attributes

Configure the Fastify instrumentation to use request hooks that set route attributes on the Fastify handler span:

```javascript
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');

const fastifyInstrumentation = new FastifyInstrumentation({
  requestHook: (span, info) => {
    // Add route info as attributes on the Fastify handler span
    span.setAttribute('fastify.route', info.request.routeOptions?.url || 'unknown');
    span.setAttribute('fastify.method', info.request.routeOptions?.method || info.request.method);
  },
});
```

`requestHook` does not disable hook spans by itself. It is useful for making the generated spans easier to filter and validate.

## Fix 2: Disable Hook Spans

If the encapsulation issue is severe, you can reduce the granularity of Fastify instrumentation:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

// Use only HTTP instrumentation, skip Fastify-specific instrumentation
const sdk = new NodeSDK({
  instrumentations: [
    new HttpInstrumentation(),
    // Intentionally NOT including FastifyInstrumentation
  ],
});
sdk.start();
```

You lose the per-hook span detail, but the HTTP instrumentation still gives you one span per request. Add route attributes in your Fastify app if you need the matched Fastify route on that span.

## Fix 3: Register OpenTelemetry as a Fastify Plugin

Instead of using the deprecated `@opentelemetry/instrumentation-fastify` package, use the Fastify-maintained OpenTelemetry plugin and register it in the scope you want to instrument:

```javascript
const FastifyOtelInstrumentation = require('@fastify/otel');

const fastifyOtelInstrumentation = new FastifyOtelInstrumentation();

// Register in the Fastify scope you want to instrument
await fastify.register(fastifyOtelInstrumentation.plugin());
```

## Fix 4: Use Fastify's Built-In Request ID for Correlation

Fastify generates a request ID for each request. Use this to correlate spans without relying on context propagation through the plugin system:

```javascript
fastify.addHook('onRequest', async (request) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('fastify.request_id', request.id);
  }
});
```

## Testing Encapsulation

Write a test to verify that spans are correctly scoped:

```javascript
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const exporter = new InMemorySpanExporter();

// After making requests to both /api/a and /api/b:
const spans = exporter.getFinishedSpans();

// Verify that pluginA spans are not children of pluginB spans
const pluginASpans = spans.filter(s => s.attributes['fastify.route'] === '/api/a');
const pluginBSpans = spans.filter(s => s.attributes['fastify.route'] === '/api/b');

// Each set should have its own parent chain
pluginASpans.forEach(span => {
  const parentId = span.parentSpanContext?.spanId;
  if (parentId) {
    const parent = spans.find(s => s.spanContext().spanId === parentId);
    // Parent should not be a pluginB span
    assert(!parent || parent.attributes['fastify.route'] !== '/api/b');
  }
});
```

## Summary

Fastify instrumentation can create hook and handler spans that make plugin boundaries hard to read in traces. The most pragmatic fix is to reduce instrumentation granularity to the HTTP level, or to register tracing as a Fastify plugin that respects scope boundaries. Test your span hierarchies to ensure they reflect your application's actual plugin structure.
