# How to Configure OpenTelemetry in Next.js Using @vercel/otel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Next.js, Vercel, JavaScript, Configuration, Edge

Description: Learn how to use Vercel's official OpenTelemetry package for seamless observability in Next.js applications deployed on Vercel and other platforms.

Vercel created `@vercel/otel` to simplify OpenTelemetry integration for Next.js applications. This package provides a zero-config approach that works out of the box on Vercel's platform while remaining compatible with self-hosted deployments. Unlike manual OpenTelemetry setup, it handles edge cases specific to Next.js and Vercel's infrastructure.

The package abstracts away complexity while providing sensible defaults for most applications. It automatically configures exporters, fetch instrumentation, and resource attributes based on your deployment environment.

## When to Use @vercel/otel

Choose `@vercel/otel` if you're deploying to Vercel or want a simplified setup process. The package shines when you need quick observability without diving into OpenTelemetry's configuration details.

However, if you need complete control over SDK initialization, unsupported instrumentation patterns, or experimental OpenTelemetry features, manual OpenTelemetry setup might be more appropriate. The `@vercel/otel` package optimizes for convenience while still exposing common configuration hooks.

## Installation and Basic Setup

Install the package alongside OpenTelemetry's API:

```bash
npm install @vercel/otel @opentelemetry/api
```

The `@opentelemetry/api` package provides the interfaces for creating spans and accessing the tracing API, while `@vercel/otel` handles all the SDK configuration.

Create your instrumentation file in the project root, or inside `src` if your Next.js app uses a `src` directory:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'nextjs-vercel-app',
  });
}
```

That's it for basic setup. The package automatically configures trace exporters, span processors, resource attributes, and fetch instrumentation.

If you're using Next.js 13 or 14, enable the instrumentation hook in your Next.js config. This option is not required in Next.js 15 and later:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
```

## How @vercel/otel Works Behind the Scenes

The package detects your deployment environment and configures OpenTelemetry accordingly. On Vercel, it can use Vercel's OpenTelemetry collector when a tracing integration is configured. In other environments, it looks for standard OpenTelemetry environment variables.

```typescript
// What @vercel/otel does internally (simplified):
// 1. Detects if running on Vercel platform
// 2. Configures the best trace exporter for the environment
// 3. Sets up fetch instrumentation
// 4. Adds resource attributes for service identification
// 5. Initializes the SDK with span processing
```

This automatic configuration means you don't need to manually wire up exporters, processors, or instrumentations. The package handles the boilerplate.

## Configuration Options

While `@vercel/otel` aims for zero-config, it supports customization through options:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'my-nextjs-app',

    // Control which built-in instrumentations are enabled
    instrumentations: ['fetch'],

    // Configure the built-in fetch instrumentation
    instrumentationConfig: {
      fetch: {
        ignoreUrls: [/\/health$/, 'https://internal.example.com'],
        propagateContextUrls: [/^https:\/\/api\.example\.com/],
      },
    },

    // Add custom resource attributes
    attributes: {
      'deployment.environment': process.env.NODE_ENV,
      'app.version': process.env.APP_VERSION || '1.0.0',
      'team.name': 'platform-engineering',
    },
  });
}
```

These options let you tailor the observability setup to your needs while keeping the simple configuration surface.

## Environment Variables for Vercel Deployments

When deploying to Vercel, install an observability integration from the Vercel Marketplace and enable traces for that integration. If you need to send traces directly to a custom OTLP backend instead, add standard OpenTelemetry environment variables through the Vercel dashboard:

```bash
# Custom OTLP base endpoint for third-party backends
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector.com

# Or use a trace-specific endpoint when including /v1/traces
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://your-otel-collector.com/v1/traces

# Authentication headers
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-api-key
```

For Vercel's collector, the important setup is the tracing integration and the `registerOTel` call. For a custom OTLP exporter, `OTEL_EXPORTER_OTLP_ENDPOINT` is a base URL; the OTLP HTTP exporter appends `/v1/traces` for traces. Use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` if you want to provide the full trace endpoint yourself.

## Using with Third-Party Observability Backends

You can use `@vercel/otel` with any OpenTelemetry-compatible backend, not just Vercel's built-in observability:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  // The package respects standard OpenTelemetry env vars
  registerOTel({
    serviceName: 'nextjs-app',
  });
}
```

Configure your backend through environment variables:

```bash
# For Honeycomb
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=your-api-key

# For Grafana Cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic base64-encoded-credentials

# For self-hosted collectors
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

The package automatically picks up these variables and configures the exporter appropriately.

## Creating Custom Spans

Once `@vercel/otel` is configured, use the standard OpenTelemetry API to create custom spans:

```typescript
// app/api/users/route.ts
import { SpanStatusCode, trace } from '@opentelemetry/api';

export async function GET(request: Request) {
  const tracer = trace.getTracer('users-api');

  // Create a span for the entire request handler
  return await tracer.startActiveSpan('get-users', async (span) => {
    try {
      // Add useful attributes to the span
      span.setAttribute('http.method', 'GET');
      span.setAttribute('http.route', '/api/users');

      // Nested span for database query
      const users = await tracer.startActiveSpan('db.query.users', async (dbSpan) => {
        try {
          dbSpan.setAttribute('db.system', 'postgresql');
          dbSpan.setAttribute('db.operation', 'SELECT');

          const result = await db.user.findMany({
            take: 100,
          });

          dbSpan.end();
          return result;
        } catch (error) {
          dbSpan.recordException(error as Error);
          dbSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Database query failed' });
          dbSpan.end();
          throw error;
        }
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return Response.json(users);
    } catch (error) {
      // Record exceptions in spans
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Internal error' });
      span.end();

      return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
  });
}
```

The `@vercel/otel` package ensures these spans are properly exported to your configured backend.

## Tracing Server Actions

Next.js Server Actions work seamlessly with OpenTelemetry when using `@vercel/otel`:

```typescript
// app/actions/create-post.ts
'use server';

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const tracer = trace.getTracer('server-actions');

  return await tracer.startActiveSpan('create-post', async (span) => {
    try {
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;

      span.setAttribute('post.title', title);

      // Wrap the database call in a span unless your database client has its own instrumentation
      const post = await tracer.startActiveSpan('db.create.post', async (dbSpan) => {
        try {
          const result = await db.post.create({
            data: { title, content },
          });

          dbSpan.end();
          return result;
        } catch (error) {
          dbSpan.recordException(error as Error);
          dbSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Database create failed' });
          dbSpan.end();
          throw error;
        }
      });

      // Track cache revalidation
      await tracer.startActiveSpan('revalidate-cache', async (revalidateSpan) => {
        try {
          revalidatePath('/posts');
        } finally {
          revalidateSpan.end();
        }
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return { success: true, postId: post.id };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Create post failed' });
      span.end();
      throw error;
    }
  });
}
```

Server Actions are just server-side functions, so the instrumentation works identically to API routes.

## Monitoring Middleware

Next.js middleware runs before matched requests, making it a critical area to monitor. Middleware uses the Edge runtime by default, and custom spans from Edge runtime functions are not supported. If you are on Next.js 15.5 or later and run middleware on the Node.js runtime, you can manually create spans:

```typescript
// middleware.ts
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const tracer = trace.getTracer('middleware');

  // Note: middleware runs before other instrumentations,
  // so we manually create spans here
  const span = tracer.startSpan('middleware.execution');

  span.setAttribute('http.url', request.url);
  span.setAttribute('http.method', request.method);

  try {
    // Authentication check example
    const token = request.cookies.get('auth-token');

    if (!token) {
      span.setAttribute('auth.result', 'unauthorized');
      span.end();
      return NextResponse.redirect(new URL('/login', request.url));
    }

    span.setAttribute('auth.result', 'authorized');
    span.end();
    return NextResponse.next();
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Middleware failed' });
    span.end();
    throw error;
  }
}

export const config = {
  matcher: '/dashboard/:path*',
  runtime: 'nodejs',
};
```

Middleware spans help you understand authentication latency, redirect patterns, and early request filtering when middleware is running on the Node.js runtime. On the Edge runtime, use Vercel's built-in routing middleware observability instead of custom OpenTelemetry spans.

## Debugging Trace Export Issues

If traces aren't appearing in your backend, add debugging to your instrumentation:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';

export function register() {
  // Enable debug logging in development
  if (process.env.NODE_ENV === 'development') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  registerOTel({
    serviceName: 'nextjs-app',
  });

  console.log('OpenTelemetry registered with config:', {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: 'nextjs-app',
  });
}
```

The diagnostic logger shows detailed information about span creation, batching, and export attempts. This is invaluable for troubleshooting connectivity issues.

## Performance Considerations

OpenTelemetry adds overhead to every traced operation. Here's how to minimize impact:

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'nextjs-app',

    instrumentationConfig: {
      fetch: {
        // Ignore high-volume, low-value endpoints
        ignoreUrls: [/\/health$/, /\/metrics$/],
      },
    },
  });
}
```

Additionally, implement sampling in production to reduce trace volume:

```bash
# Environment variable for sampling
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces
```

The `@vercel/otel` package respects these standard OpenTelemetry sampling configurations.

## Integration with Vercel Speed Insights

When using Vercel's Speed Insights alongside OpenTelemetry, you get complementary data:

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

Speed Insights captures client-side performance metrics, while OpenTelemetry traces server-side operations. Together, they provide full-stack observability.

## Comparing @vercel/otel to Manual Setup

**Advantages of @vercel/otel:**
- Zero-config for Vercel deployments
- Automatic environment detection
- Fewer dependencies to manage
- Maintained for Vercel and Next.js tracing integrations

**Advantages of manual setup:**
- Full control over SDK lifecycle
- Direct access to any OpenTelemetry SDK feature
- Custom metrics and logs pipelines
- Ability to use bleeding-edge OpenTelemetry features

For most teams, `@vercel/otel` provides the right balance of simplicity and functionality. Teams with complex observability requirements should consider manual setup.

## Production Checklist

Before deploying with `@vercel/otel`:

1. Install and configure a Vercel tracing integration, or configure `OTEL_EXPORTER_OTLP_ENDPOINT` for your backend
2. Add authentication headers if required
3. Enable sampling for high-traffic applications
4. Test trace export in staging environment
5. Set up alerts for missing traces or export failures
6. Document your service name and attribute conventions

## Advanced: Custom Trace Context Propagation

For distributed systems, ensure trace context propagates across service boundaries:

```typescript
// app/api/external-service/route.ts
import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';

export async function GET() {
  const tracer = trace.getTracer('external-calls');

  return await tracer.startActiveSpan('call-external-service', async (span) => {
    try {
      // Inject trace context into outbound headers
      const headers: Record<string, string> = {};
      propagation.inject(context.active(), headers);

      // Make request with trace context
      const response = await fetch('https://api.external-service.com/data', {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      span.setAttribute('external.status', response.status);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return Response.json(data);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'External service call failed' });
      span.end();
      throw error;
    }
  });
}
```

This ensures your traces connect across multiple services, providing end-to-end visibility.

## Conclusion

The `@vercel/otel` package dramatically simplifies OpenTelemetry integration for Next.js applications. With minimal configuration, you get production-ready tracing that works on Vercel and other platforms. The package handles the complexity of OpenTelemetry SDK initialization while exposing just enough configuration for common customization needs.

For teams deploying to Vercel, this package is the recommended approach. It integrates seamlessly with Vercel's infrastructure and requires almost no setup. Even for self-hosted deployments, the simplified configuration reduces the chance of misconfiguration and makes maintenance easier.
