# How to Fix OpenTelemetry Breaking Fastify's Encapsulation and Plugin System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fastify, Node.js, Plugin System

Description: Resolve the issue where OpenTelemetry instrumentation breaks Fastify's plugin encapsulation by leaking context across scopes.

Fastify's plugin system is built on encapsulation. Each plugin gets its own scope for decorators, hooks, and route prefixes. The OpenTelemetry Fastify instrumentation can break this encapsulation by creating spans that leak across plugin boundaries, causing unexpected parent-child relationships and incorrect timing in traces.

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

OpenTelemetry's Fastify instrumentation hooks into Fastify's lifecycle at a global level. When it creates spans for hooks (onRequest, preHandler, etc.), those spans can become parents for spans in other plugins:

```
GET /api/a                          [========================] 50ms
  onRequest (global auth hook)      [===]                      5ms
  preHandler (pluginA hook)           [===]                    5ms
    DB query (pluginB scope!)           [===]                  3ms  // WRONG PARENT
```

The DB query from pluginB should not be a child of pluginA's preHandler span.

## Fix 1: Use requestHook to Scope Spans Correctly

Configure the Fastify instrumentation to use request hooks that set attributes instead of creating nested spans for every hook:

```javascript
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');

const fastifyInstrumentation = new FastifyInstrumentation({
  requestHook: (span, info) => {
    // Add route info as attributes instead of creating extra spans
    span.setAttribute('fastify.route', info.request.routerPath || 'unknown');
    span.setAttribute('fastify.method', info.request.method);
  },
});
```

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

You lose the per-hook span detail, but the HTTP instrumentation still gives you one span per request with the correct route information.

## Fix 3: Register OpenTelemetry as a Fastify Plugin

Instead of using global auto-instrumentation, register OpenTelemetry as a proper Fastify plugin that respects encapsulation:

```javascript
const { trace, context } = require('@opentelemetry/api');

async function otelPlugin(fastify, opts) {
  const tracer = trace.getTracer('fastify-app');

  // This hook respects Fastify's encapsulation
  fastify.addHook('onRequest', async (request, reply) => {
    const span = tracer.startSpan(`${request.method} ${request.routerPath}`, {
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'fastify.plugin': opts.pluginName || 'root',
      },
    });
    request.otelSpan = span;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (request.otelSpan) {
      request.otelSpan.setAttribute('http.status_code', reply.statusCode);
      request.otelSpan.end();
    }
  });

  fastify.addHook('onError', async (request, reply, error) => {
    if (request.otelSpan) {
      request.otelSpan.setStatus({ code: trace.SpanStatusCode.ERROR });
      request.otelSpan.recordException(error);
    }
  });
}

// Register per-plugin with plugin name
fastify.register(otelPlugin, { pluginName: 'root' });
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
  const parentId = span.parentSpanId;
  if (parentId) {
    const parent = spans.find(s => s.spanContext().spanId === parentId);
    // Parent should not be a pluginB span
    assert(parent.attributes['fastify.route'] !== '/api/b');
  }
});
```

## Summary

OpenTelemetry's Fastify instrumentation can break encapsulation by creating global lifecycle hooks that span across plugin boundaries. The most pragmatic fix is to reduce instrumentation granularity to the HTTP level, or to register tracing as a Fastify plugin that respects scope boundaries. Test your span hierarchies to ensure they reflect your application's actual plugin structure.
