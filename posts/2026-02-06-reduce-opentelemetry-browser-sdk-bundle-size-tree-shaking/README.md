# How to Reduce OpenTelemetry Browser SDK Bundle Size with Tree Shaking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tree Shaking, Bundle Size, Performance, Webpack, Vite, Browser SDK

Description: Learn how to minimize the OpenTelemetry browser SDK bundle size through tree shaking, selective imports, and bundler optimization techniques.

---

Adding observability to your frontend should not come at the cost of making your application slower to load. The OpenTelemetry JavaScript SDK is modular by design, but if you are not careful with your imports and bundler configuration, you can easily pull in 200KB or more of instrumentation code that your users have to download before they can interact with your application. Tree shaking is the primary technique for keeping the bundle lean, and it requires both the right import patterns and the right bundler settings.

## Understanding the Bundle Size Problem

The OpenTelemetry JavaScript ecosystem consists of dozens of packages. The core API (`@opentelemetry/api`) is intentionally small, around 20KB minified. But the SDK packages, exporters, and instrumentations add up quickly. A naive setup that imports everything can produce a surprisingly large bundle.

Here is a rough breakdown of common package sizes (minified, before gzip):

| Package | Approximate Size |
|---------|-----------------|
| @opentelemetry/api | ~20KB |
| @opentelemetry/sdk-trace-web | ~45KB |
| @opentelemetry/sdk-trace-base | ~35KB |
| @opentelemetry/exporter-trace-otlp-http | ~30KB |
| @opentelemetry/context-zone (with zone.js) | ~90KB |
| @opentelemetry/instrumentation-fetch | ~15KB |
| @opentelemetry/instrumentation-document-load | ~12KB |
| @opentelemetry/instrumentation-xml-http-request | ~15KB |
| zone.js (required by ZoneContextManager) | ~80KB |

If you import all of these without tree shaking, you are looking at over 300KB before gzip. With proper tree shaking and the right choices, you can cut this by more than half.

## The Biggest Win: Dropping zone.js

The single largest item in the OpenTelemetry browser bundle is often `zone.js`, which is required by the `ZoneContextManager`. Zone.js patches virtually every async API in the browser to maintain context propagation. It adds around 80-90KB to your bundle and has measurable runtime overhead.

For many applications, you can replace the Zone context manager with a simpler alternative that does not require zone.js.

```javascript
// BEFORE: Using ZoneContextManager (requires zone.js, ~90KB)
// import { ZoneContextManager } from '@opentelemetry/context-zone';

// AFTER: Using StackContextManager (no zone.js dependency, ~2KB)
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { StackContextManager } from '@opentelemetry/sdk-trace-web';

const provider = new WebTracerProvider({
  // ... resource config
});

// StackContextManager works for most use cases
// It maintains context in synchronous code and explicit context.with() calls
provider.register({
  contextManager: new StackContextManager(),
});
```

The trade-off is that `StackContextManager` does not automatically propagate context across native async boundaries like `setTimeout`, `Promise.then`, or event listeners the way zone.js does. If you explicitly wrap the async callbacks where you need propagation with `context.with()` or `context.bind()`, this can work well and saves you nearly 90KB. If your code relies on automatic async context propagation, keep `ZoneContextManager` and make sure your build target is compatible with it.

## Configuring Tree Shaking in Webpack

Tree shaking eliminates dead code from your bundle. Webpack supports it, but only when certain conditions are met: you must use ES module syntax (import/export), your packages must declare side effects correctly, and your configuration must enable the optimization.

```javascript
// webpack.config.js
module.exports = {
  // Production mode enables tree shaking by default
  mode: 'production',

  optimization: {
    // Enable tree shaking
    usedExports: true,

    // Minimize the output to remove dead code
    minimize: true,

    // Enable module concatenation for better tree shaking
    concatenateModules: true,

    // Respect package.json sideEffects metadata
    sideEffects: true,
  },

  resolve: {
    // For browser bundles, prefer browser-specific ESM builds
    // when packages publish them.
    mainFields: ['browser', 'module', 'main'],
  },
};
```

The `mainFields` configuration is important. Many OpenTelemetry packages ship both CommonJS (`main` field) and ESM (`module` field) builds. Tree shaking works much better with ESM, and browser bundles should still prefer the `browser` field when a package provides one, so you want webpack to resolve `browser`, then `module`, then `main`.

## Configuring Tree Shaking in Vite

Vite 8 uses Rolldown for production builds, and earlier Vite versions used Rollup. Both have excellent tree shaking support out of the box. However, there are still optimizations you can make.

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Rolldown handles tree shaking automatically in production
    rolldownOptions: {
      output: {
        // Split OpenTelemetry into its own chunk
        // This allows caching it separately from your app code
        codeSplitting: {
          groups: [
            {
              name: 'otel-core',
              test: /node_modules[\\/]@opentelemetry[\\/](api|sdk-trace-web|sdk-trace-base|resources)/,
              priority: 30,
            },
            {
              name: 'otel-export',
              test: /node_modules[\\/]@opentelemetry[\\/]exporter-trace-otlp-http/,
              priority: 20,
            },
            {
              name: 'otel-instrument',
              test: /node_modules[\\/]@opentelemetry[\\/]instrumentation-(fetch|document-load)/,
              priority: 10,
            },
          ],
        },
      },
    },

    // Set an uncompressed chunk-size warning threshold to catch regressions
    chunkSizeWarningLimit: 100,

    // Enable source maps for debugging but keep them separate
    sourcemap: true,
  },
});
```

Splitting OpenTelemetry into separate chunks has a secondary benefit: since the instrumentation code changes less often than your application code, browsers can cache it independently. Users who revisit your site only re-download the chunks that changed.

## Selective Imports Instead of Barrel Imports

The way you write import statements directly affects tree shaking. Barrel exports (re-exporting everything from a single index file) can prevent tree shaking from working effectively if the bundler cannot determine which exports are actually used.

```javascript
// BAD: Importing from the package root may pull in everything
// Some packages have barrel exports that defeat tree shaking
import {
  WebTracerProvider,
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  InMemorySpanExporter,
} from '@opentelemetry/sdk-trace-web';

// GOOD: Import only what you actually need
// The unused exports (SimpleSpanProcessor, ConsoleSpanExporter,
// InMemorySpanExporter) are excluded by tree shaking
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
```

In practice, the OpenTelemetry packages are structured well enough that modern bundlers can tree-shake barrel imports. But being explicit about your imports makes the dependency graph clearer and helps you audit exactly what is included.

## Lazy Loading Non-Critical Instrumentations

Not every instrumentation needs to be loaded at startup. User interaction tracing, for example, is not critical for the initial page load. You can defer these instrumentations using dynamic imports.

```javascript
// src/tracing.js
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

// Set up the provider with only the critical instrumentations
const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    'service.name': 'my-app',
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: '/v1/traces',
      })
    ),
  ],
});

provider.register();

// Register critical instrumentations immediately
// These capture the initial page load and early API calls
registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation(),
  ],
});

// Lazy-load additional instrumentations after the page is interactive
// This keeps them out of the critical loading path
function loadDeferredInstrumentations() {
  // Dynamic import creates a separate chunk loaded on demand
  import('@opentelemetry/instrumentation-user-interaction').then(
    ({ UserInteractionInstrumentation }) => {
      registerInstrumentations({
        instrumentations: [
          new UserInteractionInstrumentation(),
        ],
      });
    }
  );

  import('@opentelemetry/instrumentation-xml-http-request').then(
    ({ XMLHttpRequestInstrumentation }) => {
      registerInstrumentations({
        instrumentations: [
          new XMLHttpRequestInstrumentation(),
        ],
      });
    }
  );
}

// Load deferred instrumentations after the page is interactive
if (document.readyState === 'complete') {
  loadDeferredInstrumentations();
} else {
  window.addEventListener('load', () => {
    // Wait a moment after load to avoid competing with app initialization
    setTimeout(loadDeferredInstrumentations, 2000);
  });
}
```

This pattern moves non-critical instrumentation code into separate chunks that load after the page is interactive. The user sees the page faster, and the instrumentation kicks in shortly after without any gap in coverage for the events that matter.

## Analyzing Your Bundle

Before and after optimizing, measure your actual bundle size. Webpack Bundle Analyzer and the Rollup Visualizer plugin commonly used with Vite are good tools for this.

```bash
# For webpack: install and run the bundle analyzer

npm install --save-dev webpack-bundle-analyzer

# Add to your webpack config:
# const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
# plugins: [new BundleAnalyzerPlugin()]

# For Vite: use rollup-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.js with bundle visualization
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // Generate a visual report of your bundle
    visualizer({
      filename: 'bundle-report.html',
      open: true,
      gzipSize: true,
    }),
  ],
});
```

Run your production build and inspect the report. Look for:

- Unexpectedly large modules (zone.js is a common offender)
- Duplicate copies of the same package at different versions
- Modules you imported but do not actually use
- Large polyfills that may not be necessary for your target browsers

## Replacing Heavy Exporters

The OTLP HTTP exporter is the standard choice, but if bundle size is critical, you can use a lighter export strategy.

```javascript
// Lightweight alternative: send spans via fetch to a simple endpoint
// instead of using the full OTLP exporter
import { ExportResultCode } from '@opentelemetry/core';

class LightweightExporter {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  // Export spans as a minimal JSON payload
  export(spans, resultCallback) {
    const payload = spans.map((span) => ({
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: span.kind,
      startTime: span.startTime,
      endTime: span.endTime,
      attributes: span.attributes,
      status: span.status,
      events: span.events,
    }));

    // Use sendBeacon for reliability during page unload
    const blob = new Blob(
      [JSON.stringify(payload)],
      { type: 'application/json' }
    );

    const success = navigator.sendBeacon(this.endpoint, blob);

    resultCallback({
      code: success
        ? ExportResultCode.SUCCESS
        : ExportResultCode.FAILED,
    });
  }

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
```

This custom exporter is much smaller than the full OTLP HTTP exporter because it does not include the standard OTLP JSON request shape, retry logic, timeout handling, or configurable headers. The trade-off is that your collector or backend needs to accept this simplified JSON format. For many use cases, particularly when sending to a lightweight proxy endpoint, this works well.

## Practical Bundle Size Targets

Based on real-world projects, here are reasonable bundle size targets for OpenTelemetry browser instrumentation:

| Configuration | Minified | Gzipped |
|--------------|----------|---------|
| Minimal (traces + fetch only, no zone.js) | ~80KB | ~25KB |
| Standard (traces + fetch + doc load + user interaction) | ~120KB | ~35KB |
| Full (all instrumentations + zone.js) | ~300KB | ~85KB |

The minimal configuration is suitable for many applications. It captures API calls and lets you add custom spans; add document-load instrumentation if you also need automatic page load traces. The gzipped size of 25KB is comparable to a small image and adds minimal load time.

## Monitoring Bundle Size in CI

Prevent bundle size regressions by adding a size check to your continuous integration pipeline.

```javascript
// scripts/check-bundle-size.js
import { gzipSync } from 'zlib';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Maximum allowed size for the OpenTelemetry chunk (gzipped)
const MAX_OTEL_CHUNK_SIZE = 40 * 1024; // 40KB gzipped

const distDir = './dist/assets';
const files = readdirSync(distDir);

// Find the OpenTelemetry chunk by name pattern
const otelChunk = files.find((f) => f.startsWith('otel-core'));

if (otelChunk) {
  const size = gzipSync(readFileSync(join(distDir, otelChunk))).length;
  console.log(
    `OpenTelemetry chunk size (gzipped): ${(size / 1024).toFixed(1)}KB`
  );

  if (size > MAX_OTEL_CHUNK_SIZE) {
    console.error(
      `Bundle size exceeds limit of ${MAX_OTEL_CHUNK_SIZE / 1024}KB`
    );
    process.exit(1);
  }
}
```

Running this script in your CI pipeline catches accidental imports or dependency upgrades that inflate the bundle before they reach production.

## Summary

Reducing the OpenTelemetry browser SDK bundle size comes down to four strategies: drop zone.js in favor of StackContextManager, configure your bundler to prefer ESM and enable tree shaking, use selective imports and lazy-load non-critical instrumentations, and measure your bundle size continuously. With these techniques, you can keep the observability overhead under 30KB gzipped, which is a small price for the visibility you get into how your application performs in the real world.
