# How to Instrument Cloudflare Workers with OpenTelemetry Using the otel-cf-workers Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cloudflare Workers, Edge Computing, Tracing

Description: Instrument Cloudflare Workers with OpenTelemetry using the otel-cf-workers library to trace edge function execution and export spans.

Cloudflare Workers run at the edge, close to your users. Adding OpenTelemetry tracing to Workers gives you visibility into execution time, subrequest latency, and error rates at every edge location. The `otel-cf-workers` library adapts the OpenTelemetry SDK for the Workers runtime, which has some unique constraints compared to Node.js or browser environments.

## Installing the Library

```bash
npm install @microlabs/otel-cf-workers
```

This library provides an OpenTelemetry SDK that works within the Cloudflare Workers runtime. It handles the differences between the Workers environment (no long-running processes, no filesystem, limited globals) and standard Node.js.

## Basic Instrumentation

Here is a simple instrumented Worker:

```javascript
// src/index.js
import { instrument, ResolveConfigFn } from '@microlabs/otel-cf-workers';

// Define the handler for the Worker
const handler = {
  async fetch(request, env, ctx) {
    // Create a span for the incoming request
    const url = new URL(request.url);

    // Your application logic
    if (url.pathname === '/api/users') {
      const response = await fetch('https://api.example.com/users', {
        headers: { 'Authorization': `Bearer ${env.API_TOKEN}` },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Configure the OpenTelemetry exporter
const config = (env, _trigger) => {
  return {
    exporter: {
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://collector.example.com/v1/traces',
      headers: {
        'Authorization': `Bearer ${env.OTEL_API_KEY}`,
      },
    },
    service: {
      name: 'cloudflare-worker',
      version: '1.0.0',
    },
  };
};

// Export the instrumented handler
export default instrument(handler, config);
```

## Configuration with Wrangler

Set environment variables in your `wrangler.toml`:

```toml
name = "my-worker"
main = "src/index.js"
compatibility_date = "2026-02-01"

[vars]
OTEL_EXPORTER_OTLP_ENDPOINT = "https://collector.example.com/v1/traces"

# Store API keys as secrets (not in config)
# wrangler secret put OTEL_API_KEY
```

## Adding Custom Spans

Create custom spans for specific operations within your Worker:

```javascript
import { instrument, trace } from '@microlabs/otel-cf-workers';

const handler = {
  async fetch(request, env, ctx) {
    const tracer = trace.getTracer('my-worker');

    // Create a span for database lookup
    const user = await tracer.startActiveSpan('db-lookup', async (span) => {
      try {
        span.setAttribute('db.system', 'kv');
        span.setAttribute('db.operation', 'get');

        const result = await env.USERS_KV.get('user:123', { type: 'json' });
        span.setAttribute('db.result.found', result !== null);
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });

    // Create a span for an external API call
    const enrichedUser = await tracer.startActiveSpan('enrich-user', async (span) => {
      span.setAttribute('http.url', 'https://enrichment-api.example.com');

      const response = await fetch('https://enrichment-api.example.com/profile', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });

      span.setAttribute('http.status_code', response.status);
      span.end();
      return response.json();
    });

    return new Response(JSON.stringify(enrichedUser), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

const config = (env) => ({
  exporter: {
    url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: { 'Authorization': `Bearer ${env.OTEL_API_KEY}` },
  },
  service: { name: 'user-worker' },
});

export default instrument(handler, config);
```

## Tracing Durable Object Interactions

If your Worker uses Durable Objects, trace those interactions:

```javascript
const handler = {
  async fetch(request, env, ctx) {
    const tracer = trace.getTracer('my-worker');

    return tracer.startActiveSpan('durable-object-call', async (span) => {
      const id = env.COUNTER.idFromName('global-counter');
      const obj = env.COUNTER.get(id);

      span.setAttribute('durable_object.name', 'global-counter');
      span.setAttribute('durable_object.id', id.toString());

      const response = await obj.fetch(request);

      span.setAttribute('http.status_code', response.status);
      span.end();
      return response;
    });
  },
};
```

## Propagating Trace Context

When your Worker calls upstream services, propagate the trace context:

```javascript
import { propagation, context } from '@microlabs/otel-cf-workers';

async function fetchWithTracing(url, options = {}) {
    // Inject trace context into outgoing request headers
    const headers = new Headers(options.headers || {});
    propagation.inject(context.active(), headers, {
        set: (carrier, key, value) => carrier.set(key, value),
    });

    return fetch(url, { ...options, headers });
}
```

## Collector Configuration

Since Cloudflare Workers export via HTTP (not gRPC), configure the Collector with an HTTP receiver:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins: ["*"]

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: cloud.provider
        value: cloudflare
        action: upsert
      - key: cloud.platform
        value: cloudflare_workers
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Performance Considerations

Workers have a CPU time limit (typically 10ms for free plans, 30s for paid). Tracing adds a small overhead:

- Span creation: microseconds
- HTTP export at the end of the request: a few milliseconds

Use `ctx.waitUntil()` to send traces after the response, so export latency does not affect response time:

```javascript
const handler = {
  async fetch(request, env, ctx) {
    // Handle the request quickly
    const response = new Response('OK');

    // Export traces asynchronously after the response
    ctx.waitUntil(flushTraces());

    return response;
  },
};
```

## Summary

The `otel-cf-workers` library brings OpenTelemetry tracing to Cloudflare Workers. Install the library, wrap your handler with `instrument()`, and configure the OTLP HTTP endpoint. Add custom spans for KV lookups, Durable Object calls, and external API requests. Use `ctx.waitUntil()` to flush traces without adding latency to responses. This gives you full visibility into edge function execution across all Cloudflare locations.
