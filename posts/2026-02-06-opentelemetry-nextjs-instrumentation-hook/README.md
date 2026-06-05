# How to Set Up OpenTelemetry in Next.js with the Instrumentation Hook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Next.js, JavaScript, Instrumentation Hook, React, SSR

Description: Complete guide to setting up OpenTelemetry in Next.js applications using the instrumentation hook for automatic tracing of server-side operations.

Next.js 13.2 introduced the instrumentation hook, a built-in mechanism for running code once when the server starts. This hook is perfect for initializing OpenTelemetry because it runs before your application code loads, ensuring that all subsequent operations are properly traced.

The instrumentation hook solves a critical problem: how to initialize observability tools before any of your application code executes. Without this, you risk missing traces from your initial module imports and startup operations.

## Why the Instrumentation Hook Matters

Traditional Node.js applications require you to import your instrumentation file before anything else, typically using the `-r` flag or as the first import. Next.js abstracts away the server startup process, making this approach problematic. The instrumentation hook gives you a standardized, framework-native way to inject initialization code.

The hook runs in both development and production environments, but only in server runtimes such as Node.js and Edge. This makes it ideal for OpenTelemetry setup since you typically want different instrumentation behavior between client and server contexts.

## Project Setup

First, ensure you have the necessary dependencies. OpenTelemetry requires several packages to work properly with Next.js.

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

Your `package.json` should include these dependencies with compatible versions. The auto-instrumentations package automatically instruments common libraries like HTTP, Express, and database clients.

## Creating the Instrumentation File

Create a file named `instrumentation.ts` (or `instrumentation.js`) in your project root, at the same level as your `package.json`. If your app uses a `src` directory, you can place the file inside `src` alongside `app` or `pages`.

```typescript
// instrumentation.ts
// This file runs once when the Next.js server starts

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');

    // Create a resource that identifies your service
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'nextjs-app',
      [ATTR_SERVICE_VERSION]: '1.0.0',
    });

    // Configure the OTLP exporter to send traces to your backend
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: {},
    });

    // Initialize the SDK with automatic instrumentations
    const sdk = new NodeSDK({
      resource: resource,
      traceExporter: traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Customize instrumentation for specific libraries
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation to reduce noise
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();
    console.log('OpenTelemetry instrumentation started');
  }
}
```

The `register` function is the entry point that Next.js calls. We use dynamic imports to avoid loading OpenTelemetry modules on the client side, where they would cause errors or bloat your bundle size.

## Enabling Instrumentation in Next.js 13.2-14

In Next.js 13.2 through 14, the instrumentation hook requires an experimental flag in your Next.js configuration. Edit your `next.config.js` file:

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

Without this flag, Next.js 13.2 through 14 will not call your `register` function. In Next.js 15 and later, the instrumentation file is stable and the `experimental.instrumentationHook` config option can be removed.

## Environment Configuration

Create a `.env.local` file to configure your OpenTelemetry collector endpoint and other settings:

```bash
# OpenTelemetry configuration

OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=nextjs-app
OTEL_LOG_LEVEL=INFO

# For production, use your actual collector URL
# OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel-collector.yourcompany.com/v1/traces
```

These environment variables follow OpenTelemetry conventions, making your configuration portable across different observability backends.

## Verifying the Setup

Create a simple API route to test that tracing works correctly:

```typescript
// app/api/test-trace/route.ts
import { SpanStatusCode, trace } from '@opentelemetry/api';

export async function GET() {
  const tracer = trace.getTracer('nextjs-test');

  // Create a custom span to track this operation
  return tracer.startActiveSpan('test-endpoint', async (span) => {
    span.setAttribute('test.attribute', 'test-value');

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    return Response.json({ message: 'Trace recorded' });
  });
}
```

Start your development server and hit the endpoint:

```bash
npm run dev
# Visit http://localhost:3000/api/test-trace
```

Check your OpenTelemetry collector or observability backend to verify that traces appear. You should see spans for the HTTP request and your custom span.

## Advanced Configuration for Production

For production deployments, you want more robust error handling and graceful shutdown:

```typescript
// instrumentation.ts (production-ready version)
let sdk: any = null;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

    try {
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nextjs-app',
      });

      const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        headers: {
          // Add authentication headers if needed
          'Authorization': process.env.OTEL_AUTH_HEADER || '',
        },
      });

      sdk = new NodeSDK({
        resource: resource,
        traceExporter: traceExporter,
        instrumentations: [getNodeAutoInstrumentations()],
      });

      sdk.start();

      // Graceful shutdown handling
      process.on('SIGTERM', async () => {
        try {
          await sdk.shutdown();
          console.log('OpenTelemetry SDK shut down successfully');
        } catch (error) {
          console.error('Error shutting down OpenTelemetry SDK', error);
        } finally {
          process.exit(0);
        }
      });

      console.log('OpenTelemetry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry', error);
      // Don't crash the application if telemetry fails
    }
  }
}
```

## Handling TypeScript Configuration

Make sure the instrumentation file is included in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "esnext",
    "moduleResolution": "bundler"
  },
  "include": [
    "instrumentation.ts",
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx"
  ]
}
```

This ensures TypeScript properly compiles your instrumentation file alongside your application code.

## Common Pitfalls and Solutions

**Issue: Instrumentation not running**
On Next.js 13.2 through 14, check that the experimental flag is enabled. Also check that your file is named exactly `instrumentation.ts` or `instrumentation.js`. The file must be in the project root or `src` directory, not in the `app` or `pages` directory.

**Issue: Client-side errors about Node modules**
Always check `process.env.NEXT_RUNTIME === 'nodejs'` before importing OpenTelemetry packages. These are Node.js-only modules and will break if loaded in the browser.

**Issue: Missing traces for some requests**
The instrumentation hook runs once at startup. If you're seeing missing traces, ensure your OpenTelemetry collector is reachable and properly configured. Check network connectivity and firewall rules.

## Integration with Existing Monitoring

If you already have monitoring set up, the instrumentation hook plays nicely with other tools:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize OpenTelemetry
    await initializeOpenTelemetry();

    // Initialize other monitoring tools
    if (process.env.ENABLE_CUSTOM_METRICS) {
      await initializeCustomMetrics();
    }
  }
}

async function initializeOpenTelemetry() {
  // OpenTelemetry setup code here
}

async function initializeCustomMetrics() {
  // Your custom metrics initialization
}
```

The instrumentation hook is your single entry point for all server-side initialization logic, making it easier to manage multiple observability tools.

## Monitoring Server Components

Server Components in the App Router can benefit from OpenTelemetry instrumentation when they call libraries covered by your configured instrumentations. For example, a database client supported by the Node auto-instrumentations package can produce spans from a Server Component:

```typescript
// app/products/page.tsx
async function getProducts() {
  // This database call is traced if your database client is supported and enabled
  const products = await db.products.findMany();
  return products;
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

The instrumentation hook ensures that supported server-side libraries are initialized for tracing before these components run, without additional tracing setup code in your components.

## Conclusion

The Next.js instrumentation hook provides a clean, framework-native way to set up OpenTelemetry. By following this approach, you get automatic tracing for supported server-side libraries with minimal configuration. Your observability setup runs before your application handles requests, improving coverage of server-side operations.

The key benefits are simplicity, reliability, and integration with Next.js's architecture. You avoid hacky workarounds and get a solution that works consistently across development and production environments.
