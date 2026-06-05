# How to Get Started with OpenTelemetry as a Frontend Developer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Frontend, JavaScript, Browser, Real User Monitoring

Description: Implement OpenTelemetry in frontend applications to monitor real user experiences, track performance metrics, and debug issues in production browsers.

Frontend performance directly impacts user experience and business metrics. OpenTelemetry brings the same observability capabilities from backend systems to the browser, letting you track real user interactions, measure performance, and debug production issues.

This guide focuses on what frontend developers need to instrument web applications with OpenTelemetry.

## Why Frontend Developers Need OpenTelemetry

Backend observability shows what happens on your servers, but users experience your application in the browser. Questions like these require frontend telemetry:

- Why do some users see slow page loads?
- Which components cause performance issues?
- How long do API calls take from the user's perspective?
- Do errors happen on specific browsers or devices?
- What user actions lead to crashes?

OpenTelemetry captures this data from real users, not synthetic tests. You see actual performance and errors as users encounter them.

## Core Concepts for Frontend

OpenTelemetry organizes browser telemetry into signals:

**Traces** track user interactions and page loads. When a user clicks a button, OpenTelemetry can create a trace showing instrumented operations triggered by that action, such as API calls and custom spans you add around component work or state updates.

**Metrics** measure browser performance: page load times, Time to First Byte, First Contentful Paint, Largest Contentful Paint, and custom metrics you define.

**Logs** can capture console errors, exceptions, and custom events when you configure log collection. Logs can also be correlated with traces so you can see what operation was running when an error occurred.

## Setting Up Browser Instrumentation

Install OpenTelemetry packages for the browser:

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-trace-web \
            @opentelemetry/sdk-trace-base \
            @opentelemetry/sdk-metrics \
            @opentelemetry/resources \
            @opentelemetry/semantic-conventions \
            @opentelemetry/context-zone \
            @opentelemetry/instrumentation \
            @opentelemetry/instrumentation-fetch \
            @opentelemetry/instrumentation-xml-http-request \
            @opentelemetry/instrumentation-document-load \
            @opentelemetry/instrumentation-user-interaction \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http
```

Create an initialization file that sets up OpenTelemetry:

```javascript
// tracing.js - Initialize before your app
import { metrics } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'my-frontend-app',
  'service.version': '1.0.0',
});

// Configure the OTLP exporter to send data to your collector
const exporter = new OTLPTraceExporter({
  url: 'https://your-collector.example.com/v1/traces',
  headers: {
    // Add authentication if needed
  },
});

// Use batch processing to reduce network overhead
const spanProcessor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  scheduledDelayMillis: 5000,
});

// Create a tracer provider
const provider = new WebTracerProvider({
  resource,
  spanProcessors: [spanProcessor],
});

const metricExporter = new OTLPMetricExporter({
  url: 'https://your-collector.example.com/v1/metrics',
});

const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000,
    }),
  ],
});

metrics.setGlobalMeterProvider(meterProvider);

// Register the provider globally
provider.register({
  contextManager: new ZoneContextManager(),
});

// Register auto-instrumentation for common browser operations
registerInstrumentations({
  instrumentations: [
    // Traces fetch() API calls
    new FetchInstrumentation({
      semconvStabilityOptIn: 'http',
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.example\.com\/.*/,
      ],
      clearTimingResources: true,
    }),
    // Traces XMLHttpRequest calls
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.example\.com\/.*/,
      ],
    }),
    // Traces page load performance
    new DocumentLoadInstrumentation(),
    // Traces user interactions (clicks, etc.)
    new UserInteractionInstrumentation({
      eventNames: ['click', 'submit'],
    }),
  ],
});
```

Import this file at the start of your application:

```javascript
// index.js or main.js - Your application entry point
import './tracing'; // Must be first import
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
```

Now OpenTelemetry automatically traces page loads, user clicks, and HTTP requests.

## Tracing API Calls

The fetch and XMLHttpRequest instrumentations automatically create spans for API calls. You'll see request duration, HTTP status, and errors:

```javascript
// This fetch call is automatically traced
async function loadUserData(userId) {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  const data = await response.json();
  return data;
}
```

The resulting span includes:

- HTTP method and URL
- Status code
- Duration from the browser's perspective
- Any network errors

## Propagating Trace Context to Backend

To connect frontend traces to backend traces, configure CORS to allow trace context headers:

```javascript
// Frontend configuration
new FetchInstrumentation({
  // Allow trace context propagation to these URLs
  propagateTraceHeaderCorsUrls: [
    /https:\/\/api\.example\.com\/.*/,
    'https://auth.example.com',
  ],
})
```

Your backend must accept these headers. Configure CORS appropriately:

```javascript
// Backend CORS configuration (Node.js/Express example)
app.use(cors({
  origin: 'https://your-frontend.com',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'traceparent',  // W3C Trace Context
    'tracestate',   // W3C Trace Context
  ],
}));
```

Now when a user triggers an API call, the trace spans the entire request from button click through frontend processing, HTTP request, backend processing, and response handling.

## Measuring Page Load Performance

The DocumentLoadInstrumentation automatically captures navigation timing and paint timing:

```javascript
new DocumentLoadInstrumentation()
```

This creates spans with timing information:

- DNS lookup time
- TCP connection time
- TLS negotiation time
- Time to First Byte (TTFB)
- DOM content loaded
- Page fully loaded
- First Paint and First Contentful Paint (FCP)

You don't need to manually capture these timings. They're automatically included in every page load trace.

## Tracking User Interactions

The UserInteractionInstrumentation traces user clicks and form submissions:

```javascript
new UserInteractionInstrumentation({
  // Track specific event types
  eventNames: ['click', 'submit', 'change'],

  // Customize which elements to track
  shouldPreventSpanCreation: (eventType, element) => {
    // Don't track clicks on certain elements
    if (element.classList.contains('analytics-ignore')) {
      return true;
    }
    return false;
  },
})
```

Each interaction creates a span showing:

- Element selector
- Event type
- Timestamp
- Any subsequent operations (API calls, navigation)

This reveals how users navigate your application and where they encounter delays.

## Adding Custom Spans for React Components

Track component render times and state updates with custom spans:

```javascript
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { useEffect } from 'react';

function ProductList({ products }) {
  const tracer = trace.getTracer('product-list-component');

  useEffect(() => {
    // Create a span for component initialization
    const span = tracer.startSpan('ProductList.initialize');
    span.setAttribute('product.count', products.length);

    try {
      // Perform initialization
      initializeProductList(products);
    } finally {
      span.end();
    }
  }, [products]);

  const handleFilterChange = (filter) => {
    // Trace user-initiated operations
    tracer.startActiveSpan('ProductList.filter', (span) => {
      span.setAttribute('filter.type', filter.type);
      span.setAttribute('filter.value', filter.value);

      try {
        applyFilter(filter);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
      } finally {
        span.end();
      }
    });
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

These custom spans appear alongside auto-instrumented spans, giving complete visibility into component behavior.

## Measuring Core Web Vitals

Core Web Vitals are critical for SEO and user experience. Measure them with custom metrics:

```javascript
import { metrics } from '@opentelemetry/api';

// Get a meter for custom metrics
const meter = metrics.getMeter('web-vitals');

// Create histograms for Web Vitals
const lcpHistogram = meter.createHistogram('web.vitals.lcp', {
  description: 'Largest Contentful Paint',
  unit: 'ms',
});

const inpHistogram = meter.createHistogram('web.vitals.inp', {
  description: 'Interaction to Next Paint',
  unit: 'ms',
});

const clsHistogram = meter.createHistogram('web.vitals.cls', {
  description: 'Cumulative Layout Shift',
  unit: 'score',
});

// Use the web-vitals library to measure and report
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP((metric) => {
  lcpHistogram.record(metric.value, {
    'page.path': window.location.pathname,
    'device.type': getDeviceType(),
  });
});

onINP((metric) => {
  inpHistogram.record(metric.value, {
    'page.path': window.location.pathname,
    'device.type': getDeviceType(),
  });
});

onCLS((metric) => {
  clsHistogram.record(metric.value, {
    'page.path': window.location.pathname,
    'device.type': getDeviceType(),
  });
});
```

These metrics export to your observability backend, letting you track Web Vitals over time and correlate them with deployments or changes.

## Error Tracking and Reporting

Capture JavaScript errors and unhandled promise rejections:

```javascript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('error-handler');

// Handle uncaught errors
window.addEventListener('error', (event) => {
  const span = tracer.startSpan('uncaught.error');
  span.recordException(event.error);
  span.setAttribute('error.type', 'window.error');
  span.setAttribute('error.message', event.message);
  span.setAttribute('error.filename', event.filename);
  span.setAttribute('error.lineno', event.lineno);
  span.setAttribute('error.colno', event.colno);
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const span = tracer.startSpan('unhandled.rejection');
  span.recordException(event.reason);
  span.setAttribute('error.type', 'unhandled.rejection');
  span.setAttribute('error.message', event.reason?.message || String(event.reason));
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
});
```

Errors are captured as error spans. When an active context is available, they can be correlated with the operation that was running when the error occurred.

## Session and User Context

Add user and session information to all spans:

```javascript
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Add user context to the resource
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'my-frontend-app',
  'user.id': getCurrentUserId(),
  'user.session': getSessionId(),
  'deployment.environment': 'production',
});

const provider = new WebTracerProvider({ resource });
```

Now every span includes user and session context, making it easy to filter traces by user or debug user-specific issues.

## Performance Optimization for Production

Browser instrumentation must be lightweight. Follow these practices:

**Sample traces.** Don't trace every user interaction. Use sampling:

```javascript
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const provider = new WebTracerProvider({
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
});
```

**Batch exports.** Reduce network overhead by batching spans:

```javascript
new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,           // Max spans before forced export
  scheduledDelayMillis: 5000,  // Export every 5 seconds
  exportTimeoutMillis: 3000,   // Timeout for export requests
  maxExportBatchSize: 50,      // Max spans per batch
})
```

**Be selective with attributes.** Don't add large objects as span attributes. Keep attributes small and focused.

**Lazy load instrumentation.** For large applications, load OpenTelemetry asynchronously when you can accept missing the initial page-load trace:

```javascript
// Lazy load OpenTelemetry after initial page render
setTimeout(() => {
  import('./tracing').then(() => {
    console.log('OpenTelemetry initialized');
  });
}, 1000);
```

## Testing Instrumentation Locally

Set up a local collector to test before deploying:

```yaml
# docker-compose.yml

version: '3'
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yml"]
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    ports:
      - "4318:4318"  # OTLP HTTP receiver
      - "55679:55679"  # zPages for debugging
```

Configure the collector to receive OTLP over HTTP and enable zPages:

```yaml
# otel-collector-config.yml

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: detailed

extensions:
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [zpages]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
```

Configure your frontend to send traces to localhost:

```javascript
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});
```

View traces using the collector's zPages at `http://localhost:55679/debug/tracez`.

## Framework-Specific Patterns

Different frameworks require different approaches.

For Vue.js:

```javascript
// main.js
import { createApp } from 'vue';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import './tracing'; // Initialize OpenTelemetry first
import App from './App.vue';

const app = createApp(App);

// Add global error handler
app.config.errorHandler = (err, vm, info) => {
  const tracer = trace.getTracer('vue-error-handler');
  const span = tracer.startSpan('vue.error');
  span.recordException(err);
  span.setAttribute('vue.info', info);
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
};

app.mount('#app');
```

For Angular:

```typescript
// main.ts
import './tracing'; // Initialize OpenTelemetry first
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

// app.module.ts - Add error handler
import { ErrorHandler, Injectable, NgModule } from '@angular/core';
import { trace, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class OtelErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    const tracer = trace.getTracer('angular-error-handler');
    const span = tracer.startSpan('angular.error');
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();

    console.error('Angular error:', error);
  }
}

@NgModule({
  providers: [
    { provide: ErrorHandler, useClass: OtelErrorHandler }
  ],
})
export class AppModule { }
```

## Privacy and Data Sanitization

Be careful about what data you collect. Sanitize sensitive information:

```javascript
new FetchInstrumentation({
  semconvStabilityOptIn: 'http',
  // Sanitize URLs before spans are exported
  applyCustomAttributesOnSpan: (span, request, response) => {
    const requestUrl = request instanceof Request
      ? request.url
      : response instanceof Response
        ? response.url
        : undefined;

    if (!requestUrl) {
      return;
    }

    // Remove sensitive query parameters
    const url = new URL(requestUrl);
    url.searchParams.delete('token');
    url.searchParams.delete('api_key');
    span.setAttribute('url.full', url.toString());
  },
})
```

Never include:
- Passwords or authentication tokens
- Personally identifiable information (unless consented)
- Credit card numbers
- Complete form data

Focus on technical metrics and sanitized context.

## Common Pitfalls to Avoid

**Not handling CORS.** Trace propagation requires CORS headers. Coordinate with backend teams.

**Over-instrumenting.** Don't trace every component render. Focus on user-facing operations and slow paths.

**Forgetting to end spans.** Always call `span.end()`. Use try-finally or the callback pattern.

**Not testing in production.** Browser environments vary. Test instrumentation across browsers and devices.

**Ignoring bundle size.** OpenTelemetry adds to your bundle. Use tree-shaking and code splitting to minimize impact.

## Real User Monitoring Best Practices

Implement sampling strategies based on user segments:

```javascript
// Sample more aggressively for power users
const sampleRate = isPowerUser(userId) ? 0.5 : 0.05;

const provider = new WebTracerProvider({
  sampler: new TraceIdRatioBasedSampler(sampleRate),
});
```

Track business metrics alongside technical metrics:

```javascript
const meter = metrics.getMeter('business-metrics');
const checkoutCounter = meter.createCounter('checkout.completed');

function completeCheckout(orderId, total) {
  checkoutCounter.add(1, {
    'checkout.total': total,
    'checkout.currency': 'USD',
  });

  // Track checkout performance
  const span = tracer.startSpan('checkout.complete');
  span.setAttribute('order.id', orderId);
  // ... processing
  span.end();
}
```

OpenTelemetry brings backend observability practices to the frontend. Start with auto-instrumentation for page loads and API calls, then add custom spans for critical user flows. With proper instrumentation, you'll understand exactly how users experience your application.
