# How to Implement OpenTelemetry in React for Frontend Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, OpenTelemetry, Observability, Tracing, Frontend, Monitoring

Description: A comprehensive guide to implementing OpenTelemetry in React applications for frontend observability, covering automatic instrumentation, custom spans, trace context propagation, and performance monitoring.

---

Frontend observability has traditionally lagged behind backend observability. While backend services enjoy rich tracing, metrics, and logging through OpenTelemetry, React applications often rely on scattered analytics, basic error tracking, or proprietary solutions that do not integrate with your distributed tracing pipeline.

OpenTelemetry changes this. By instrumenting your React application with OpenTelemetry, you can trace user interactions from button click to backend response, measure component render times, capture JavaScript errors with full trace context, and correlate frontend performance with backend latency.

This guide walks through implementing OpenTelemetry in React applications, from basic setup to advanced patterns like trace context propagation and custom instrumentation.

---

## Table of Contents

1. Why Frontend Observability Matters
2. OpenTelemetry Web SDK Overview
3. Setting Up OpenTelemetry in React
4. Automatic Instrumentation
5. Manual Span Creation
6. Trace Context Propagation
7. Error Tracking and Exception Recording
8. Performance Monitoring
9. User Interaction Tracing
10. Custom Attributes and Events
11. React Component Instrumentation
12. Production Configuration
13. Common Patterns and Anti-Patterns
14. Summary

---

## 1. Why Frontend Observability Matters

Modern web applications are distributed systems. A single user action might trigger:

- React component renders and state updates
- API calls to multiple backend services
- Third-party script executions
- Browser resource loading
- Web Worker computations

Without frontend observability, you only see half the picture. A slow user experience might stem from:

- Slow backend APIs (visible in backend traces)
- Network latency (invisible without frontend tracing)
- Slow JavaScript execution (invisible without frontend tracing)
- Large bundle sizes blocking interactivity (invisible without frontend tracing)
- Third-party scripts blocking the main thread (invisible without frontend tracing)

OpenTelemetry in the browser captures all of this and connects it to your existing backend traces, giving you true end-to-end visibility.

---

## 2. OpenTelemetry Web SDK Overview

OpenTelemetry provides a JavaScript SDK specifically designed for browser environments. The key differences from the Node.js SDK:

| Aspect | Node.js SDK | Web SDK |
|--------|-------------|---------|
| Transport | HTTP/gRPC exporters | HTTP with CORS, Beacon API |
| Instrumentation | Auto-instruments Node modules | Auto-instruments fetch, XHR, document load |
| Context | AsyncLocalStorage | Zone.js or manual propagation |
| Sampling | Server-side decisions | Client-side or deferred to collector |
| Bundle Size | Not a concern | Must be minimized |

The Web SDK provides:

- `@opentelemetry/sdk-trace-web`: Core tracing SDK for browsers
- `@opentelemetry/auto-instrumentations-web`: Automatic instrumentation for fetch, XHR, document load
- `@opentelemetry/exporter-trace-otlp-http`: OTLP exporter over HTTP
- `@opentelemetry/context-zone`: Zone.js-based context propagation (optional)

---

## 3. Setting Up OpenTelemetry in React

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-user-interaction \
  @opentelemetry/context-zone
```

### Basic Configuration

Create a dedicated telemetry configuration file that initializes OpenTelemetry before your React app renders.

```typescript
// src/telemetry.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { trace, context } from '@opentelemetry/api';

// Define your service identity
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'react-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.REACT_APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  // Custom attributes for your app
  'app.name': 'MyReactApp',
  'browser.platform': navigator.platform,
  'browser.language': navigator.language,
});

// Configure the OTLP exporter
const exporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTLP_ENDPOINT || 'https://oneuptime.com/otlp/v1/traces',
  headers: {
    'x-oneuptime-token': process.env.REACT_APP_ONEUPTIME_TOKEN || '',
  },
});

// Create the trace provider
const provider = new WebTracerProvider({
  resource,
});

// Use batch processing for efficiency
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  maxExportBatchSize: 10,
  scheduledDelayMillis: 500,
  exportTimeoutMillis: 30000,
}));

// Register the provider globally
provider.register({
  contextManager: new ZoneContextManager(),
});

// Register automatic instrumentations
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.yourdomain\.com\/.*/,
        /https:\/\/.*\.yourdomain\.com\/.*/,
      ],
      clearTimingResources: true,
    }),
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.yourdomain\.com\/.*/,
      ],
    }),
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation({
      eventNames: ['click', 'submit', 'change'],
    }),
  ],
});

// Export tracer for manual instrumentation
export const tracer = trace.getTracer('react-app', '1.0.0');

// Export context for advanced usage
export { context, trace };

// Graceful shutdown
export function shutdownTelemetry(): Promise<void> {
  return provider.shutdown();
}
```

### Initialize Before React

Import the telemetry module at the very top of your entry point, before React initializes.

```typescript
// src/index.tsx
import './telemetry'; // Must be first import

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 4. Automatic Instrumentation

The instrumentations registered in the setup automatically capture several categories of telemetry.

### Document Load Instrumentation

Captures page load performance metrics as spans:

- DNS lookup time
- TCP connection time
- TLS handshake time
- Request/response time
- DOM processing time
- Resource loading time

The resulting trace shows exactly where time was spent loading your page.

```
documentLoad
├── resourceFetch (main.js)
├── resourceFetch (styles.css)
├── resourceFetch (vendor.js)
├── domContentLoaded
└── load
```

### Fetch Instrumentation

Automatically creates spans for every `fetch()` call:

```typescript
// This fetch call is automatically traced
const response = await fetch('/api/users');

// The auto-instrumentation creates a span with:
// - name: "HTTP GET"
// - attributes: http.url, http.method, http.status_code, http.response_content_length
// - duration: time from request start to response complete
```

### XMLHttpRequest Instrumentation

Same as fetch, but for legacy XHR calls (axios with XHR adapter, jQuery.ajax, etc.).

### User Interaction Instrumentation

Captures user interactions like clicks, form submissions, and input changes:

```typescript
// When a user clicks a button, a span is created:
// - name: "click"
// - attributes: target element info
// - child spans: any fetch calls triggered by the click
```

---

## 5. Manual Span Creation

Automatic instrumentation covers network calls and page loads, but business logic requires manual spans.

### Basic Span Creation

```typescript
// src/services/orderService.ts
import { tracer } from '../telemetry';
import { SpanStatusCode } from '@opentelemetry/api';

export async function createOrder(orderData: OrderData): Promise<Order> {
  const span = tracer.startSpan('order.create', {
    attributes: {
      'order.items_count': orderData.items.length,
      'order.total_amount': orderData.totalAmount,
      'order.currency': orderData.currency,
    },
  });

  try {
    // Validate order
    const validationSpan = tracer.startSpan('order.validate');
    const isValid = validateOrder(orderData);
    validationSpan.end();

    if (!isValid) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Order validation failed',
      });
      throw new Error('Invalid order data');
    }

    // Submit to API
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`Order creation failed: ${response.status}`);
    }

    const order = await response.json();
    span.setAttribute('order.id', order.id);
    span.setStatus({ code: SpanStatusCode.OK });

    return order;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### Using startActiveSpan for Automatic Context

```typescript
import { tracer } from '../telemetry';
import { SpanStatusCode, Span } from '@opentelemetry/api';

export async function processCheckout(cartId: string): Promise<CheckoutResult> {
  return tracer.startActiveSpan('checkout.process', async (span: Span) => {
    try {
      span.setAttribute('cart.id', cartId);

      // These child operations automatically inherit the parent context
      const cart = await fetchCart(cartId);
      const validation = await validateCart(cart);
      const payment = await processPayment(cart);
      const confirmation = await sendConfirmation(payment);

      span.setStatus({ code: SpanStatusCode.OK });
      return confirmation;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

async function fetchCart(cartId: string): Promise<Cart> {
  return tracer.startActiveSpan('checkout.fetchCart', async (span: Span) => {
    try {
      const response = await fetch(`/api/carts/${cartId}`);
      const cart = await response.json();
      span.setAttribute('cart.items_count', cart.items.length);
      return cart;
    } finally {
      span.end();
    }
  });
}

async function validateCart(cart: Cart): Promise<ValidationResult> {
  return tracer.startActiveSpan('checkout.validateCart', async (span: Span) => {
    try {
      // Validation logic
      const result = { valid: true, errors: [] };
      span.setAttribute('validation.passed', result.valid);
      return result;
    } finally {
      span.end();
    }
  });
}
```

---

## 6. Trace Context Propagation

Trace context propagation connects frontend spans to backend spans, creating end-to-end distributed traces.

### How It Works

When the fetch instrumentation is configured with `propagateTraceHeaderCorsUrls`, it automatically injects W3C Trace Context headers into outgoing requests:

```
traceparent: 00-{trace_id}-{span_id}-{flags}
tracestate: {vendor-specific-data}
```

Your backend reads these headers and creates child spans that reference the frontend's trace ID.

### Configuring CORS for Trace Propagation

The browser enforces CORS restrictions. Your backend must explicitly allow the trace context headers.

```typescript
// Backend (Express.js example)
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: ['https://your-frontend.com'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'traceparent',
    'tracestate',
  ],
  exposedHeaders: [
    'traceparent',
    'tracestate',
  ],
}));
```

### Frontend Configuration for CORS

```typescript
// In telemetry.ts
new FetchInstrumentation({
  propagateTraceHeaderCorsUrls: [
    // Exact match
    'https://api.yourdomain.com',
    // Regex for all subdomains
    /https:\/\/.*\.yourdomain\.com\/.*/,
    // Multiple API endpoints
    /https:\/\/api\.(staging|production)\.yourdomain\.com\/.*/,
  ],
  // Clear resource timing entries to prevent memory buildup
  clearTimingResources: true,
  // Add custom attributes to fetch spans
  applyCustomAttributesOnSpan: (span, request, response) => {
    span.setAttribute('http.request_id', response.headers.get('x-request-id') || '');
  },
}),
```

### Manual Context Propagation

For cases where automatic propagation does not work (WebSockets, custom protocols), manually inject context:

```typescript
import { propagation, context, trace } from '@opentelemetry/api';

function sendWebSocketMessage(socket: WebSocket, message: any) {
  const span = tracer.startSpan('websocket.send');

  // Inject trace context into message headers
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  const messageWithContext = {
    ...message,
    _traceContext: carrier,
  };

  socket.send(JSON.stringify(messageWithContext));
  span.end();
}
```

### End-to-End Trace Example

Here is what an end-to-end trace looks like:

```
[Frontend] user-click (150ms)
├── [Frontend] checkout.process (140ms)
│   ├── [Frontend] HTTP POST /api/checkout (120ms)
│   │   └── [Backend] POST /api/checkout (115ms)
│   │       ├── [Backend] checkout.validate (5ms)
│   │       ├── [Backend] payment.process (80ms)
│   │       │   └── [Payment Service] charge (75ms)
│   │       └── [Backend] order.create (25ms)
│   │           └── [Database] INSERT orders (20ms)
│   └── [Frontend] checkout.confirmation (15ms)
```

Without trace context propagation, you would see disconnected frontend and backend traces, making it impossible to correlate user actions with backend processing.

---

## 7. Error Tracking and Exception Recording

OpenTelemetry captures JavaScript errors and connects them to the active trace.

### Global Error Handler

```typescript
// src/telemetry.ts (add to existing file)
import { SpanStatusCode } from '@opentelemetry/api';

// Capture unhandled errors
window.addEventListener('error', (event) => {
  const span = trace.getActiveSpan();

  if (span) {
    span.recordException(event.error || new Error(event.message));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: event.message,
    });
  }

  // Create a standalone error span if no active span
  if (!span) {
    const errorSpan = tracer.startSpan('error.unhandled', {
      attributes: {
        'error.type': 'unhandled_error',
        'error.message': event.message,
        'error.filename': event.filename,
        'error.lineno': event.lineno,
        'error.colno': event.colno,
      },
    });
    errorSpan.recordException(event.error || new Error(event.message));
    errorSpan.setStatus({ code: SpanStatusCode.ERROR });
    errorSpan.end();
  }
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const span = trace.getActiveSpan();
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));

  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  } else {
    const errorSpan = tracer.startSpan('error.unhandled_rejection', {
      attributes: {
        'error.type': 'unhandled_rejection',
        'error.message': error.message,
      },
    });
    errorSpan.recordException(error);
    errorSpan.setStatus({ code: SpanStatusCode.ERROR });
    errorSpan.end();
  }
});
```

### React Error Boundary with Tracing

```typescript
// src/components/TracedErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { tracer } from '../telemetry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  traceId?: string;
}

export class TracedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const span = tracer.startSpan('react.error_boundary', {
      attributes: {
        'error.type': error.name,
        'error.message': error.message,
        'react.component_stack': errorInfo.componentStack || '',
        'react.component_name': this.props.componentName || 'unknown',
      },
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    const traceId = span.spanContext().traceId;
    this.setState({ traceId });

    span.end();

    // Log for debugging
    console.error('React Error Boundary caught error:', {
      error,
      componentStack: errorInfo.componentStack,
      traceId,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>Error ID: {this.state.traceId}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage in App

```typescript
// src/App.tsx
import { TracedErrorBoundary } from './components/TracedErrorBoundary';

function App() {
  return (
    <TracedErrorBoundary componentName="App">
      <Header />
      <TracedErrorBoundary componentName="MainContent">
        <MainContent />
      </TracedErrorBoundary>
      <Footer />
    </TracedErrorBoundary>
  );
}
```

---

## 8. Performance Monitoring

### Web Vitals Integration

Capture Core Web Vitals and correlate them with traces.

```typescript
// src/webVitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import { tracer } from './telemetry';

function reportWebVital(metric: Metric): void {
  const span = tracer.startSpan(`web_vital.${metric.name}`, {
    attributes: {
      'web_vital.name': metric.name,
      'web_vital.value': metric.value,
      'web_vital.rating': metric.rating,
      'web_vital.delta': metric.delta,
      'web_vital.id': metric.id,
      'web_vital.navigationType': metric.navigationType,
    },
  });

  // Add rating-based status
  if (metric.rating === 'poor') {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Poor ${metric.name}: ${metric.value}`,
    });
  }

  span.end();
}

export function initWebVitals(): void {
  onCLS(reportWebVital);
  onINP(reportWebVital);
  onLCP(reportWebVital);
  onFCP(reportWebVital);
  onTTFB(reportWebVital);
}
```

```typescript
// src/index.tsx
import './telemetry';
import { initWebVitals } from './webVitals';

// Initialize after React renders
initWebVitals();
```

### Long Task Monitoring

Detect JavaScript execution that blocks the main thread.

```typescript
// src/longTasks.ts
import { tracer } from './telemetry';
import { SpanStatusCode } from '@opentelemetry/api';

export function initLongTaskMonitoring(): void {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'longtask') {
        const span = tracer.startSpan('browser.long_task', {
          startTime: entry.startTime,
          attributes: {
            'long_task.duration_ms': entry.duration,
            'long_task.name': entry.name,
            'long_task.start_time': entry.startTime,
          },
        });

        // Long tasks over 100ms are problematic
        if (entry.duration > 100) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Long task blocked main thread for ${entry.duration}ms`,
          });
        }

        span.end();
      }
    }
  });

  observer.observe({ type: 'longtask', buffered: true });
}
```

### Resource Loading Performance

Monitor individual resource loading times.

```typescript
// src/resourceMonitoring.ts
import { tracer } from './telemetry';

export function initResourceMonitoring(): void {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
      // Skip non-critical resources
      if (entry.initiatorType === 'beacon' || entry.initiatorType === 'fetch') {
        continue;
      }

      const span = tracer.startSpan('resource.load', {
        attributes: {
          'resource.name': entry.name,
          'resource.type': entry.initiatorType,
          'resource.duration_ms': entry.duration,
          'resource.transfer_size': entry.transferSize,
          'resource.encoded_size': entry.encodedBodySize,
          'resource.decoded_size': entry.decodedBodySize,
          'resource.dns_time': entry.domainLookupEnd - entry.domainLookupStart,
          'resource.connect_time': entry.connectEnd - entry.connectStart,
          'resource.ttfb': entry.responseStart - entry.requestStart,
          'resource.download_time': entry.responseEnd - entry.responseStart,
        },
      });

      span.end();
    }
  });

  observer.observe({ type: 'resource', buffered: true });
}
```

---

## 9. User Interaction Tracing

### Custom Click Tracking

```typescript
// src/hooks/useTracedClick.ts
import { useCallback } from 'react';
import { tracer } from '../telemetry';
import { SpanStatusCode, Span } from '@opentelemetry/api';

interface TracedClickOptions {
  spanName: string;
  attributes?: Record<string, string | number | boolean>;
}

export function useTracedClick<T extends (...args: any[]) => any>(
  handler: T,
  options: TracedClickOptions
): T {
  return useCallback(
    ((...args: Parameters<T>) => {
      return tracer.startActiveSpan(options.spanName, (span: Span) => {
        if (options.attributes) {
          span.setAttributes(options.attributes);
        }

        try {
          const result = handler(...args);

          // Handle async handlers
          if (result instanceof Promise) {
            return result
              .then((res) => {
                span.setStatus({ code: SpanStatusCode.OK });
                return res;
              })
              .catch((error) => {
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                throw error;
              })
              .finally(() => span.end());
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.end();
          throw error;
        }
      });
    }) as T,
    [handler, options.spanName, options.attributes]
  );
}
```

### Usage Example

```typescript
// src/components/ProductCard.tsx
import { useTracedClick } from '../hooks/useTracedClick';

function ProductCard({ product }: { product: Product }) {
  const handleAddToCart = useTracedClick(
    async () => {
      await cartService.addItem(product.id, 1);
    },
    {
      spanName: 'user.add_to_cart',
      attributes: {
        'product.id': product.id,
        'product.name': product.name,
        'product.price': product.price,
      },
    }
  );

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

### Form Submission Tracing

```typescript
// src/hooks/useTracedForm.ts
import { useCallback } from 'react';
import { tracer } from '../telemetry';
import { SpanStatusCode, Span } from '@opentelemetry/api';

interface TracedFormOptions {
  formName: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useTracedForm<T>(
  submitHandler: (data: T) => Promise<void>,
  options: TracedFormOptions
) {
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const data = Object.fromEntries(formData) as T;

      return tracer.startActiveSpan(`form.submit.${options.formName}`, async (span: Span) => {
        span.setAttribute('form.name', options.formName);
        span.setAttribute('form.fields_count', Object.keys(data).length);

        try {
          await submitHandler(data);
          span.setStatus({ code: SpanStatusCode.OK });
          span.addEvent('form.submission_success');
          options.onSuccess?.();
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.addEvent('form.submission_failed', {
            'error.message': (error as Error).message,
          });
          options.onError?.(error as Error);
          throw error;
        } finally {
          span.end();
        }
      });
    },
    [submitHandler, options]
  );

  return { handleSubmit };
}
```

---

## 10. Custom Attributes and Events

### Adding Context-Rich Attributes

```typescript
// src/utils/tracing.ts
import { trace, Span } from '@opentelemetry/api';

export function addUserContext(span: Span, user: User | null): void {
  if (user) {
    span.setAttributes({
      'user.id': user.id,
      'user.role': user.role,
      'user.subscription_tier': user.subscriptionTier,
      // Never include PII like email or name
    });
  } else {
    span.setAttribute('user.authenticated', false);
  }
}

export function addPageContext(span: Span): void {
  span.setAttributes({
    'page.url': window.location.href,
    'page.path': window.location.pathname,
    'page.referrer': document.referrer,
    'page.title': document.title,
    'viewport.width': window.innerWidth,
    'viewport.height': window.innerHeight,
  });
}

export function addDeviceContext(span: Span): void {
  span.setAttributes({
    'device.type': getDeviceType(),
    'device.memory': (navigator as any).deviceMemory || 'unknown',
    'device.cores': navigator.hardwareConcurrency || 'unknown',
    'connection.type': (navigator as any).connection?.effectiveType || 'unknown',
    'connection.downlink': (navigator as any).connection?.downlink || 'unknown',
  });
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}
```

### Span Events for Milestones

```typescript
// src/components/CheckoutFlow.tsx
import { tracer } from '../telemetry';
import { Span } from '@opentelemetry/api';

async function processCheckout(span: Span, checkoutData: CheckoutData) {
  // Mark checkout stages with events
  span.addEvent('checkout.started', {
    'cart.items_count': checkoutData.items.length,
    'cart.total': checkoutData.total,
  });

  // Shipping validation
  await validateShipping(checkoutData.shipping);
  span.addEvent('checkout.shipping_validated');

  // Payment processing
  span.addEvent('checkout.payment_started');
  const paymentResult = await processPayment(checkoutData.payment);
  span.addEvent('checkout.payment_completed', {
    'payment.method': checkoutData.payment.method,
    'payment.success': paymentResult.success,
  });

  // Order creation
  const order = await createOrder(checkoutData);
  span.addEvent('checkout.order_created', {
    'order.id': order.id,
  });

  // Confirmation
  await sendConfirmationEmail(order);
  span.addEvent('checkout.confirmation_sent');

  return order;
}
```

---

## 11. React Component Instrumentation

### Higher-Order Component for Tracing

```typescript
// src/hoc/withTracing.tsx
import React, { ComponentType, useEffect, useRef } from 'react';
import { tracer } from '../telemetry';
import { Span, SpanStatusCode } from '@opentelemetry/api';

interface WithTracingOptions {
  spanName?: string;
  trackRender?: boolean;
  trackMount?: boolean;
  trackUnmount?: boolean;
}

export function withTracing<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithTracingOptions = {}
): ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const spanName = options.spanName || `react.component.${displayName}`;

  function TracedComponent(props: P) {
    const mountSpanRef = useRef<Span | null>(null);
    const renderCountRef = useRef(0);

    // Track mounts
    useEffect(() => {
      if (options.trackMount !== false) {
        mountSpanRef.current = tracer.startSpan(`${spanName}.mount`, {
          attributes: {
            'component.name': displayName,
          },
        });
      }

      return () => {
        // Track unmounts
        if (options.trackUnmount && mountSpanRef.current) {
          const unmountSpan = tracer.startSpan(`${spanName}.unmount`, {
            attributes: {
              'component.name': displayName,
              'component.render_count': renderCountRef.current,
            },
          });
          unmountSpan.end();
        }

        mountSpanRef.current?.end();
      };
    }, []);

    // Track renders
    useEffect(() => {
      renderCountRef.current += 1;

      if (options.trackRender) {
        const renderSpan = tracer.startSpan(`${spanName}.render`, {
          attributes: {
            'component.name': displayName,
            'component.render_number': renderCountRef.current,
          },
        });
        renderSpan.end();
      }
    });

    return <WrappedComponent {...props} />;
  }

  TracedComponent.displayName = `withTracing(${displayName})`;
  return TracedComponent;
}
```

### Tracing Hook for Functional Components

```typescript
// src/hooks/useComponentTracing.ts
import { useEffect, useRef } from 'react';
import { tracer } from '../telemetry';
import { Span } from '@opentelemetry/api';

interface ComponentTracingOptions {
  componentName: string;
  attributes?: Record<string, string | number | boolean>;
}

export function useComponentTracing(options: ComponentTracingOptions): void {
  const mountTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);
  const mountSpanRef = useRef<Span | null>(null);

  // Track mount
  useEffect(() => {
    const mountTime = performance.now() - mountTimeRef.current;

    mountSpanRef.current = tracer.startSpan(`component.${options.componentName}.lifecycle`, {
      attributes: {
        'component.name': options.componentName,
        'component.mount_time_ms': mountTime,
        ...options.attributes,
      },
    });

    return () => {
      if (mountSpanRef.current) {
        mountSpanRef.current.setAttribute(
          'component.total_renders',
          renderCountRef.current
        );
        mountSpanRef.current.end();
      }
    };
  }, []);

  // Track renders
  useEffect(() => {
    renderCountRef.current += 1;
  });
}
```

### Usage

```typescript
// src/components/Dashboard.tsx
import { useComponentTracing } from '../hooks/useComponentTracing';

function Dashboard({ userId }: { userId: string }) {
  useComponentTracing({
    componentName: 'Dashboard',
    attributes: {
      'user.id': userId,
    },
  });

  // Component logic
  return <div>Dashboard content</div>;
}

// Or with HOC
const TracedDashboard = withTracing(Dashboard, {
  trackRender: true,
  trackMount: true,
});
```

---

## 12. Production Configuration

### Environment-Based Configuration

```typescript
// src/telemetry.ts
const isProduction = process.env.NODE_ENV === 'production';

// Sampling in production
const sampler = isProduction
  ? new TraceIdRatioBasedSampler(0.1) // 10% sampling
  : new AlwaysOnSampler();

// Batch configuration for production
const batchConfig = isProduction
  ? {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }
  : {
      maxQueueSize: 100,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 500,
      exportTimeoutMillis: 30000,
    };

provider.addSpanProcessor(new BatchSpanProcessor(exporter, batchConfig));
```

### Sensitive Data Filtering

```typescript
// src/telemetry.ts
new FetchInstrumentation({
  propagateTraceHeaderCorsUrls: [/https:\/\/api\.yourdomain\.com\/.*/],
  applyCustomAttributesOnSpan: (span, request, response) => {
    // Sanitize URL parameters
    const url = new URL(request.url);
    const sanitizedParams = new URLSearchParams();

    for (const [key, value] of url.searchParams) {
      // Redact sensitive parameters
      if (['token', 'key', 'password', 'secret', 'auth'].includes(key.toLowerCase())) {
        sanitizedParams.set(key, '[REDACTED]');
      } else {
        sanitizedParams.set(key, value);
      }
    }

    span.setAttribute('http.url_sanitized', `${url.origin}${url.pathname}?${sanitizedParams}`);
  },
}),
```

### Graceful Shutdown

```typescript
// src/telemetry.ts
let isShuttingDown = false;

export async function shutdownTelemetry(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    await provider.forceFlush();
    await provider.shutdown();
  } catch (error) {
    console.error('Error shutting down telemetry:', error);
  }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  // Use sendBeacon for reliable delivery on page close
  const pendingSpans = (provider as any)._activeSpanProcessor?._finishedSpans || [];
  if (pendingSpans.length > 0) {
    navigator.sendBeacon(
      process.env.REACT_APP_OTLP_ENDPOINT || '',
      JSON.stringify(pendingSpans)
    );
  }
});

// Handle visibility change (mobile tab backgrounding)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    provider.forceFlush();
  }
});
```

---

## 13. Common Patterns and Anti-Patterns

### Patterns to Follow

**1. Initialize Early**
```typescript
// Good: Telemetry imports first
import './telemetry';
import React from 'react';
import App from './App';

// Bad: Telemetry after React
import React from 'react';
import './telemetry'; // Too late, React is already loaded
```

**2. Use Active Spans for Context**
```typescript
// Good: Automatic parent-child relationship
tracer.startActiveSpan('parent', (parentSpan) => {
  tracer.startActiveSpan('child', (childSpan) => {
    // childSpan is automatically a child of parentSpan
    childSpan.end();
  });
  parentSpan.end();
});

// Bad: Manual context management everywhere
const parentSpan = tracer.startSpan('parent');
const childSpan = tracer.startSpan('child', {
  // Have to manually set parent
  links: [{ context: parentSpan.spanContext() }],
});
```

**3. End Spans in Finally Blocks**
```typescript
// Good: Always ends span
try {
  await doWork();
} catch (error) {
  span.recordException(error);
} finally {
  span.end();
}

// Bad: Span may not end on error
try {
  await doWork();
  span.end();
} catch (error) {
  // span.end() never called
}
```

### Anti-Patterns to Avoid

**1. High-Cardinality Span Names**
```typescript
// Bad: User ID in span name creates thousands of unique spans
tracer.startSpan(`user.${userId}.fetch`);

// Good: User ID as attribute
const span = tracer.startSpan('user.fetch');
span.setAttribute('user.id', userId);
```

**2. Span Explosion in Loops**
```typescript
// Bad: Creates thousands of spans
items.forEach(item => {
  const span = tracer.startSpan('process.item');
  processItem(item);
  span.end();
});

// Good: Single span with events
const span = tracer.startSpan('process.items');
span.setAttribute('items.count', items.length);
items.forEach((item, index) => {
  processItem(item);
  span.addEvent('item.processed', { index });
});
span.end();
```

**3. PII in Attributes**
```typescript
// Bad: Never include PII
span.setAttribute('user.email', user.email);
span.setAttribute('user.name', user.name);
span.setAttribute('user.phone', user.phone);

// Good: Use non-PII identifiers
span.setAttribute('user.id', user.id);
span.setAttribute('user.role', user.role);
span.setAttribute('user.tier', user.subscriptionTier);
```

**4. Ignoring Errors**
```typescript
// Bad: Error not recorded
try {
  await riskyOperation();
} catch (error) {
  console.error(error);
  // Span shows success, hiding the real issue
}

// Good: Full error context
try {
  await riskyOperation();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
}
```

**5. Not Configuring CORS**
```typescript
// Bad: Trace context not propagated
new FetchInstrumentation()

// Good: Explicit CORS configuration
new FetchInstrumentation({
  propagateTraceHeaderCorsUrls: [
    /https:\/\/api\.yourdomain\.com\/.*/,
  ],
})
```

---

## 14. Summary

| Aspect | Implementation |
|--------|----------------|
| **Setup** | Initialize telemetry before React, use Zone.js for context |
| **Auto Instrumentation** | Fetch, XHR, document load, user interactions |
| **Manual Spans** | Business logic, component lifecycle, user flows |
| **Context Propagation** | Configure CORS, use `propagateTraceHeaderCorsUrls` |
| **Error Tracking** | Global handlers, Error Boundaries, `recordException` |
| **Performance** | Web Vitals, long tasks, resource monitoring |
| **Production** | Sampling, batching, sensitive data filtering |
| **Anti-Patterns** | Avoid high cardinality, span explosion, PII |

### Key Takeaways

1. **Frontend observability completes the picture**. Without it, you are only seeing half of your distributed traces.

2. **Context propagation is critical**. Configure CORS correctly to connect frontend and backend traces.

3. **Auto-instrumentation handles the basics**. Manual instrumentation adds business context.

4. **Error boundaries with tracing** give you full context when React components fail.

5. **Web Vitals integration** connects performance metrics to specific traces.

6. **Production configuration matters**. Sampling, batching, and data filtering are essential at scale.

7. **Avoid common pitfalls**. High-cardinality names, span explosion, and PII in attributes will cause problems.

---

## Quick Reference: OpenTelemetry React Integration

| Task | Solution |
|------|----------|
| Initialize tracing | Import `telemetry.ts` before React in `index.tsx` |
| Trace API calls | `FetchInstrumentation` with CORS config |
| Trace user clicks | `UserInteractionInstrumentation` or `useTracedClick` hook |
| Trace components | `useComponentTracing` hook or `withTracing` HOC |
| Connect to backend | Configure `propagateTraceHeaderCorsUrls` |
| Handle errors | `TracedErrorBoundary` + global error listeners |
| Monitor performance | Web Vitals + PerformanceObserver |
| Add context | `span.setAttribute()` for key-value pairs |
| Mark milestones | `span.addEvent()` for timestamped notes |
| Production sampling | `TraceIdRatioBasedSampler` with 10-20% rate |

---

*Ready to see your frontend traces? Send them to [OneUptime](https://oneuptime.com) via OTLP and correlate with your backend services for complete end-to-end visibility.*

---

### Related Reading

- [What are Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) - Deep dive into tracing fundamentals
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view) - Correlate logs with traces
- [How to Instrument Express.js with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view) - Backend instrumentation guide
- [Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view) - Understanding logs, metrics, and traces
