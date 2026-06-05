# How to Troubleshoot Missing Spans in Next.js When Edge Runtime Does Not Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Next.js, Edge Runtime, Vercel

Description: Understand why OpenTelemetry does not work in Next.js Edge Runtime and learn workarounds for tracing edge functions.

Next.js supports two runtimes: the Node.js runtime and the Edge runtime. The Edge runtime runs on a stripped-down V8 isolate without access to native Node.js APIs like `fs`, `net`, or CommonJS `require()`. Since OpenTelemetry's Node.js SDK depends on these APIs, it cannot run in the Edge runtime. This results in missing application OpenTelemetry spans for any route or middleware running on the edge.

## Identifying the Problem

If some of your Next.js routes produce traces and others do not, check which runtime each route uses:

```typescript
// This route uses Node.js runtime - OpenTelemetry works
// app/api/users/route.ts
export const runtime = 'nodejs';  // default

export async function GET() {
  return Response.json({ users: [] });
}
```

```typescript
// This route uses Edge runtime - OpenTelemetry DOES NOT work
// app/api/fast/route.ts
export const runtime = 'edge';  // No OpenTelemetry support

export async function GET() {
  return Response.json({ data: 'fast' });
}
```

Middleware in stable Next.js defaults to the Edge runtime. Experimental Node.js middleware support is available in canary releases, but is not recommended for production:

```typescript
// middleware.ts - Edge by default in stable Next.js
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This code is not traced by OpenTelemetry's Node.js SDK
}
```

## Why Edge Runtime Does Not Support OpenTelemetry

The OpenTelemetry Node.js SDK requires:
- `require()` for module patching (Edge uses ESM only)
- `http`/`https` modules for exporters
- Node-specific runtime APIs used by SDK internals
- `perf_hooks` for high-resolution timestamps

The Edge runtime does not provide native Node.js APIs. Next.js does allow `process.env` for environment variables in Edge code, but the runtime is still closer to a Web Worker environment than a Node.js environment.

## Workaround 1: Use Node.js Runtime

If tracing is more important than edge performance, switch routes to the Node.js runtime:

```typescript
// app/api/users/route.ts
export const runtime = 'nodejs';  // Force Node.js runtime

export async function GET() {
  // This will be traced by OpenTelemetry
  return Response.json({ users: [] });
}
```

Next.js does not provide a `next.config.js` global runtime override for all App Router route segments. Set the runtime per route segment instead:

```javascript
// next.config.js
module.exports = {
  experimental: {
    // No global runtime override available
    // Set runtime per-route instead
  },
};
```

## Workaround 2: Manual Fetch-Based Tracing for Edge

You can implement basic trace propagation in Edge functions using the W3C Trace Context headers manually:

```typescript
// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Generate a simple trace context if none exists
  const traceparent = request.headers.get('traceparent');
  if (!traceparent) {
    const traceId = generateHexId(32);
    const spanId = generateHexId(16);
    const newTraceparent = `00-${traceId}-${spanId}-01`;
    requestHeaders.set('traceparent', newTraceparent);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function generateHexId(length: number): string {
  let id = '';
  do {
    const bytes = new Uint8Array(length / 2);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  } while (/^0+$/.test(id));

  return id;
}
```

This does not create full OpenTelemetry spans, but it propagates trace context on the request so that downstream Node.js routes or services that read the incoming headers can connect their spans to the same trace. For outbound `fetch()` calls made directly from Edge code, pass the `traceparent` header in the fetch request headers.

## Workaround 3: Use the Next.js Built-In Tracing

Next.js 13.4+ has built-in OpenTelemetry support for the Node.js runtime:

```typescript
// instrumentation.ts (Next.js instrumentation file)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only initialize OpenTelemetry for Node.js runtime
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    );
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
  }
}
```

```javascript
// next.config.js for Next.js 13 and 14
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
};
```

The `register()` function is called once when a new Next.js server instance starts. The `NEXT_RUNTIME` check ensures the SDK only initializes in the Node.js runtime. In Next.js 15 and later, the instrumentation file is stable and the `instrumentationHook` flag is no longer required.

## Workaround 4: Trace at the Infrastructure Level

If you deploy to Vercel or similar platforms, use their built-in infrastructure tracing and the Vercel OpenTelemetry package for supported application spans:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'next-app' });
}
```

Vercel can show infrastructure spans for routing, middleware, caching, and functions. Framework and custom application spans still depend on OpenTelemetry instrumentation, and custom spans from functions using the Edge runtime are not supported.

## Architecture Decision

If tracing is critical for your application, consider this architecture:

```text
Client -> Edge Runtime (middleware, auth, redirects) -> Node.js Runtime (API routes, SSR)
```

Keep the Edge runtime for lightweight operations that do not need tracing (authentication checks, redirects, A/B testing). Move all business logic to Node.js runtime routes where OpenTelemetry works fully.

## Summary

OpenTelemetry does not work in the Next.js Edge runtime because the Edge runtime lacks the Node.js APIs that the SDK depends on. Use the Node.js runtime for routes that need tracing. For Edge functions, propagate trace context headers manually so downstream services can still connect their spans to the same trace.
