# How to Set Up Error Tracking in React with OpenTelemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, OpenTelemetry, Error Tracking, Observability, Debugging, Frontend

Description: Learn how to implement comprehensive error tracking in React applications using OpenTelemetry, including error boundaries, span recording, and production-ready configurations.

---

Error tracking in frontend applications is often overlooked compared to backend observability, but React applications can fail in countless ways - network errors, rendering failures, state inconsistencies, and user interaction bugs. OpenTelemetry provides a vendor-neutral standard for capturing and correlating these errors with traces.

For background on OpenTelemetry concepts, see our guides on [traces and spans](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) and [structured logging](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view).

## Why OpenTelemetry for React Error Tracking

Traditional error tracking services capture errors in isolation. OpenTelemetry connects errors to the broader context - which user action triggered the error, what API calls preceded it, how long the user waited before the failure.

Benefits of OpenTelemetry for React:

- **Distributed tracing**: Connect frontend errors to backend traces
- **Vendor neutrality**: Switch observability backends without code changes
- **Rich context**: Attach user sessions, component state, and navigation history
- **Standardized attributes**: Consistent error classification across services

## Installation and Setup

### Required Packages

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/context-zone \
  @opentelemetry/instrumentation \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### Basic Tracer Configuration

Create `src/telemetry.ts` - this initializes OpenTelemetry before your React app renders.

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'react-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.REACT_APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
});

const exporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const provider = new WebTracerProvider({ resource });

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  maxExportBatchSize: 10,
  scheduledDelayMillis: 500,
}));

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/localhost/, /your-api-domain\.com/],
    }),
  ],
});

export const tracer = trace.getTracer('react-frontend');
export { SpanStatusCode };
```

### Loading Telemetry Before React

In your `src/index.tsx`, import telemetry first:

```typescript
import './telemetry';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
```

## Error Boundary Integration

React Error Boundaries catch JavaScript errors in their child component tree. We enhance them with OpenTelemetry to capture rich error context.

### Basic Error Boundary with Tracing

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  traceId: string | null;
}

export class TracedErrorBoundary extends Component<Props, State> {
  private tracer = trace.getTracer('error-boundary');

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, traceId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const span = this.tracer.startSpan('react.error_boundary', {
      attributes: {
        'error.type': error.name,
        'error.message': error.message,
        'error.component_stack': errorInfo.componentStack || 'unknown',
        'react.component': this.getComponentName(errorInfo),
      },
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    const traceId = span.spanContext().traceId;
    this.setState({ traceId });
    span.end();

    this.props.onError?.(error, errorInfo);
  }

  private getComponentName(errorInfo: ErrorInfo): string {
    const match = (errorInfo.componentStack || '').match(/in (\w+)/);
    return match ? match[1] : 'Unknown';
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          {this.state.traceId && <p>Error ID: {this.state.traceId}</p>}
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Enhanced Error Boundary with User Context

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface Props {
  children: ReactNode;
  boundaryName?: string;
  userContext?: { userId?: string; sessionId?: string };
}

interface State {
  hasError: boolean;
  traceId: string | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private tracer = trace.getTracer('enhanced-error-boundary');
  private mountTime = Date.now();

  state: State = { hasError: false, traceId: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { boundaryName = 'default', userContext } = this.props;

    const span = this.tracer.startSpan(`react.error_boundary.${boundaryName}`, {
      attributes: {
        'error.type': error.name,
        'error.message': error.message,
        'error.boundary_name': boundaryName,
        'react.component_stack': errorInfo.componentStack || '',
        ...(userContext?.userId && { 'enduser.id': userContext.userId }),
        ...(userContext?.sessionId && { 'session.id': userContext.sessionId }),
        'browser.url': window.location.href,
        'error.time_since_mount_ms': Date.now() - this.mountTime,
      },
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    this.setState({ traceId: span.spanContext().traceId });
    span.end();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>An unexpected error occurred</h2>
          {this.state.traceId && <p>Trace ID: <code>{this.state.traceId}</code></p>}
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## Span Recording for User Interactions

Track user interactions as spans to understand the sequence of events leading to errors.

### Click and Event Tracking

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('user-interactions');

export function withTracedClick<T extends (...args: any[]) => any>(
  handler: T,
  spanName: string,
  attributes?: Record<string, string | number | boolean>
): T {
  return ((...args: Parameters<T>) => {
    const span = tracer.startSpan(`click.${spanName}`, {
      attributes: { 'interaction.type': 'click', ...attributes },
    });

    try {
      const result = handler(...args);

      if (result instanceof Promise) {
        return result
          .then((value) => { span.setStatus({ code: SpanStatusCode.OK }); span.end(); return value; })
          .catch((error) => {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.end();
            throw error;
          });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      throw error;
    }
  }) as T;
}

export function useTracedCallback<T extends (...args: any[]) => any>(
  callback: T,
  spanName: string,
  deps: React.DependencyList,
  attributes?: Record<string, string | number | boolean>
): T {
  return React.useCallback(withTracedClick(callback, spanName, attributes), deps) as T;
}
```

### Usage in Components

```typescript
import React, { useState } from 'react';
import { useTracedCallback } from './tracing';

function ProductPage({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);

  const handleAddToCart = useTracedCallback(
    async () => {
      setLoading(true);
      try {
        await fetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
      } finally {
        setLoading(false);
      }
    },
    'add_to_cart',
    [productId],
    { 'product.id': productId }
  );

  return <button onClick={handleAddToCart} disabled={loading}>Add to Cart</button>;
}
```

## API Error Tracking

Enhance fetch with custom error handling and tracing.

```typescript
import { trace, SpanStatusCode, propagation, context } from '@opentelemetry/api';

const tracer = trace.getTracer('api-client');

export async function tracedFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const span = tracer.startSpan(`fetch.${method}`, {
    attributes: { 'http.method': method, 'http.url': url },
  });

  const headers = new Headers(options.headers);
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => carrier.set(key, value),
  });

  try {
    const response = await fetch(url, { ...options, headers });
    span.setAttribute('http.status_code', response.status);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
      throw error;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    return response.json();
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
}
```

## Global Error Handlers

Capture unhandled errors and promise rejections.

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('global-errors');

export function setupGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    const span = tracer.startSpan('window.error', {
      attributes: {
        'error.type': 'uncaught_error',
        'error.message': event.message,
        'error.filename': event.filename,
        'error.lineno': event.lineno,
        'browser.url': window.location.href,
      },
    });

    if (event.error) span.recordException(event.error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
    span.end();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const span = tracer.startSpan('window.unhandledrejection', {
      attributes: {
        'error.type': 'unhandled_promise_rejection',
        'error.message': error.message,
        'browser.url': window.location.href,
      },
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.end();
  });
}
```

## Navigation and Route Tracking

Track navigation errors and route changes with React Router.

```typescript
import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('navigation');

export function useNavigationTracing(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const spanRef = useRef<Span | null>(null);
  const previousPath = useRef('');

  useEffect(() => {
    if (spanRef.current) {
      spanRef.current.setStatus({ code: SpanStatusCode.OK });
      spanRef.current.end();
    }

    const span = tracer.startSpan('navigation.route_change', {
      attributes: {
        'navigation.type': navigationType,
        'navigation.from': previousPath.current,
        'navigation.to': location.pathname,
      },
    });

    spanRef.current = span;
    previousPath.current = location.pathname;

    return () => { spanRef.current?.end(); };
  }, [location, navigationType]);
}
```

## Session Context Provider

Enrich all traces with session and user information.

```typescript
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { trace } from '@opentelemetry/api';

interface SessionData {
  sessionId: string;
  startTime: number;
}

const SessionContext = createContext<SessionData | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session: SessionData = {
    sessionId: sessionStorage.getItem('session_id') || crypto.randomUUID(),
    startTime: Date.now(),
  };

  useEffect(() => {
    sessionStorage.setItem('session_id', session.sessionId);
    const tracer = trace.getTracer('session');
    const span = tracer.startSpan('session.start', {
      attributes: { 'session.id': session.sessionId },
    });
    span.end();
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
```

## Production Configuration

### Environment-Based Setup

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const isDevelopment = process.env.NODE_ENV === 'development';

const exporter = isDevelopment
  ? new ConsoleSpanExporter()
  : new OTLPTraceExporter({ url: process.env.REACT_APP_OTLP_ENDPOINT });

const sampler = isDevelopment
  ? new TraceIdRatioBasedSampler(1.0)
  : new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.1) });

const spanProcessor = isDevelopment
  ? new SimpleSpanProcessor(exporter)
  : new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
    });

const provider = new WebTracerProvider({ sampler });
provider.addSpanProcessor(spanProcessor);
```

### Error Rate Limiting

```typescript
class ErrorRateLimiter {
  private counts = new Map<string, { count: number; reset: number }>();
  private maxPerMinute = 50;

  shouldReport(error: Error): boolean {
    const key = `${error.name}:${error.message.slice(0, 100)}`;
    const now = Date.now();
    const record = this.counts.get(key);

    if (!record || now > record.reset) {
      this.counts.set(key, { count: 1, reset: now + 60000 });
      return true;
    }

    if (record.count >= this.maxPerMinute) return false;
    record.count++;
    return true;
  }
}

export const rateLimiter = new ErrorRateLimiter();
```

## Complete Application Setup

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { EnhancedErrorBoundary } from './components/ErrorBoundary';
import { SessionProvider } from './providers/SessionProvider';
import Routes from './Routes';

function App() {
  return (
    <EnhancedErrorBoundary boundaryName="root">
      <SessionProvider>
        <BrowserRouter>
          <EnhancedErrorBoundary boundaryName="routes">
            <Routes />
          </EnhancedErrorBoundary>
        </BrowserRouter>
      </SessionProvider>
    </EnhancedErrorBoundary>
  );
}

export default App;
```

## Summary

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Error Boundaries** | `TracedErrorBoundary` component | Catch and trace React component errors |
| **Global Handlers** | `window.onerror`, `unhandledrejection` | Capture uncaught errors and promise rejections |
| **User Interactions** | `useTracedCallback` hook | Track clicks and user actions as spans |
| **API Errors** | `tracedFetch` wrapper | Capture HTTP errors with full context |
| **Navigation** | `useNavigationTracing` hook | Track route changes and render times |
| **Session Context** | `SessionProvider` | Enrich traces with user/session data |
| **Rate Limiting** | `ErrorRateLimiter` class | Prevent overwhelming backend with errors |
| **Production Config** | Sampling, batching | Optimize for production workloads |

OpenTelemetry provides a comprehensive framework for tracking errors in React applications. By combining error boundaries with manual span recording and global error handlers, you capture the complete picture of what went wrong and why. The correlation between frontend errors and backend traces makes debugging distributed issues significantly easier, while the vendor-neutral approach ensures you can switch observability backends as your needs evolve.

For sending this telemetry data to OneUptime, configure your OTLP exporter to point to your OneUptime endpoint, and you will have full visibility into your React application's errors alongside your backend traces and metrics.
