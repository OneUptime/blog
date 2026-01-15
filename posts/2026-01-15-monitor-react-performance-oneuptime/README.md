# How to Monitor React Application Performance with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, OneUptime, Monitoring, Performance, Observability, Frontend

Description: Learn how to implement comprehensive performance monitoring for React applications using OneUptime, including Core Web Vitals tracking, custom metrics, error boundaries, and dashboard configuration.

---

Performance monitoring is no longer optional for React applications. Users expect sub-second load times, smooth interactions, and zero errors. When performance degrades, users leave. When errors occur, revenue drops. OneUptime provides the observability infrastructure you need to catch problems before users do.

This guide covers everything from basic setup to advanced monitoring patterns, including real user monitoring (RUM), Core Web Vitals tracking, error boundary integration, and dashboard configuration in OneUptime.

## Why Monitor React Applications?

React applications present unique monitoring challenges:

- **Client-side rendering** means performance depends on user devices and network conditions
- **Component re-renders** can silently degrade performance without backend changes
- **State management complexity** creates subtle bugs that only appear in production
- **Third-party dependencies** add unpredictable latency and failure modes
- **Single Page Application (SPA) navigation** breaks traditional page load metrics

Traditional server-side monitoring misses most of these issues. You need client-side observability to understand what users actually experience.

## Setting Up OpenTelemetry for React

OneUptime is OTLP-native, meaning it accepts telemetry data in the OpenTelemetry Protocol format. This gives you vendor-neutral instrumentation that works with any OTLP-compatible backend.

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/context-zone \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  web-vitals
```

### Basic Tracing Setup

Create a telemetry configuration file that initializes OpenTelemetry before your React app renders.

```typescript
// src/telemetry/tracing.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'react-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.REACT_APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
});

const exporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTLP_ENDPOINT || 'https://otlp.oneuptime.com/v1/traces',
  headers: {
    'x-oneuptime-token': process.env.REACT_APP_ONEUPTIME_TOKEN || '',
  },
});

const provider = new WebTracerProvider({
  resource,
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  maxExportBatchSize: 10,
  scheduledDelayMillis: 500,
  exportTimeoutMillis: 30000,
}));

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.yourdomain\.com\/.*/,
      ],
      clearTimingResources: true,
    }),
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.yourdomain\.com\/.*/,
      ],
    }),
  ],
});

export const tracer = provider.getTracer('react-frontend');
```

### Initialize Before React

Import the telemetry module at the top of your entry file:

```typescript
// src/index.tsx
import './telemetry/tracing'; // Must be first import

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

## Core Web Vitals Monitoring

Core Web Vitals are Google's metrics for user experience: Largest Contentful Paint (LCP), First Input Delay (FID), and Cumulative Layout Shift (CLS). These directly impact SEO and user satisfaction.

### Capturing Web Vitals

```typescript
// src/telemetry/webVitals.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP, Metric } from 'web-vitals';
import { tracer } from './tracing';
import { SpanStatusCode } from '@opentelemetry/api';

interface VitalThresholds {
  good: number;
  needsImprovement: number;
}

const thresholds: Record<string, VitalThresholds> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  LCP: { good: 2500, needsImprovement: 4000 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function sendVitalToOneUptime(metric: Metric): void {
  const span = tracer.startSpan(`web-vital-${metric.name.toLowerCase()}`, {
    attributes: {
      'web_vital.name': metric.name,
      'web_vital.value': metric.value,
      'web_vital.rating': metric.rating,
      'web_vital.delta': metric.delta,
      'web_vital.id': metric.id,
      'web_vital.navigation_type': metric.navigationType || 'navigate',
      'page.url': window.location.href,
      'page.path': window.location.pathname,
      'user_agent.browser': navigator.userAgent,
      'viewport.width': window.innerWidth,
      'viewport.height': window.innerHeight,
      'connection.effective_type': (navigator as any).connection?.effectiveType || 'unknown',
    },
  });

  const rating = getRating(metric.name, metric.value);

  if (rating === 'poor') {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Poor ${metric.name}: ${metric.value}`,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export function initWebVitalsMonitoring(): void {
  onCLS(sendVitalToOneUptime);
  onFID(sendVitalToOneUptime);
  onLCP(sendVitalToOneUptime);
  onFCP(sendVitalToOneUptime);
  onTTFB(sendVitalToOneUptime);
  onINP(sendVitalToOneUptime);
}
```

### Initialize Web Vitals

```typescript
// src/index.tsx
import './telemetry/tracing';
import { initWebVitalsMonitoring } from './telemetry/webVitals';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Start monitoring Web Vitals
initWebVitalsMonitoring();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Error Boundary Integration

React error boundaries catch JavaScript errors anywhere in the component tree. Integrating them with OneUptime ensures you capture every crash with full context.

### Creating a Monitored Error Boundary

```typescript
// src/components/MonitoredErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class MonitoredErrorBoundary extends Component<Props, State> {
  private tracer = trace.getTracer('react-error-boundary');

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const span = this.tracer.startSpan('react-error-boundary-catch', {
      attributes: {
        'error.type': error.name,
        'error.message': error.message,
        'error.stack': error.stack || '',
        'error.id': this.state.errorId || '',
        'error.component_stack': errorInfo.componentStack || '',
        'error.boundary_component': this.props.componentName || 'Unknown',
        'page.url': window.location.href,
        'page.path': window.location.pathname,
        'user_agent.browser': navigator.userAgent,
      },
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `React Error: ${error.message}`,
    });
    span.end();

    // Log additional context
    console.error('Error caught by MonitoredErrorBoundary:', {
      error,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback" role="alert">
          <h2>Something went wrong</h2>
          <p>We have been notified and are working on a fix.</p>
          <p>Error ID: {this.state.errorId}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Using Error Boundaries Throughout Your App

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MonitoredErrorBoundary } from './components/MonitoredErrorBoundary';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

function App() {
  return (
    <MonitoredErrorBoundary componentName="AppRoot">
      <BrowserRouter>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <MonitoredErrorBoundary componentName="Dashboard">
                <Dashboard />
              </MonitoredErrorBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <MonitoredErrorBoundary componentName="Settings">
                <Settings />
              </MonitoredErrorBoundary>
            }
          />
          <Route
            path="/profile"
            element={
              <MonitoredErrorBoundary componentName="Profile">
                <Profile />
              </MonitoredErrorBoundary>
            }
          />
        </Routes>
      </BrowserRouter>
    </MonitoredErrorBoundary>
  );
}

export default App;
```

## Component Performance Tracking

Track render times and re-render frequency for critical components.

### Performance Monitoring Hook

```typescript
// src/hooks/useComponentPerformance.ts
import { useEffect, useRef, useCallback } from 'react';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface PerformanceMetrics {
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
}

interface UseComponentPerformanceOptions {
  componentName: string;
  warnThresholdMs?: number;
  trackProps?: boolean;
}

export function useComponentPerformance(
  options: UseComponentPerformanceOptions
): PerformanceMetrics {
  const { componentName, warnThresholdMs = 16, trackProps = false } = options;
  const tracer = trace.getTracer('react-component-performance');

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  const renderStartRef = useRef<number>(performance.now());

  // Track render start
  renderStartRef.current = performance.now();

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartRef.current;

    metricsRef.current.renderCount += 1;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.lastRenderTime = renderTime;
    metricsRef.current.averageRenderTime =
      metricsRef.current.totalRenderTime / metricsRef.current.renderCount;

    const span = tracer.startSpan(`component-render-${componentName}`, {
      attributes: {
        'component.name': componentName,
        'component.render_time_ms': renderTime,
        'component.render_count': metricsRef.current.renderCount,
        'component.average_render_time_ms': metricsRef.current.averageRenderTime,
        'component.is_slow': renderTime > warnThresholdMs,
      },
    });

    if (renderTime > warnThresholdMs) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Slow render: ${renderTime.toFixed(2)}ms exceeds ${warnThresholdMs}ms threshold`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
  });

  return metricsRef.current;
}
```

### Using the Performance Hook

```typescript
// src/components/ProductList.tsx
import React, { useState, useEffect } from 'react';
import { useComponentPerformance } from '../hooks/useComponentPerformance';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ProductListProps {
  categoryId: string;
}

export function ProductList({ categoryId }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Track this component's performance
  const metrics = useComponentPerformance({
    componentName: 'ProductList',
    warnThresholdMs: 50, // Warn if render takes > 50ms
  });

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?category=${categoryId}`);
        const data = await response.json();
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [categoryId]);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="product-list">
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <h3>{product.name}</h3>
          <p>${product.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

## User Interaction Tracking

Track how users interact with your application to identify UX problems.

### Creating a User Interaction Tracker

```typescript
// src/telemetry/userInteractions.ts
import { trace, SpanStatusCode, context, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('user-interactions');

interface InteractionOptions {
  interactionType: 'click' | 'submit' | 'navigation' | 'scroll' | 'input';
  targetElement?: string;
  additionalAttributes?: Record<string, string | number | boolean>;
}

export function trackInteraction(
  name: string,
  options: InteractionOptions
): Span {
  const span = tracer.startSpan(`user-interaction-${name}`, {
    attributes: {
      'interaction.name': name,
      'interaction.type': options.interactionType,
      'interaction.target': options.targetElement || 'unknown',
      'page.url': window.location.href,
      'page.path': window.location.pathname,
      'timestamp': Date.now(),
      ...options.additionalAttributes,
    },
  });

  return span;
}

export function withInteractionTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  options: Omit<InteractionOptions, 'additionalAttributes'>
): T {
  return ((...args: Parameters<T>) => {
    const span = trackInteraction(name, options);

    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result
          .then((value) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return value;
          })
          .catch((error) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.end();
            throw error;
          });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.end();
      throw error;
    }
  }) as T;
}
```

### Click Tracking Hook

```typescript
// src/hooks/useTrackedClick.ts
import { useCallback } from 'react';
import { trackInteraction } from '../telemetry/userInteractions';
import { SpanStatusCode } from '@opentelemetry/api';

interface UseTrackedClickOptions {
  actionName: string;
  elementType?: string;
  additionalData?: Record<string, string | number | boolean>;
}

export function useTrackedClick<T extends (...args: any[]) => any>(
  handler: T,
  options: UseTrackedClickOptions
): T {
  const { actionName, elementType = 'button', additionalData = {} } = options;

  return useCallback(
    ((...args: Parameters<T>) => {
      const span = trackInteraction(actionName, {
        interactionType: 'click',
        targetElement: elementType,
        additionalAttributes: additionalData,
      });

      try {
        const result = handler(...args);

        if (result instanceof Promise) {
          return result
            .then((value) => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return value;
            })
            .catch((error) => {
              span.recordException(error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
              span.end();
              throw error;
            });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.end();
        throw error;
      }
    }) as T,
    [handler, actionName, elementType, additionalData]
  );
}
```

### Using Tracked Clicks

```typescript
// src/components/CheckoutButton.tsx
import React from 'react';
import { useTrackedClick } from '../hooks/useTrackedClick';

interface CheckoutButtonProps {
  cartId: string;
  totalAmount: number;
  onCheckout: () => Promise<void>;
}

export function CheckoutButton({ cartId, totalAmount, onCheckout }: CheckoutButtonProps) {
  const handleCheckout = useTrackedClick(onCheckout, {
    actionName: 'checkout-initiated',
    elementType: 'checkout-button',
    additionalData: {
      cartId,
      totalAmount,
      itemCount: 5, // Example
    },
  });

  return (
    <button
      onClick={handleCheckout}
      className="checkout-button"
    >
      Proceed to Checkout (${totalAmount.toFixed(2)})
    </button>
  );
}
```

## API Call Performance Monitoring

Track all API calls with latency, status codes, and error details.

### Creating an Instrumented Fetch Wrapper

```typescript
// src/api/instrumentedFetch.ts
import { trace, SpanStatusCode, propagation, context } from '@opentelemetry/api';

const tracer = trace.getTracer('api-client');

interface FetchOptions extends RequestInit {
  timeout?: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  duration: number;
}

export async function instrumentedFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, ...fetchOptions } = options;
  const parsedUrl = new URL(url, window.location.origin);

  const span = tracer.startSpan(`HTTP ${fetchOptions.method || 'GET'} ${parsedUrl.pathname}`, {
    attributes: {
      'http.method': fetchOptions.method || 'GET',
      'http.url': url,
      'http.host': parsedUrl.host,
      'http.path': parsedUrl.pathname,
      'http.query': parsedUrl.search,
    },
  });

  // Inject trace context into headers
  const headers = new Headers(fetchOptions.headers);
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => carrier.set(key, value),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;

    span.setAttributes({
      'http.status_code': response.status,
      'http.response_content_length': response.headers.get('content-length') || 0,
      'http.duration_ms': duration,
    });

    if (!response.ok) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}: ${response.statusText}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    const data = await response.json();

    span.end();

    return {
      data,
      status: response.status,
      headers: response.headers,
      duration,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;

    span.setAttributes({
      'http.duration_ms': duration,
      'error.type': error.name,
      'error.message': error.message,
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.end();

    throw error;
  }
}
```

### Creating an API Client

```typescript
// src/api/client.ts
import { instrumentedFetch } from './instrumentedFetch';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return instrumentedFetch<T>(url.toString(), { method: 'GET' });
  },

  async post<T>(endpoint: string, body: any) {
    return instrumentedFetch<T>(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async put<T>(endpoint: string, body: any) {
    return instrumentedFetch<T>(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async delete<T>(endpoint: string) {
    return instrumentedFetch<T>(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
  },
};
```

## Navigation Performance Tracking

Track SPA navigation to understand page transition performance.

### Navigation Tracker

```typescript
// src/telemetry/navigationTracker.ts
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const tracer = trace.getTracer('react-navigation');

let activeNavigationSpan: Span | null = null;

export function startNavigationSpan(from: string, to: string): Span {
  // End any existing navigation span
  if (activeNavigationSpan) {
    activeNavigationSpan.end();
  }

  const span = tracer.startSpan('page-navigation', {
    attributes: {
      'navigation.from': from,
      'navigation.to': to,
      'navigation.type': 'spa',
      'navigation.timestamp': Date.now(),
    },
  });

  activeNavigationSpan = span;
  return span;
}

export function endNavigationSpan(success: boolean = true): void {
  if (activeNavigationSpan) {
    activeNavigationSpan.setStatus({
      code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    });
    activeNavigationSpan.end();
    activeNavigationSpan = null;
  }
}

export function useNavigationTracking(): void {
  const location = useLocation();
  const previousPathRef = useRef<string>(location.pathname);
  const navigationStartRef = useRef<number>(performance.now());

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    if (currentPath !== previousPath) {
      const navigationDuration = performance.now() - navigationStartRef.current;

      const span = tracer.startSpan('page-navigation-complete', {
        attributes: {
          'navigation.from': previousPath,
          'navigation.to': currentPath,
          'navigation.duration_ms': navigationDuration,
          'navigation.search': location.search,
          'navigation.hash': location.hash,
          'navigation.type': 'spa',
        },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      previousPathRef.current = currentPath;
      navigationStartRef.current = performance.now();
    }
  }, [location]);
}
```

### Using Navigation Tracking

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useNavigationTracking } from './telemetry/navigationTracker';
import { MonitoredErrorBoundary } from './components/MonitoredErrorBoundary';

function NavigationTracker() {
  useNavigationTracking();
  return null;
}

function App() {
  return (
    <MonitoredErrorBoundary componentName="AppRoot">
      <BrowserRouter>
        <NavigationTracker />
        <Routes>
          {/* Your routes */}
        </Routes>
      </BrowserRouter>
    </MonitoredErrorBoundary>
  );
}

export default App;
```

## Setting Up OneUptime Dashboard

Once telemetry is flowing, configure OneUptime to visualize and alert on your React application's performance.

### Creating a Service in OneUptime

1. Navigate to your OneUptime project
2. Go to **Telemetry** > **Services**
3. Click **Create Service**
4. Name it "React Frontend" and add a description
5. Note the service token for your environment configuration

### Configuring Environment Variables

```bash
# .env.production
REACT_APP_OTLP_ENDPOINT=https://otlp.oneuptime.com/v1/traces
REACT_APP_ONEUPTIME_TOKEN=your-service-token-here
REACT_APP_VERSION=1.0.0
```

### Creating Performance Dashboards

In OneUptime, create custom dashboards for your React application:

**Core Web Vitals Dashboard:**

1. Navigate to **Dashboards** > **Create Dashboard**
2. Add widgets for:
   - LCP distribution chart
   - FID/INP percentile graph
   - CLS trend line
   - Web Vitals by page path

**Error Tracking Dashboard:**

1. Create a dashboard for error monitoring
2. Add widgets for:
   - Error count by type
   - Error trend over time
   - Top error-producing components
   - Error details table

**API Performance Dashboard:**

1. Track API call performance
2. Add widgets for:
   - API latency percentiles
   - Error rate by endpoint
   - Slowest endpoints
   - Request volume over time

### Setting Up Alerts

Configure alerts for critical performance thresholds:

**Poor Core Web Vitals Alert:**

1. Go to **Monitors** > **Create Monitor**
2. Select **Custom Monitor** type
3. Configure threshold: LCP > 4000ms or CLS > 0.25
4. Set severity and notification channels

**High Error Rate Alert:**

1. Create monitor for error boundary triggers
2. Threshold: > 5 errors per minute
3. Configure escalation policy

**Slow API Response Alert:**

1. Monitor API latency
2. Threshold: p95 > 3000ms
3. Alert appropriate teams

## Advanced Monitoring Patterns

### Memory Leak Detection

```typescript
// src/telemetry/memoryMonitor.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('memory-monitor');

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

function getMemoryMetrics(): MemoryMetrics | null {
  const performance = window.performance as any;

  if (!performance.memory) {
    return null;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    usagePercentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
  };
}

export function startMemoryMonitoring(intervalMs: number = 30000): () => void {
  const intervalId = setInterval(() => {
    const metrics = getMemoryMetrics();

    if (!metrics) return;

    const span = tracer.startSpan('memory-usage-report', {
      attributes: {
        'memory.used_heap_size_mb': Math.round(metrics.usedJSHeapSize / 1024 / 1024),
        'memory.total_heap_size_mb': Math.round(metrics.totalJSHeapSize / 1024 / 1024),
        'memory.heap_limit_mb': Math.round(metrics.jsHeapSizeLimit / 1024 / 1024),
        'memory.usage_percentage': Math.round(metrics.usagePercentage * 100) / 100,
        'page.url': window.location.href,
      },
    });

    if (metrics.usagePercentage > 80) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `High memory usage: ${metrics.usagePercentage.toFixed(1)}%`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
  }, intervalMs);

  return () => clearInterval(intervalId);
}
```

### Long Task Detection

```typescript
// src/telemetry/longTaskMonitor.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('long-task-monitor');

export function startLongTaskMonitoring(): () => void {
  if (!('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver not supported');
    return () => {};
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const span = tracer.startSpan('long-task-detected', {
        attributes: {
          'long_task.duration_ms': entry.duration,
          'long_task.start_time': entry.startTime,
          'long_task.name': entry.name,
          'long_task.entry_type': entry.entryType,
          'page.url': window.location.href,
          'page.path': window.location.pathname,
        },
      });

      if (entry.duration > 100) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
        });
      }

      span.end();
    }
  });

  observer.observe({ entryTypes: ['longtask'] });

  return () => observer.disconnect();
}
```

### Resource Loading Performance

```typescript
// src/telemetry/resourceMonitor.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('resource-monitor');

interface ResourceTiming {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  decodedBodySize: number;
}

export function trackResourceLoading(): void {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
      // Skip tracking for telemetry endpoints to avoid recursion
      if (entry.name.includes('oneuptime.com') || entry.name.includes('otlp')) {
        continue;
      }

      // Only track slow resources (> 500ms)
      if (entry.duration < 500) {
        continue;
      }

      const span = tracer.startSpan('slow-resource-load', {
        attributes: {
          'resource.name': entry.name,
          'resource.initiator_type': entry.initiatorType,
          'resource.duration_ms': entry.duration,
          'resource.transfer_size_kb': Math.round(entry.transferSize / 1024),
          'resource.decoded_size_kb': Math.round(entry.decodedBodySize / 1024),
          'resource.dns_time_ms': entry.domainLookupEnd - entry.domainLookupStart,
          'resource.connect_time_ms': entry.connectEnd - entry.connectStart,
          'resource.ttfb_ms': entry.responseStart - entry.requestStart,
          'page.url': window.location.href,
        },
      });

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Slow resource: ${entry.duration.toFixed(0)}ms`,
      });
      span.end();
    }
  });

  observer.observe({ entryTypes: ['resource'] });
}
```

## Initializing All Monitoring

Create a single initialization point for all monitoring features:

```typescript
// src/telemetry/index.ts
import './tracing';
import { initWebVitalsMonitoring } from './webVitals';
import { startMemoryMonitoring } from './memoryMonitor';
import { startLongTaskMonitoring } from './longTaskMonitor';
import { trackResourceLoading } from './resourceMonitor';

let cleanupFunctions: Array<() => void> = [];

export function initializeMonitoring(): void {
  // Core Web Vitals
  initWebVitalsMonitoring();

  // Memory monitoring (every 30 seconds)
  cleanupFunctions.push(startMemoryMonitoring(30000));

  // Long task detection
  cleanupFunctions.push(startLongTaskMonitoring());

  // Resource loading tracking
  trackResourceLoading();

  console.log('OneUptime monitoring initialized');
}

export function cleanupMonitoring(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
}

// Auto-cleanup on page unload
window.addEventListener('beforeunload', cleanupMonitoring);
```

### Final Entry Point

```typescript
// src/index.tsx
import { initializeMonitoring } from './telemetry';

// Initialize all monitoring before React renders
initializeMonitoring();

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

## Summary

| Monitoring Area | Implementation | OneUptime Feature |
|-----------------|----------------|-------------------|
| **Core Web Vitals** | web-vitals library + custom spans | Traces dashboard, custom metrics |
| **JavaScript Errors** | Error boundaries with OpenTelemetry | Error tracking, alerting |
| **Component Performance** | useComponentPerformance hook | Performance dashboards |
| **User Interactions** | Click/submit tracking hooks | User journey analysis |
| **API Calls** | Instrumented fetch wrapper | Latency monitoring, error rates |
| **SPA Navigation** | Router integration with spans | Navigation performance |
| **Memory Usage** | Performance.memory API | Memory leak alerts |
| **Long Tasks** | PerformanceObserver API | Main thread blocking alerts |
| **Resource Loading** | Resource timing API | Slow asset detection |
| **Trace Context** | OpenTelemetry propagation | End-to-end request tracing |

## Best Practices

1. **Sample in production** - Not every user session needs full tracing. Use sampling to balance visibility with overhead.

2. **Set meaningful thresholds** - Core Web Vitals have standard thresholds. Use them for alerts.

3. **Track business metrics** - Beyond technical metrics, track conversions, cart additions, and user flows.

4. **Correlate frontend and backend** - Propagate trace context to your APIs for end-to-end visibility.

5. **Monitor third-party scripts** - Analytics, ads, and widgets often cause performance problems.

6. **Use error boundaries strategically** - Place them at route boundaries and around third-party components.

7. **Review dashboards weekly** - Performance trends reveal problems before they become incidents.

## Conclusion

Monitoring React applications requires client-side observability that traditional server monitoring cannot provide. With OpenTelemetry instrumentation and OneUptime as your observability platform, you get vendor-neutral telemetry, comprehensive dashboards, and actionable alerts.

Start with Core Web Vitals and error boundaries. Add component performance tracking for critical paths. Layer in API monitoring and user interaction tracking as your monitoring maturity grows.

The investment in frontend observability pays dividends in faster debugging, proactive performance optimization, and ultimately happier users.

---

**Related Reading:**

- [Logs, Metrics and Traces: Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Instrument Express.js with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view)
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
