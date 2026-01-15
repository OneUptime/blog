# How to Implement Custom Metrics for React Performance Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Metrics, Performance, Monitoring, OpenTelemetry, Observability

Description: Learn how to implement custom metrics in React applications to monitor component render times, user interactions, and business KPIs using OpenTelemetry.

---

Performance monitoring in React applications goes far beyond tracking page load times. Modern React apps are complex, with nested components, state management, and asynchronous data fetching. To truly understand how your application performs, you need custom metrics that capture what matters to your users and business.

This guide covers implementing custom metrics in React applications using OpenTelemetry, from basic setup through advanced patterns for measuring renders, interactions, and business events.

For foundational concepts, see our guides on [the three pillars of observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view) and [traces and spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view).

## Why Custom Metrics Matter for React

Standard web vitals like LCP, FID, and CLS provide a baseline, but they do not capture:

- How long specific components take to render
- Which user flows are slow or broken
- Business metrics like conversion rates or feature adoption
- State management performance
- API call latency from the user's perspective

Custom metrics fill these gaps, giving you visibility into the real user experience.

## Setting Up OpenTelemetry in React

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/sdk-metrics \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/context-zone \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request
```

### Basic OpenTelemetry Configuration

Create a telemetry setup file that initializes both tracing and metrics:

```typescript
// src/telemetry/setup.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'react-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.REACT_APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTEL_ENDPOINT + '/v1/traces',
});

// Configure metric exporter
const metricExporter = new OTLPMetricExporter({
  url: process.env.REACT_APP_OTEL_ENDPOINT + '/v1/metrics',
});

// Set up tracing
const tracerProvider = new WebTracerProvider({
  resource,
});

tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
tracerProvider.register({
  contextManager: new ZoneContextManager(),
});

// Set up metrics
const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000, // Export every 30 seconds
    }),
  ],
});

// Register auto-instrumentations
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/.*/],
    }),
    new DocumentLoadInstrumentation(),
  ],
});

export { tracerProvider, meterProvider };
```

### Initialize in Your App Entry Point

```typescript
// src/index.tsx
import './telemetry/setup';
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

## Types of Custom Metrics

Before implementing metrics, understand the four main types available in OpenTelemetry:

### Counter

A monotonically increasing value. Use for counting events like page views, button clicks, or errors.

```typescript
const pageViewCounter = meter.createCounter('page_views_total', {
  description: 'Total number of page views',
});

pageViewCounter.add(1, { page: '/dashboard', user_type: 'premium' });
```

### UpDownCounter

A value that can increase or decrease. Use for tracking quantities like active users, open connections, or items in a cart.

```typescript
const activeUsers = meter.createUpDownCounter('active_users', {
  description: 'Number of currently active users',
});

activeUsers.add(1);  // User logged in
activeUsers.add(-1); // User logged out
```

### Histogram

Records distributions of values. Use for latency measurements, response sizes, or any value where you want percentiles.

```typescript
const renderDuration = meter.createHistogram('component_render_duration_ms', {
  description: 'Component render duration in milliseconds',
  unit: 'ms',
});

renderDuration.record(45.2, { component: 'Dashboard' });
```

### Observable Gauge

Captures point-in-time measurements via callbacks. Use for memory usage, CPU load, or any value you sample periodically.

```typescript
meter.createObservableGauge('memory_usage_bytes', {
  description: 'Current memory usage in bytes',
}, (observableResult) => {
  const memory = performance.memory?.usedJSHeapSize || 0;
  observableResult.observe(memory);
});
```

## Creating a Metrics Service

Create a centralized service for managing metrics:

```typescript
// src/telemetry/metrics.ts
import { metrics, Meter, Counter, Histogram, UpDownCounter } from '@opentelemetry/api';

class MetricsService {
  private meter: Meter;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private upDownCounters: Map<string, UpDownCounter> = new Map();

  constructor() {
    this.meter = metrics.getMeter('react-frontend-metrics');
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Component performance metrics
    this.histograms.set('render_duration', this.meter.createHistogram('component_render_duration_ms', {
      description: 'Time taken to render a component',
      unit: 'ms',
    }));

    this.histograms.set('interaction_duration', this.meter.createHistogram('user_interaction_duration_ms', {
      description: 'Time from user interaction to response',
      unit: 'ms',
    }));

    // User engagement metrics
    this.counters.set('page_views', this.meter.createCounter('page_views_total', {
      description: 'Total page views',
    }));

    this.counters.set('button_clicks', this.meter.createCounter('button_clicks_total', {
      description: 'Total button clicks',
    }));

    this.counters.set('errors', this.meter.createCounter('frontend_errors_total', {
      description: 'Total frontend errors',
    }));

    // Business metrics
    this.counters.set('feature_usage', this.meter.createCounter('feature_usage_total', {
      description: 'Feature usage count',
    }));

    this.histograms.set('api_latency', this.meter.createHistogram('api_request_duration_ms', {
      description: 'API request duration from client perspective',
      unit: 'ms',
    }));

    // State metrics
    this.upDownCounters.set('active_modals', this.meter.createUpDownCounter('active_modals', {
      description: 'Number of currently open modals',
    }));

    this.upDownCounters.set('pending_requests', this.meter.createUpDownCounter('pending_requests', {
      description: 'Number of pending API requests',
    }));
  }

  recordRenderDuration(component: string, duration: number, attributes: Record<string, string> = {}): void {
    this.histograms.get('render_duration')?.record(duration, {
      component,
      ...attributes,
    });
  }

  recordInteractionDuration(interaction: string, duration: number, attributes: Record<string, string> = {}): void {
    this.histograms.get('interaction_duration')?.record(duration, {
      interaction,
      ...attributes,
    });
  }

  recordPageView(page: string, attributes: Record<string, string> = {}): void {
    this.counters.get('page_views')?.add(1, {
      page,
      ...attributes,
    });
  }

  recordButtonClick(button: string, attributes: Record<string, string> = {}): void {
    this.counters.get('button_clicks')?.add(1, {
      button,
      ...attributes,
    });
  }

  recordError(errorType: string, component: string, attributes: Record<string, string> = {}): void {
    this.counters.get('errors')?.add(1, {
      error_type: errorType,
      component,
      ...attributes,
    });
  }

  recordFeatureUsage(feature: string, attributes: Record<string, string> = {}): void {
    this.counters.get('feature_usage')?.add(1, {
      feature,
      ...attributes,
    });
  }

  recordApiLatency(endpoint: string, duration: number, status: number): void {
    this.histograms.get('api_latency')?.record(duration, {
      endpoint,
      status: status.toString(),
      success: (status >= 200 && status < 300).toString(),
    });
  }

  incrementPendingRequests(): void {
    this.upDownCounters.get('pending_requests')?.add(1);
  }

  decrementPendingRequests(): void {
    this.upDownCounters.get('pending_requests')?.add(-1);
  }

  openModal(modalName: string): void {
    this.upDownCounters.get('active_modals')?.add(1, { modal: modalName });
  }

  closeModal(modalName: string): void {
    this.upDownCounters.get('active_modals')?.add(-1, { modal: modalName });
  }
}

export const metricsService = new MetricsService();
```

## Measuring Component Render Performance

### Using React Profiler API

React's Profiler API provides render timing information:

```typescript
// src/components/ProfiledComponent.tsx
import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { metricsService } from '../telemetry/metrics';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  metricsService.recordRenderDuration(id, actualDuration, {
    phase,
    base_duration: baseDuration.toString(),
  });

  // Log slow renders for debugging
  if (actualDuration > 16) { // Slower than 60fps
    console.warn(`Slow render detected: ${id} took ${actualDuration.toFixed(2)}ms`);
  }
};

interface ProfiledProps {
  id: string;
  children: React.ReactNode;
}

export const Profiled: React.FC<ProfiledProps> = ({ id, children }) => {
  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};
```

### Using the Profiled Wrapper

```typescript
// src/pages/Dashboard.tsx
import React from 'react';
import { Profiled } from '../components/ProfiledComponent';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardCharts } from '../components/DashboardCharts';
import { DashboardTable } from '../components/DashboardTable';

export const Dashboard: React.FC = () => {
  return (
    <Profiled id="Dashboard">
      <div className="dashboard">
        <Profiled id="DashboardHeader">
          <DashboardHeader />
        </Profiled>

        <Profiled id="DashboardCharts">
          <DashboardCharts />
        </Profiled>

        <Profiled id="DashboardTable">
          <DashboardTable />
        </Profiled>
      </div>
    </Profiled>
  );
};
```

### Custom Hook for Render Timing

For more granular control, create a custom hook:

```typescript
// src/hooks/useRenderMetrics.ts
import { useEffect, useRef } from 'react';
import { metricsService } from '../telemetry/metrics';

export function useRenderMetrics(componentName: string, attributes: Record<string, string> = {}) {
  const renderStartTime = useRef<number>(performance.now());
  const mountedRef = useRef<boolean>(false);

  // Record initial render time
  useEffect(() => {
    const renderDuration = performance.now() - renderStartTime.current;

    metricsService.recordRenderDuration(componentName, renderDuration, {
      render_type: mountedRef.current ? 'update' : 'mount',
      ...attributes,
    });

    mountedRef.current = true;
  });

  // Reset timer on each render
  renderStartTime.current = performance.now();

  return {
    recordCustomMetric: (name: string, value: number, customAttributes: Record<string, string> = {}) => {
      metricsService.recordRenderDuration(`${componentName}.${name}`, value, {
        ...attributes,
        ...customAttributes,
      });
    },
  };
}
```

### Usage

```typescript
// src/components/UserList.tsx
import React from 'react';
import { useRenderMetrics } from '../hooks/useRenderMetrics';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserListProps {
  users: User[];
}

export const UserList: React.FC<UserListProps> = ({ users }) => {
  const { recordCustomMetric } = useRenderMetrics('UserList', {
    user_count: users.length.toString(),
  });

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

## Measuring User Interactions

### Interaction Timing Hook

```typescript
// src/hooks/useInteractionMetrics.ts
import { useCallback, useRef } from 'react';
import { metricsService } from '../telemetry/metrics';

export function useInteractionMetrics(interactionName: string) {
  const startTimeRef = useRef<number | null>(null);

  const startInteraction = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endInteraction = useCallback((attributes: Record<string, string> = {}) => {
    if (startTimeRef.current !== null) {
      const duration = performance.now() - startTimeRef.current;
      metricsService.recordInteractionDuration(interactionName, duration, attributes);
      startTimeRef.current = null;
      return duration;
    }
    return null;
  }, [interactionName]);

  const recordInteraction = useCallback((
    action: () => void | Promise<void>,
    attributes: Record<string, string> = {}
  ) => {
    return async () => {
      startInteraction();
      try {
        await action();
      } finally {
        endInteraction(attributes);
      }
    };
  }, [startInteraction, endInteraction]);

  return {
    startInteraction,
    endInteraction,
    recordInteraction,
  };
}
```

### Form Submission Metrics

```typescript
// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { useInteractionMetrics } from '../hooks/useInteractionMetrics';
import { metricsService } from '../telemetry/metrics';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { startInteraction, endInteraction } = useInteractionMetrics('login_form_submit');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startInteraction();
    setIsLoading(true);
    metricsService.incrementPendingRequests();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const duration = endInteraction({
        success: response.ok.toString(),
        status: response.status.toString(),
      });

      if (response.ok) {
        metricsService.recordFeatureUsage('login', { method: 'email' });
      } else {
        metricsService.recordError('login_failed', 'LoginForm', {
          status: response.status.toString(),
        });
      }
    } catch (error) {
      endInteraction({ success: 'false', error: 'network' });
      metricsService.recordError('network_error', 'LoginForm');
    } finally {
      setIsLoading(false);
      metricsService.decrementPendingRequests();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Click Tracking Higher-Order Component

```typescript
// src/components/TrackedButton.tsx
import React from 'react';
import { metricsService } from '../telemetry/metrics';

interface TrackedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  trackingId: string;
  trackingAttributes?: Record<string, string>;
}

export const TrackedButton: React.FC<TrackedButtonProps> = ({
  trackingId,
  trackingAttributes = {},
  onClick,
  children,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    metricsService.recordButtonClick(trackingId, trackingAttributes);
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
```

## Measuring API Performance from the Client

### Custom Fetch Wrapper with Metrics

```typescript
// src/utils/trackedFetch.ts
import { metricsService } from '../telemetry/metrics';
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';

const tracer = trace.getTracer('react-frontend');

interface FetchOptions extends RequestInit {
  skipMetrics?: boolean;
}

export async function trackedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipMetrics = false, ...fetchOptions } = options;
  const startTime = performance.now();
  const urlObj = new URL(url, window.location.origin);
  const endpoint = urlObj.pathname;

  // Create a span for this request
  return tracer.startActiveSpan(`HTTP ${options.method || 'GET'} ${endpoint}`, async (span) => {
    // Inject trace context into headers
    const headers = new Headers(fetchOptions.headers);
    propagation.inject(context.active(), headers, {
      set: (carrier, key, value) => carrier.set(key, value),
    });

    metricsService.incrementPendingRequests();

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const duration = performance.now() - startTime;

      if (!skipMetrics) {
        metricsService.recordApiLatency(endpoint, duration, response.status);
      }

      span.setAttributes({
        'http.status_code': response.status,
        'http.url': url,
        'http.method': options.method || 'GET',
      });

      if (!response.ok) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      if (!skipMetrics) {
        metricsService.recordApiLatency(endpoint, duration, 0);
      }

      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });

      throw error;
    } finally {
      metricsService.decrementPendingRequests();
      span.end();
    }
  });
}
```

### React Query Integration

If using React Query, add metrics to the query client:

```typescript
// src/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { metricsService } from './telemetry/metrics';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      metricsService.recordError('query_error', 'ReactQuery', {
        query_key: JSON.stringify(query.queryKey),
        error_message: (error as Error).message,
      });
    },
    onSuccess: (data, query) => {
      metricsService.recordFeatureUsage('query_success', {
        query_key: query.queryKey[0] as string,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      metricsService.recordError('mutation_error', 'ReactQuery', {
        mutation_key: JSON.stringify(mutation.options.mutationKey),
        error_message: (error as Error).message,
      });
    },
    onSuccess: (data, variables, context, mutation) => {
      metricsService.recordFeatureUsage('mutation_success', {
        mutation_key: mutation.options.mutationKey?.[0] as string || 'unknown',
      });
    },
  }),
});
```

## Page View and Navigation Metrics

### Router Integration

```typescript
// src/hooks/usePageViewMetrics.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metricsService } from '../telemetry/metrics';

export function usePageViewMetrics() {
  const location = useLocation();

  useEffect(() => {
    const pageLoadTime = performance.now();

    metricsService.recordPageView(location.pathname, {
      search: location.search,
      referrer: document.referrer,
    });

    // Record time spent on previous page
    return () => {
      const timeOnPage = performance.now() - pageLoadTime;
      metricsService.recordInteractionDuration('time_on_page', timeOnPage, {
        page: location.pathname,
      });
    };
  }, [location.pathname, location.search]);
}
```

### App-Level Integration

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { usePageViewMetrics } from './hooks/usePageViewMetrics';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';

const PageViewTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePageViewMetrics();
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PageViewTracker>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </PageViewTracker>
    </BrowserRouter>
  );
};
```

## Error Boundary Metrics

```typescript
// src/components/MetricErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { metricsService } from '../telemetry/metrics';
import { trace } from '@opentelemetry/api';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MetricErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName } = this.props;

    // Record error metrics
    metricsService.recordError('react_error_boundary', componentName, {
      error_name: error.name,
      error_message: error.message,
      component_stack: errorInfo.componentStack || 'unknown',
    });

    // Also record to active span if available
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setAttributes({
        'error.boundary': componentName,
        'error.component_stack': errorInfo.componentStack || 'unknown',
      });
    }

    // Log for debugging
    console.error(`Error in ${componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>Please try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Business Metrics

Track metrics that matter to your business:

```typescript
// src/telemetry/businessMetrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('business-metrics');

// E-commerce metrics
const cartAdditions = meter.createCounter('cart_additions_total', {
  description: 'Items added to cart',
});

const cartRemovals = meter.createCounter('cart_removals_total', {
  description: 'Items removed from cart',
});

const checkoutStarts = meter.createCounter('checkout_starts_total', {
  description: 'Checkout processes started',
});

const checkoutCompletions = meter.createCounter('checkout_completions_total', {
  description: 'Checkout processes completed',
});

const orderValue = meter.createHistogram('order_value_usd', {
  description: 'Order value in USD',
  unit: 'usd',
});

// Feature engagement
const featureInteractions = meter.createCounter('feature_interactions_total', {
  description: 'User interactions with features',
});

const searchQueries = meter.createCounter('search_queries_total', {
  description: 'Search queries performed',
});

const searchResultClicks = meter.createCounter('search_result_clicks_total', {
  description: 'Clicks on search results',
});

export const businessMetrics = {
  addToCart(productId: string, quantity: number, price: number) {
    cartAdditions.add(quantity, {
      product_id: productId,
      price_range: getPriceRange(price),
    });
  },

  removeFromCart(productId: string, quantity: number) {
    cartRemovals.add(quantity, { product_id: productId });
  },

  startCheckout(cartValue: number, itemCount: number) {
    checkoutStarts.add(1, {
      value_range: getValueRange(cartValue),
      item_count_range: getItemCountRange(itemCount),
    });
  },

  completeCheckout(orderId: string, value: number, paymentMethod: string) {
    checkoutCompletions.add(1, { payment_method: paymentMethod });
    orderValue.record(value, { payment_method: paymentMethod });
  },

  trackFeatureInteraction(feature: string, action: string) {
    featureInteractions.add(1, { feature, action });
  },

  trackSearch(query: string, resultsCount: number) {
    searchQueries.add(1, {
      has_results: (resultsCount > 0).toString(),
      results_range: getResultsRange(resultsCount),
    });
  },

  trackSearchResultClick(query: string, position: number, resultId: string) {
    searchResultClicks.add(1, {
      position_range: getPositionRange(position),
    });
  },
};

// Helper functions to bucket values (avoids high cardinality)
function getPriceRange(price: number): string {
  if (price < 10) return 'under_10';
  if (price < 50) return '10_to_50';
  if (price < 100) return '50_to_100';
  if (price < 500) return '100_to_500';
  return 'over_500';
}

function getValueRange(value: number): string {
  if (value < 50) return 'under_50';
  if (value < 100) return '50_to_100';
  if (value < 250) return '100_to_250';
  if (value < 500) return '250_to_500';
  return 'over_500';
}

function getItemCountRange(count: number): string {
  if (count === 1) return '1';
  if (count <= 3) return '2_to_3';
  if (count <= 5) return '4_to_5';
  return 'over_5';
}

function getResultsRange(count: number): string {
  if (count === 0) return 'none';
  if (count <= 5) return '1_to_5';
  if (count <= 20) return '6_to_20';
  return 'over_20';
}

function getPositionRange(position: number): string {
  if (position <= 3) return 'top_3';
  if (position <= 10) return 'top_10';
  return 'below_10';
}
```

## Web Vitals Integration

Capture Core Web Vitals alongside custom metrics:

```typescript
// src/telemetry/webVitals.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('web-vitals');

const clsHistogram = meter.createHistogram('web_vital_cls', {
  description: 'Cumulative Layout Shift',
});

const fidHistogram = meter.createHistogram('web_vital_fid_ms', {
  description: 'First Input Delay in milliseconds',
  unit: 'ms',
});

const lcpHistogram = meter.createHistogram('web_vital_lcp_ms', {
  description: 'Largest Contentful Paint in milliseconds',
  unit: 'ms',
});

const fcpHistogram = meter.createHistogram('web_vital_fcp_ms', {
  description: 'First Contentful Paint in milliseconds',
  unit: 'ms',
});

const ttfbHistogram = meter.createHistogram('web_vital_ttfb_ms', {
  description: 'Time to First Byte in milliseconds',
  unit: 'ms',
});

const inpHistogram = meter.createHistogram('web_vital_inp_ms', {
  description: 'Interaction to Next Paint in milliseconds',
  unit: 'ms',
});

export function initWebVitals() {
  const page = window.location.pathname;

  onCLS((metric) => {
    clsHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });

  onFID((metric) => {
    fidHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });

  onLCP((metric) => {
    lcpHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });

  onFCP((metric) => {
    fcpHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });

  onTTFB((metric) => {
    ttfbHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });

  onINP((metric) => {
    inpHistogram.record(metric.value, {
      page,
      rating: metric.rating,
    });
  });
}
```

## Memory and Performance Metrics

Track browser performance metrics:

```typescript
// src/telemetry/performanceMetrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('performance-metrics');

// Create observable gauges for memory
meter.createObservableGauge('js_heap_size_bytes', {
  description: 'JavaScript heap size in bytes',
}, (observableResult) => {
  const memory = (performance as any).memory;
  if (memory) {
    observableResult.observe(memory.usedJSHeapSize, { type: 'used' });
    observableResult.observe(memory.totalJSHeapSize, { type: 'total' });
    observableResult.observe(memory.jsHeapSizeLimit, { type: 'limit' });
  }
});

// Create observable gauge for DOM metrics
meter.createObservableGauge('dom_nodes_count', {
  description: 'Number of DOM nodes',
}, (observableResult) => {
  observableResult.observe(document.getElementsByTagName('*').length);
});

// Long task observer
let longTaskCount = 0;
const longTaskDurations: number[] = [];

if ('PerformanceObserver' in window) {
  const longTaskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTaskCount++;
      longTaskDurations.push(entry.duration);
    }
  });

  try {
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Long task observation not supported
  }
}

meter.createObservableGauge('long_tasks_total', {
  description: 'Total number of long tasks',
}, (observableResult) => {
  observableResult.observe(longTaskCount);
});

meter.createObservableGauge('long_task_duration_avg_ms', {
  description: 'Average long task duration in milliseconds',
  unit: 'ms',
}, (observableResult) => {
  if (longTaskDurations.length > 0) {
    const avg = longTaskDurations.reduce((a, b) => a + b, 0) / longTaskDurations.length;
    observableResult.observe(avg);
  }
});
```

## Managing Metric Cardinality

High cardinality metrics can explode storage costs. Follow these practices:

```typescript
// BAD: High cardinality - creates a new series for every user
metricsService.recordPageView('/profile', { user_id: userId });

// GOOD: Bucket users into cohorts
metricsService.recordPageView('/profile', { user_type: getUserType(userId) });

// BAD: Unbounded values
metricsService.recordApiLatency('/search', duration, { query: searchQuery });

// GOOD: Categorize instead
metricsService.recordApiLatency('/search', duration, {
  query_length: getQueryLengthBucket(searchQuery.length),
  has_filters: hasFilters.toString(),
});
```

### Cardinality Guard

```typescript
// src/telemetry/cardinalityGuard.ts
const MAX_UNIQUE_VALUES = 100;
const seenValues: Map<string, Set<string>> = new Map();

export function guardCardinality(
  metricName: string,
  attributeName: string,
  value: string,
  fallback: string = 'other'
): string {
  const key = `${metricName}:${attributeName}`;

  if (!seenValues.has(key)) {
    seenValues.set(key, new Set());
  }

  const values = seenValues.get(key)!;

  if (values.has(value)) {
    return value;
  }

  if (values.size < MAX_UNIQUE_VALUES) {
    values.add(value);
    return value;
  }

  // Too many unique values, use fallback
  console.warn(`Cardinality limit reached for ${key}, using fallback`);
  return fallback;
}
```

## Sending Metrics to OneUptime

Configure your OpenTelemetry setup to send metrics to OneUptime:

```typescript
// src/telemetry/setup.ts
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const metricExporter = new OTLPMetricExporter({
  url: 'https://otlp.oneuptime.com/v1/metrics',
  headers: {
    'x-oneuptime-token': process.env.REACT_APP_ONEUPTIME_TOKEN,
  },
});
```

## Debugging Metrics Locally

During development, log metrics to the console:

```typescript
// src/telemetry/consoleExporter.ts
import { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';

export class ConsoleMetricExporter implements PushMetricExporter {
  async export(metrics: ResourceMetrics, resultCallback: (result: any) => void) {
    for (const scopeMetrics of metrics.scopeMetrics) {
      for (const metric of scopeMetrics.metrics) {
        console.log('[Metric]', {
          name: metric.descriptor.name,
          type: metric.descriptor.type,
          dataPoints: metric.dataPoints.map(dp => ({
            value: (dp as any).value,
            attributes: dp.attributes,
          })),
        });
      }
    }
    resultCallback({ code: 0 });
  }

  async forceFlush() {}
  async shutdown() {}
}
```

## Summary Table

| Metric Category | Metric Name | Type | Purpose |
|----------------|-------------|------|---------|
| **Render Performance** | `component_render_duration_ms` | Histogram | Track component render times |
| **Render Performance** | `component_mount_count` | Counter | Count component mounts |
| **User Interaction** | `user_interaction_duration_ms` | Histogram | Measure time from click to response |
| **User Interaction** | `button_clicks_total` | Counter | Track button engagement |
| **API Performance** | `api_request_duration_ms` | Histogram | Client-side API latency |
| **API Performance** | `pending_requests` | UpDownCounter | Active API requests |
| **Navigation** | `page_views_total` | Counter | Track page visits |
| **Navigation** | `time_on_page_ms` | Histogram | Measure page engagement |
| **Errors** | `frontend_errors_total` | Counter | Track error frequency |
| **Business** | `feature_usage_total` | Counter | Track feature adoption |
| **Business** | `cart_additions_total` | Counter | E-commerce engagement |
| **Business** | `order_value_usd` | Histogram | Revenue distribution |
| **Web Vitals** | `web_vital_lcp_ms` | Histogram | Largest Contentful Paint |
| **Web Vitals** | `web_vital_fid_ms` | Histogram | First Input Delay |
| **Web Vitals** | `web_vital_cls` | Histogram | Cumulative Layout Shift |
| **System** | `js_heap_size_bytes` | Observable Gauge | Memory usage |
| **System** | `dom_nodes_count` | Observable Gauge | DOM complexity |
| **System** | `long_tasks_total` | Observable Gauge | Main thread blocking |

## Best Practices Checklist

- [ ] Initialize OpenTelemetry before React mounts
- [ ] Use React Profiler for component render timing
- [ ] Track user interactions with start/end timing
- [ ] Correlate API calls with trace context
- [ ] Capture Web Vitals alongside custom metrics
- [ ] Guard against high cardinality attributes
- [ ] Use buckets for numeric values in attributes
- [ ] Include error boundaries with metric reporting
- [ ] Track business metrics relevant to your domain
- [ ] Test metrics locally before production deployment

## Conclusion

Custom metrics give you visibility into aspects of your React application that standard monitoring cannot capture. By combining component render timing, user interaction tracking, API performance measurement, and business metrics, you build a complete picture of how your application performs from the user's perspective.

The key is to start with metrics that answer specific questions:

- Which components are slow?
- Where do users experience delays?
- Which features drive engagement?
- What patterns precede errors?

With OpenTelemetry and OneUptime, you can collect these metrics using open standards, avoiding vendor lock-in while getting actionable insights into your React application's performance.

---

**Related Reading:**

- [The Three Pillars of Observability: Logs, Metrics, and Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [How to Instrument Express.js Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view)
