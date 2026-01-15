# How to Trace User Interactions in React with OpenTelemetry Spans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, OpenTelemetry, User Interactions, Tracing, UX, Observability

Description: Learn how to implement comprehensive user interaction tracing in React applications using OpenTelemetry spans, including click tracking, form submissions, navigation events, and performance correlation.

---

Understanding how users interact with your React application is critical for optimizing user experience and debugging frontend issues. While traditional analytics tools tell you what users clicked, OpenTelemetry tracing tells you how long operations took, what failed, and how frontend interactions connect to backend services.

This guide covers implementing comprehensive user interaction tracing in React using OpenTelemetry spans. You will learn to trace button clicks, form submissions, navigation events, and custom interactions while maintaining context across your distributed system.

For foundational concepts, see our guides on [traces and spans](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) and [Express.js instrumentation](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view).

---

## Table of Contents

1. Why Trace User Interactions
2. Setting Up OpenTelemetry in React
3. Creating a Tracing Context Provider
4. Click Tracking Implementation
5. Form Submission Tracing
6. Navigation and Route Change Tracing
7. Custom Interaction Hooks
8. Error Boundary Integration
9. Performance Metrics Collection
10. Context Propagation to Backend
11. Sampling Strategies for Frontend
12. Best Practices and Anti-Patterns
13. Complete Example Application
14. Summary Reference Table

---

## 1. Why Trace User Interactions

Traditional frontend monitoring captures page views and click counts. OpenTelemetry tracing provides deeper insights:

| Traditional Analytics | OpenTelemetry Tracing |
|-----------------------|-----------------------|
| Click count | Click duration, success/failure |
| Page views | Full navigation timing breakdown |
| Error count | Error context with stack traces |
| Session data | End-to-end request correlation |
| Conversion funnel | Operation-level timing across services |

User interaction traces answer questions like:
- How long did the checkout button click take to complete?
- Which API call is slowing down the form submission?
- Did the user see the loading state before the timeout?
- What sequence of actions led to this error?

By instrumenting user interactions as spans, you connect frontend events to backend traces, enabling full-stack debugging and performance optimization.

---

## 2. Setting Up OpenTelemetry in React

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/context-zone \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### Basic Telemetry Configuration

Create `src/telemetry.ts` to initialize OpenTelemetry before your application renders:

```typescript
// src/telemetry.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Define your application identity
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'react-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.REACT_APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure the OTLP exporter to send traces to your backend
const exporter = new OTLPTraceExporter({
  url: process.env.REACT_APP_OTLP_ENDPOINT || 'https://oneuptime.com/otlp/v1/traces',
  headers: {
    'x-oneuptime-token': process.env.REACT_APP_ONEUPTIME_TOKEN || '',
  },
});

// Create the tracer provider
const provider = new WebTracerProvider({
  resource,
});

// Use batch processing for efficiency
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  maxExportBatchSize: 10,
  scheduledDelayMillis: 500,
}));

// Register the provider globally
provider.register({
  contextManager: new ZoneContextManager(),
});

// Auto-instrument fetch and XHR requests
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.yourdomain\.com\/.*/,
        /https:\/\/.*\.oneuptime\.com\/.*/,
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

export { provider };
```

### Initialize Before React Renders

```typescript
// src/index.tsx
import './telemetry'; // Must be first import
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 3. Creating a Tracing Context Provider

Build a React context that provides tracing utilities throughout your application:

```typescript
// src/contexts/TracingContext.tsx
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { trace, Span, SpanStatusCode, context as otelContext } from '@opentelemetry/api';

interface TracingContextValue {
  tracer: ReturnType<typeof trace.getTracer>;
  startSpan: (name: string, attributes?: Record<string, any>) => Span;
  withSpan: <T>(name: string, fn: (span: Span) => Promise<T> | T, attributes?: Record<string, any>) => Promise<T>;
  recordError: (span: Span, error: Error) => void;
  getActiveSpan: () => Span | undefined;
}

const TracingContext = createContext<TracingContextValue | null>(null);

export function TracingProvider({ children }: { children: React.ReactNode }) {
  const tracer = useMemo(() => trace.getTracer('react-user-interactions', '1.0.0'), []);

  const startSpan = useCallback((name: string, attributes: Record<string, any> = {}) => {
    return tracer.startSpan(name, {
      attributes: {
        'component': 'react',
        ...attributes,
      },
    });
  }, [tracer]);

  const withSpan = useCallback(async <T,>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    attributes: Record<string, any> = {}
  ): Promise<T> => {
    const span = startSpan(name, attributes);
    try {
      const result = await otelContext.with(
        trace.setSpan(otelContext.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }, [startSpan]);

  const recordError = useCallback((span: Span, error: Error) => {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.setAttribute('error.type', error.name);
    span.setAttribute('error.message', error.message);
  }, []);

  const getActiveSpan = useCallback(() => {
    return trace.getSpan(otelContext.active());
  }, []);

  const value = useMemo(() => ({
    tracer,
    startSpan,
    withSpan,
    recordError,
    getActiveSpan,
  }), [tracer, startSpan, withSpan, recordError, getActiveSpan]);

  return (
    <TracingContext.Provider value={value}>
      {children}
    </TracingContext.Provider>
  );
}

export function useTracing(): TracingContextValue {
  const context = useContext(TracingContext);
  if (!context) {
    throw new Error('useTracing must be used within a TracingProvider');
  }
  return context;
}
```

### Wrap Your Application

```typescript
// src/App.tsx
import React from 'react';
import { TracingProvider } from './contexts/TracingContext';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';

function App() {
  return (
    <TracingProvider>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </TracingProvider>
  );
}

export default App;
```

---

## 4. Click Tracking Implementation

### Basic Click Tracking Hook

Create a hook that wraps click handlers with tracing:

```typescript
// src/hooks/useTrackedClick.ts
import { useCallback } from 'react';
import { useTracing } from '../contexts/TracingContext';

interface ClickTrackingOptions {
  elementName: string;
  elementType?: string;
  action?: string;
  attributes?: Record<string, any>;
}

export function useTrackedClick<T extends (...args: any[]) => any>(
  handler: T,
  options: ClickTrackingOptions
): T {
  const { withSpan } = useTracing();

  return useCallback(async (...args: Parameters<T>) => {
    const spanName = `ui.click.${options.elementName}`;

    return withSpan(spanName, async (span) => {
      span.setAttributes({
        'ui.element.name': options.elementName,
        'ui.element.type': options.elementType || 'button',
        'ui.action': options.action || 'click',
        'ui.timestamp': Date.now(),
        ...options.attributes,
      });

      // Add event for click start
      span.addEvent('click.initiated', {
        'ui.element.name': options.elementName,
      });

      const result = await handler(...args);

      // Add event for click completion
      span.addEvent('click.completed', {
        'ui.element.name': options.elementName,
      });

      return result;
    }, {
      'interaction.type': 'click',
    });
  }, [handler, options, withSpan]) as T;
}
```

### TrackedButton Component

Create a reusable button component with built-in tracing:

```typescript
// src/components/TrackedButton.tsx
import React, { useCallback } from 'react';
import { useTracing } from '../contexts/TracingContext';

interface TrackedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  trackingName: string;
  trackingCategory?: string;
  trackingAttributes?: Record<string, any>;
  onTrackedClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

export function TrackedButton({
  trackingName,
  trackingCategory = 'general',
  trackingAttributes = {},
  onTrackedClick,
  onClick,
  children,
  ...props
}: TrackedButtonProps) {
  const { withSpan } = useTracing();

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    const handler = onTrackedClick || onClick;
    if (!handler) return;

    await withSpan(`ui.click.${trackingName}`, async (span) => {
      span.setAttributes({
        'ui.element.name': trackingName,
        'ui.element.type': 'button',
        'ui.category': trackingCategory,
        'ui.button.disabled': props.disabled || false,
        'ui.button.type': props.type || 'button',
        ...trackingAttributes,
      });

      span.addEvent('button.click.start');

      try {
        await handler(e);
        span.addEvent('button.click.success');
      } catch (error) {
        span.addEvent('button.click.error', {
          'error.message': error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });
  }, [trackingName, trackingCategory, trackingAttributes, onTrackedClick, onClick, props.disabled, props.type, withSpan]);

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
```

### Usage Example

```typescript
// src/components/ProductCard.tsx
import React, { useState } from 'react';
import { TrackedButton } from './TrackedButton';
import { useTrackedClick } from '../hooks/useTrackedClick';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
  };
  onAddToCart: (productId: string) => Promise<void>;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await onAddToCart(product.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>

      <TrackedButton
        trackingName="add-to-cart"
        trackingCategory="ecommerce"
        trackingAttributes={{
          'product.id': product.id,
          'product.name': product.name,
          'product.price': product.price,
        }}
        onTrackedClick={handleAddToCart}
        disabled={isLoading}
      >
        {isLoading ? 'Adding...' : 'Add to Cart'}
      </TrackedButton>
    </div>
  );
}
```

---

## 5. Form Submission Tracing

### Form Tracing Hook

Create a comprehensive hook for tracing form submissions:

```typescript
// src/hooks/useTrackedForm.ts
import { useCallback, useRef } from 'react';
import { useTracing } from '../contexts/TracingContext';
import { Span, SpanStatusCode } from '@opentelemetry/api';

interface FormTrackingOptions {
  formName: string;
  formCategory?: string;
  trackFieldChanges?: boolean;
  sanitizeFields?: string[]; // Fields to exclude from attributes
}

interface FormState {
  startTime: number;
  fieldInteractions: Map<string, number>;
  validationErrors: string[];
}

export function useTrackedForm<T extends Record<string, any>>(
  onSubmit: (data: T) => Promise<void>,
  options: FormTrackingOptions
) {
  const { withSpan, startSpan } = useTracing();
  const formState = useRef<FormState>({
    startTime: Date.now(),
    fieldInteractions: new Map(),
    validationErrors: [],
  });
  const currentSpan = useRef<Span | null>(null);

  // Track when user starts interacting with the form
  const handleFormFocus = useCallback(() => {
    if (currentSpan.current) return;

    formState.current.startTime = Date.now();
    currentSpan.current = startSpan(`form.interaction.${options.formName}`, {
      'form.name': options.formName,
      'form.category': options.formCategory || 'general',
    });
    currentSpan.current.addEvent('form.focus');
  }, [options.formName, options.formCategory, startSpan]);

  // Track individual field changes
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    if (!options.trackFieldChanges) return;

    const interactions = formState.current.fieldInteractions.get(fieldName) || 0;
    formState.current.fieldInteractions.set(fieldName, interactions + 1);

    if (currentSpan.current) {
      const shouldSanitize = options.sanitizeFields?.includes(fieldName);
      currentSpan.current.addEvent('form.field.change', {
        'field.name': fieldName,
        'field.value': shouldSanitize ? '[REDACTED]' : String(value).substring(0, 100),
        'field.interaction_count': interactions + 1,
      });
    }
  }, [options.trackFieldChanges, options.sanitizeFields]);

  // Track validation errors
  const handleValidationError = useCallback((errors: Record<string, string>) => {
    formState.current.validationErrors = Object.keys(errors);

    if (currentSpan.current) {
      currentSpan.current.addEvent('form.validation.error', {
        'validation.error_count': Object.keys(errors).length,
        'validation.fields': Object.keys(errors).join(','),
      });
    }
  }, []);

  // Track form submission
  const handleSubmit = useCallback(async (data: T) => {
    const parentSpan = currentSpan.current;

    await withSpan(`form.submit.${options.formName}`, async (span) => {
      const timeToSubmit = Date.now() - formState.current.startTime;

      span.setAttributes({
        'form.name': options.formName,
        'form.category': options.formCategory || 'general',
        'form.time_to_submit_ms': timeToSubmit,
        'form.field_count': Object.keys(data).length,
        'form.total_field_interactions': Array.from(formState.current.fieldInteractions.values())
          .reduce((a, b) => a + b, 0),
        'form.had_validation_errors': formState.current.validationErrors.length > 0,
      });

      span.addEvent('form.submit.start', {
        'form.fields_changed': formState.current.fieldInteractions.size,
      });

      try {
        await onSubmit(data);
        span.addEvent('form.submit.success');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error: any) {
        span.addEvent('form.submit.error', {
          'error.message': error.message,
        });
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      }
    });

    // End the interaction span
    if (parentSpan) {
      parentSpan.addEvent('form.completed');
      parentSpan.end();
      currentSpan.current = null;
    }

    // Reset form state
    formState.current = {
      startTime: Date.now(),
      fieldInteractions: new Map(),
      validationErrors: [],
    };
  }, [options.formName, options.formCategory, onSubmit, withSpan]);

  // Track form abandonment
  const handleFormBlur = useCallback(() => {
    // Delay to check if user is truly leaving the form
    setTimeout(() => {
      if (currentSpan.current && !document.activeElement?.closest('form')) {
        currentSpan.current.addEvent('form.blur', {
          'form.time_spent_ms': Date.now() - formState.current.startTime,
          'form.fields_interacted': formState.current.fieldInteractions.size,
        });
      }
    }, 100);
  }, []);

  return {
    handleFormFocus,
    handleFieldChange,
    handleValidationError,
    handleSubmit,
    handleFormBlur,
  };
}
```

### TrackedForm Component

```typescript
// src/components/TrackedForm.tsx
import React, { useCallback } from 'react';
import { useTrackedForm } from '../hooks/useTrackedForm';

interface TrackedFormProps<T> {
  formName: string;
  formCategory?: string;
  onSubmit: (data: T) => Promise<void>;
  validate?: (data: T) => Record<string, string> | null;
  sanitizeFields?: string[];
  children: (props: {
    register: (name: string) => {
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
      onFocus: () => void;
      onBlur: () => void;
      name: string;
    };
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    errors: Record<string, string>;
    isSubmitting: boolean;
  }) => React.ReactNode;
}

export function TrackedForm<T extends Record<string, any>>({
  formName,
  formCategory,
  onSubmit,
  validate,
  sanitizeFields = ['password', 'creditCard', 'ssn', 'cvv'],
  children,
}: TrackedFormProps<T>) {
  const [formData, setFormData] = React.useState<Partial<T>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    handleFormFocus,
    handleFieldChange,
    handleValidationError,
    handleSubmit: trackedSubmit,
    handleFormBlur,
  } = useTrackedForm<T>(onSubmit, {
    formName,
    formCategory,
    trackFieldChanges: true,
    sanitizeFields,
  });

  const register = useCallback((name: string) => ({
    name,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

      setFormData(prev => ({ ...prev, [name]: value }));
      handleFieldChange(name, value);

      // Clear error on change
      if (errors[name]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    onFocus: handleFormFocus,
    onBlur: handleFormBlur,
  }), [handleFormFocus, handleFieldChange, handleFormBlur, errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (validate) {
      const validationErrors = validate(formData as T);
      if (validationErrors) {
        setErrors(validationErrors);
        handleValidationError(validationErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await trackedSubmit(formData as T);
      setFormData({});
      setErrors({});
    } catch (error) {
      // Error handling is done in the traced submit
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, handleValidationError, trackedSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      {children({ register, handleSubmit, errors, isSubmitting })}
    </form>
  );
}
```

### Login Form Example

```typescript
// src/components/LoginForm.tsx
import React from 'react';
import { TrackedForm } from './TrackedForm';
import { TrackedButton } from './TrackedButton';

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onLogin: (data: LoginData) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const validate = (data: LoginData) => {
    const errors: Record<string, string> = {};

    if (!data.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = 'Invalid email format';
    }

    if (!data.password) {
      errors.password = 'Password is required';
    } else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  return (
    <TrackedForm<LoginData>
      formName="login"
      formCategory="authentication"
      onSubmit={onLogin}
      validate={validate}
      sanitizeFields={['password']}
    >
      {({ register, handleSubmit, errors, isSubmitting }) => (
        <>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              {...register('password')}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                {...register('rememberMe')}
              />
              Remember me
            </label>
          </div>

          <TrackedButton
            type="submit"
            trackingName="login-submit"
            trackingCategory="authentication"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </TrackedButton>
        </>
      )}
    </TrackedForm>
  );
}
```

---

## 6. Navigation and Route Change Tracing

### Route Change Tracking Hook

```typescript
// src/hooks/useRouteTracing.ts
import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useTracing } from '../contexts/TracingContext';
import { Span } from '@opentelemetry/api';

export function useRouteTracing() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { startSpan } = useTracing();
  const currentRouteSpan = useRef<Span | null>(null);
  const navigationStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // End previous route span
    if (currentRouteSpan.current) {
      const timeOnPreviousRoute = Date.now() - navigationStartTime.current;
      currentRouteSpan.current.setAttribute('route.time_spent_ms', timeOnPreviousRoute);
      currentRouteSpan.current.addEvent('route.leave');
      currentRouteSpan.current.end();
    }

    // Start new route span
    navigationStartTime.current = Date.now();
    currentRouteSpan.current = startSpan(`route.${location.pathname}`, {
      'route.pathname': location.pathname,
      'route.search': location.search,
      'route.hash': location.hash,
      'route.navigation_type': navigationType,
      'route.full_url': window.location.href,
    });

    currentRouteSpan.current.addEvent('route.enter', {
      'route.referrer': document.referrer,
    });

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (currentRouteSpan.current) {
        currentRouteSpan.current.addEvent('page.visibility_change', {
          'page.visible': !document.hidden,
          'page.visibility_state': document.visibilityState,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location, navigationType, startSpan]);

  // End span on unmount (e.g., when closing the app)
  useEffect(() => {
    return () => {
      if (currentRouteSpan.current) {
        currentRouteSpan.current.addEvent('route.unmount');
        currentRouteSpan.current.end();
      }
    };
  }, []);
}
```

### Navigation Link Component

```typescript
// src/components/TrackedLink.tsx
import React, { useCallback } from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { useTracing } from '../contexts/TracingContext';

interface TrackedLinkProps extends LinkProps {
  trackingName: string;
  trackingCategory?: string;
  trackingAttributes?: Record<string, any>;
}

export function TrackedLink({
  trackingName,
  trackingCategory = 'navigation',
  trackingAttributes = {},
  onClick,
  to,
  children,
  ...props
}: TrackedLinkProps) {
  const { withSpan } = useTracing();
  const navigate = useNavigate();

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    await withSpan(`navigation.${trackingName}`, async (span) => {
      span.setAttributes({
        'navigation.name': trackingName,
        'navigation.category': trackingCategory,
        'navigation.destination': typeof to === 'string' ? to : to.pathname || '',
        'navigation.source': window.location.pathname,
        ...trackingAttributes,
      });

      span.addEvent('navigation.click');

      if (onClick) {
        await onClick(e);
      }

      span.addEvent('navigation.start');
      navigate(to);
      span.addEvent('navigation.complete');
    });
  }, [trackingName, trackingCategory, trackingAttributes, to, onClick, navigate, withSpan]);

  return (
    <Link {...props} to={to} onClick={handleClick}>
      {children}
    </Link>
  );
}
```

### Integration with Router

```typescript
// src/components/TracedRouter.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useRouteTracing } from '../hooks/useRouteTracing';

function RouteTracer({ children }: { children: React.ReactNode }) {
  useRouteTracing();
  return <>{children}</>;
}

export function TracedRouter({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <RouteTracer>
        {children}
      </RouteTracer>
    </BrowserRouter>
  );
}
```

---

## 7. Custom Interaction Hooks

### Scroll Tracking

```typescript
// src/hooks/useScrollTracking.ts
import { useEffect, useRef } from 'react';
import { useTracing } from '../contexts/TracingContext';
import { Span } from '@opentelemetry/api';

interface ScrollTrackingOptions {
  elementId?: string;
  thresholds?: number[]; // Percentage thresholds to track (e.g., [25, 50, 75, 100])
  componentName: string;
}

export function useScrollTracking(options: ScrollTrackingOptions) {
  const { startSpan } = useTracing();
  const scrollSpan = useRef<Span | null>(null);
  const reachedThresholds = useRef<Set<number>>(new Set());
  const maxScrollDepth = useRef<number>(0);

  useEffect(() => {
    const thresholds = options.thresholds || [25, 50, 75, 100];
    const element = options.elementId
      ? document.getElementById(options.elementId)
      : document;

    if (!element) return;

    scrollSpan.current = startSpan(`scroll.${options.componentName}`, {
      'scroll.component': options.componentName,
      'scroll.element_id': options.elementId || 'document',
    });

    const handleScroll = () => {
      let scrollPercentage: number;

      if (element === document) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      } else {
        const el = element as HTMLElement;
        scrollPercentage = el.scrollHeight > el.clientHeight
          ? (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100
          : 0;
      }

      // Update max scroll depth
      if (scrollPercentage > maxScrollDepth.current) {
        maxScrollDepth.current = scrollPercentage;
      }

      // Check thresholds
      for (const threshold of thresholds) {
        if (scrollPercentage >= threshold && !reachedThresholds.current.has(threshold)) {
          reachedThresholds.current.add(threshold);
          scrollSpan.current?.addEvent(`scroll.reached.${threshold}`, {
            'scroll.percentage': scrollPercentage,
            'scroll.threshold': threshold,
          });
        }
      }
    };

    const scrollTarget = element === document ? window : element;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);

      if (scrollSpan.current) {
        scrollSpan.current.setAttribute('scroll.max_depth', maxScrollDepth.current);
        scrollSpan.current.setAttribute('scroll.thresholds_reached',
          Array.from(reachedThresholds.current).join(','));
        scrollSpan.current.end();
      }
    };
  }, [options.componentName, options.elementId, options.thresholds, startSpan]);
}
```

### Modal Interaction Tracking

```typescript
// src/hooks/useModalTracking.ts
import { useCallback, useRef } from 'react';
import { useTracing } from '../contexts/TracingContext';
import { Span } from '@opentelemetry/api';

interface ModalTrackingResult {
  onOpen: () => void;
  onClose: (reason: 'submit' | 'cancel' | 'backdrop' | 'escape') => void;
  trackInteraction: (interactionName: string, attributes?: Record<string, any>) => void;
}

export function useModalTracking(modalName: string): ModalTrackingResult {
  const { startSpan } = useTracing();
  const modalSpan = useRef<Span | null>(null);
  const openTime = useRef<number>(0);

  const onOpen = useCallback(() => {
    openTime.current = Date.now();
    modalSpan.current = startSpan(`modal.${modalName}`, {
      'modal.name': modalName,
    });
    modalSpan.current.addEvent('modal.open');
  }, [modalName, startSpan]);

  const onClose = useCallback((reason: 'submit' | 'cancel' | 'backdrop' | 'escape') => {
    if (modalSpan.current) {
      const timeOpen = Date.now() - openTime.current;
      modalSpan.current.setAttributes({
        'modal.time_open_ms': timeOpen,
        'modal.close_reason': reason,
      });
      modalSpan.current.addEvent('modal.close', {
        'modal.close_reason': reason,
      });
      modalSpan.current.end();
      modalSpan.current = null;
    }
  }, []);

  const trackInteraction = useCallback((interactionName: string, attributes: Record<string, any> = {}) => {
    if (modalSpan.current) {
      modalSpan.current.addEvent(`modal.interaction.${interactionName}`, attributes);
    }
  }, []);

  return { onOpen, onClose, trackInteraction };
}
```

### Usage Example: Modal Component

```typescript
// src/components/ConfirmationModal.tsx
import React, { useEffect } from 'react';
import { useModalTracking } from '../hooks/useModalTracking';
import { TrackedButton } from './TrackedButton';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { onOpen, onClose, trackInteraction } = useModalTracking('confirmation');

  useEffect(() => {
    if (isOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  const handleConfirm = async () => {
    trackInteraction('confirm-click');
    await onConfirm();
    onClose('submit');
  };

  const handleCancel = () => {
    onClose('cancel');
    onCancel();
  };

  const handleBackdropClick = () => {
    onClose('backdrop');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose('escape');
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <TrackedButton
            trackingName="modal-cancel"
            trackingCategory="modal"
            onClick={handleCancel}
          >
            Cancel
          </TrackedButton>
          <TrackedButton
            trackingName="modal-confirm"
            trackingCategory="modal"
            onTrackedClick={handleConfirm}
          >
            Confirm
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Error Boundary Integration

### Traced Error Boundary

```typescript
// src/components/TracedErrorBoundary.tsx
import React, { Component, ErrorInfo } from 'react';
import { trace, SpanStatusCode, context as otelContext } from '@opentelemetry/api';

interface Props {
  children: React.ReactNode;
  fallback: React.ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TracedErrorBoundary extends Component<Props, State> {
  private tracer = trace.getTracer('error-boundary');

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const span = this.tracer.startSpan(`error.boundary.${this.props.componentName}`, {
      attributes: {
        'error.boundary.component': this.props.componentName,
        'error.type': error.name,
        'error.message': error.message,
        'error.component_stack': errorInfo.componentStack || '',
      },
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `React Error Boundary caught: ${error.message}`,
    });

    span.addEvent('error.caught', {
      'error.name': error.name,
      'error.message': error.message,
    });

    // Log additional context
    const activeSpan = trace.getSpan(otelContext.active());
    if (activeSpan) {
      span.setAttribute('parent.span_id', activeSpan.spanContext().spanId);
      span.setAttribute('parent.trace_id', activeSpan.spanContext().traceId);
    }

    span.end();

    // You could also send to an error reporting service here
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

### Usage

```typescript
// src/App.tsx
import React from 'react';
import { TracedErrorBoundary } from './components/TracedErrorBoundary';

function App() {
  return (
    <TracedErrorBoundary
      componentName="app-root"
      fallback={<div>Something went wrong. Please refresh the page.</div>}
    >
      <MainApplication />
    </TracedErrorBoundary>
  );
}
```

---

## 9. Performance Metrics Collection

### Web Vitals Integration

```typescript
// src/hooks/useWebVitals.ts
import { useEffect } from 'react';
import { trace } from '@opentelemetry/api';

// Types for web vitals metrics
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
}

export function useWebVitals() {
  useEffect(() => {
    const tracer = trace.getTracer('web-vitals');

    const reportMetric = (metric: WebVitalsMetric) => {
      const span = tracer.startSpan(`web-vital.${metric.name.toLowerCase()}`, {
        attributes: {
          'web_vital.name': metric.name,
          'web_vital.value': metric.value,
          'web_vital.rating': metric.rating,
          'web_vital.id': metric.id,
        },
      });

      span.addEvent('metric.recorded', {
        'metric.value': metric.value,
        'metric.rating': metric.rating,
      });

      span.end();
    };

    // Dynamic import to keep bundle size down
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportMetric);
      onFID(reportMetric);
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
      onINP(reportMetric);
    });
  }, []);
}
```

### Component Render Performance

```typescript
// src/hooks/useRenderPerformance.ts
import { useEffect, useRef } from 'react';
import { useTracing } from '../contexts/TracingContext';

export function useRenderPerformance(componentName: string) {
  const { startSpan } = useTracing();
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    const currentRenderTime = performance.now();
    const timeSinceLastRender = currentRenderTime - lastRenderTime.current;
    renderCount.current += 1;

    const span = startSpan(`render.${componentName}`, {
      'render.component': componentName,
      'render.count': renderCount.current,
      'render.time_since_last_ms': timeSinceLastRender,
    });

    // Measure actual DOM update time
    requestAnimationFrame(() => {
      const paintTime = performance.now() - currentRenderTime;
      span.setAttribute('render.paint_time_ms', paintTime);
      span.end();
    });

    lastRenderTime.current = currentRenderTime;
  });
}
```

### Long Task Detection

```typescript
// src/hooks/useLongTaskDetection.ts
import { useEffect } from 'react';
import { trace } from '@opentelemetry/api';

export function useLongTaskDetection(threshold: number = 50) {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const tracer = trace.getTracer('long-tasks');

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          const span = tracer.startSpan('long-task.detected', {
            attributes: {
              'long_task.duration_ms': entry.duration,
              'long_task.start_time': entry.startTime,
              'long_task.name': entry.name,
              'long_task.entry_type': entry.entryType,
            },
          });

          span.addEvent('long_task.recorded', {
            'task.duration': entry.duration,
          });

          span.end();
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  }, [threshold]);
}
```

---

## 10. Context Propagation to Backend

### Fetch Wrapper with Trace Context

```typescript
// src/utils/tracedFetch.ts
import { trace, context as otelContext, propagation, SpanStatusCode, SpanKind } from '@opentelemetry/api';

interface TracedFetchOptions extends RequestInit {
  spanName?: string;
  spanAttributes?: Record<string, any>;
}

export async function tracedFetch(
  url: string,
  options: TracedFetchOptions = {}
): Promise<Response> {
  const { spanName, spanAttributes, ...fetchOptions } = options;
  const tracer = trace.getTracer('http-client');

  const parsedUrl = new URL(url, window.location.origin);
  const method = fetchOptions.method || 'GET';

  return tracer.startActiveSpan(
    spanName || `HTTP ${method} ${parsedUrl.pathname}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.host': parsedUrl.host,
        'http.path': parsedUrl.pathname,
        'http.scheme': parsedUrl.protocol.replace(':', ''),
        ...spanAttributes,
      },
    },
    async (span) => {
      // Inject trace context into headers
      const headers = new Headers(fetchOptions.headers);
      propagation.inject(otelContext.active(), headers, {
        set: (carrier, key, value) => carrier.set(key, value),
      });

      span.addEvent('http.request.start');

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        span.setAttributes({
          'http.status_code': response.status,
          'http.response_content_length': response.headers.get('content-length') || 0,
        });

        if (response.ok) {
          span.setStatus({ code: SpanStatusCode.OK });
          span.addEvent('http.request.success');
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${response.status}`,
          });
          span.addEvent('http.request.error', {
            'http.status_code': response.status,
          });
        }

        return response;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.addEvent('http.request.exception', {
          'error.message': error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
```

### API Client with Tracing

```typescript
// src/services/api.ts
import { tracedFetch } from '../utils/tracedFetch';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.example.com';

interface ApiResponse<T> {
  data: T;
  status: number;
}

export const api = {
  async get<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await tracedFetch(`${API_BASE}${path}`, {
      ...options,
      method: 'GET',
      spanName: `api.get.${path.split('/')[1] || 'root'}`,
      spanAttributes: {
        'api.path': path,
        'api.method': 'GET',
      },
    });

    const data = await response.json();
    return { data, status: response.status };
  },

  async post<T, B = any>(path: string, body: B, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await tracedFetch(`${API_BASE}${path}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      spanName: `api.post.${path.split('/')[1] || 'root'}`,
      spanAttributes: {
        'api.path': path,
        'api.method': 'POST',
      },
    });

    const data = await response.json();
    return { data, status: response.status };
  },

  async put<T, B = any>(path: string, body: B, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await tracedFetch(`${API_BASE}${path}`, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      spanName: `api.put.${path.split('/')[1] || 'root'}`,
      spanAttributes: {
        'api.path': path,
        'api.method': 'PUT',
      },
    });

    const data = await response.json();
    return { data, status: response.status };
  },

  async delete<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await tracedFetch(`${API_BASE}${path}`, {
      ...options,
      method: 'DELETE',
      spanName: `api.delete.${path.split('/')[1] || 'root'}`,
      spanAttributes: {
        'api.path': path,
        'api.method': 'DELETE',
      },
    });

    const data = await response.json();
    return { data, status: response.status };
  },
};
```

---

## 11. Sampling Strategies for Frontend

### Configurable Sampler

```typescript
// src/telemetry/sampler.ts
import { Sampler, SamplingResult, SamplingDecision, Context, SpanKind, Attributes, Link } from '@opentelemetry/api';

interface SamplerConfig {
  defaultSampleRate: number;
  errorSampleRate: number;
  interactionSampleRate: number;
  routeRates: Record<string, number>;
}

export class FrontendSampler implements Sampler {
  private config: SamplerConfig;

  constructor(config: Partial<SamplerConfig> = {}) {
    this.config = {
      defaultSampleRate: config.defaultSampleRate ?? 0.1,
      errorSampleRate: config.errorSampleRate ?? 1.0,
      interactionSampleRate: config.interactionSampleRate ?? 0.5,
      routeRates: config.routeRates ?? {},
    };
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    let sampleRate = this.config.defaultSampleRate;

    // Always sample errors
    if (spanName.startsWith('error.') || attributes['error'] === true) {
      sampleRate = this.config.errorSampleRate;
    }
    // Higher sampling for user interactions
    else if (spanName.startsWith('ui.click.') || spanName.startsWith('form.')) {
      sampleRate = this.config.interactionSampleRate;
    }
    // Route-specific sampling
    else if (spanName.startsWith('route.')) {
      const route = spanName.replace('route.', '');
      sampleRate = this.config.routeRates[route] ?? this.config.defaultSampleRate;
    }

    const decision = Math.random() < sampleRate
      ? SamplingDecision.RECORD_AND_SAMPLED
      : SamplingDecision.NOT_RECORD;

    return {
      decision,
      attributes: {
        'sampling.rate': sampleRate,
        'sampling.decision': decision === SamplingDecision.RECORD_AND_SAMPLED ? 'sampled' : 'dropped',
      },
    };
  }

  toString(): string {
    return `FrontendSampler{defaultRate=${this.config.defaultSampleRate}}`;
  }
}
```

### Updated Telemetry Configuration

```typescript
// src/telemetry.ts (updated)
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { FrontendSampler } from './telemetry/sampler';

const sampler = new FrontendSampler({
  defaultSampleRate: parseFloat(process.env.REACT_APP_SAMPLE_RATE || '0.1'),
  errorSampleRate: 1.0,
  interactionSampleRate: 0.5,
  routeRates: {
    '/checkout': 1.0,
    '/payment': 1.0,
    '/': 0.05,
  },
});

const provider = new WebTracerProvider({
  resource,
  sampler,
});
```

---

## 12. Best Practices and Anti-Patterns

### Best Practices

1. **Use Consistent Naming Conventions**

```typescript
// Good: Consistent, hierarchical naming
'ui.click.add-to-cart'
'form.submit.login'
'route./checkout'
'modal.confirmation'

// Bad: Inconsistent naming
'addToCartClick'
'LoginFormSubmit'
'checkout_page'
'ConfirmModal'
```

2. **Sanitize Sensitive Data**

```typescript
// Good: Redact sensitive fields
span.setAttribute('user.id', userId);
span.setAttribute('form.email', '[REDACTED]');

// Bad: Exposing sensitive data
span.setAttribute('user.password', password);
span.setAttribute('user.credit_card', creditCard);
```

3. **Add Meaningful Context**

```typescript
// Good: Rich context for debugging
span.setAttributes({
  'product.id': productId,
  'product.category': category,
  'cart.item_count': cart.items.length,
  'user.is_authenticated': !!user,
});

// Bad: Minimal or irrelevant context
span.setAttribute('clicked', true);
```

4. **Handle Async Operations Correctly**

```typescript
// Good: Wrap async operations properly
const handleClick = async () => {
  await withSpan('async.operation', async (span) => {
    span.addEvent('operation.start');
    const result = await asyncOperation();
    span.addEvent('operation.complete');
    return result;
  });
};

// Bad: Span ends before async completes
const handleClick = () => {
  const span = startSpan('async.operation');
  asyncOperation().then(() => {
    // span already ended
  });
  span.end();
};
```

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Tracing every render | Performance overhead, noise | Use selective tracing for significant renders |
| High-cardinality span names | Difficult to aggregate | Use attributes for variable data |
| Forgetting to end spans | Memory leaks, incomplete traces | Use try/finally or helper functions |
| Blocking UI on trace export | Poor user experience | Use batch processing with reasonable delays |
| Tracing in tight loops | Performance degradation | Aggregate or sample loop iterations |
| Exposing PII in attributes | Privacy and compliance issues | Sanitize or redact sensitive data |

---

## 13. Complete Example Application

### Project Structure

```
src/
  components/
    TrackedButton.tsx
    TrackedForm.tsx
    TrackedLink.tsx
    TracedErrorBoundary.tsx
    ProductCard.tsx
    LoginForm.tsx
    ConfirmationModal.tsx
  contexts/
    TracingContext.tsx
  hooks/
    useTrackedClick.ts
    useTrackedForm.ts
    useRouteTracing.ts
    useModalTracking.ts
    useScrollTracking.ts
    useWebVitals.ts
    useRenderPerformance.ts
  services/
    api.ts
  utils/
    tracedFetch.ts
  telemetry/
    sampler.ts
  telemetry.ts
  App.tsx
  index.tsx
```

### Full App Example

```typescript
// src/App.tsx
import React from 'react';
import { TracingProvider } from './contexts/TracingContext';
import { TracedRouter } from './components/TracedRouter';
import { TracedErrorBoundary } from './components/TracedErrorBoundary';
import { useWebVitals } from './hooks/useWebVitals';
import { useLongTaskDetection } from './hooks/useLongTaskDetection';
import { Routes, Route } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';

function AppContent() {
  // Initialize performance monitoring
  useWebVitals();
  useLongTaskDetection(50);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

function App() {
  return (
    <TracedErrorBoundary
      componentName="app-root"
      fallback={<div>Something went wrong. Please refresh the page.</div>}
    >
      <TracingProvider>
        <TracedRouter>
          <AppContent />
        </TracedRouter>
      </TracingProvider>
    </TracedErrorBoundary>
  );
}

export default App;
```

### Example Checkout Page

```typescript
// src/pages/CheckoutPage.tsx
import React, { useState } from 'react';
import { useTracing } from '../contexts/TracingContext';
import { useScrollTracking } from '../hooks/useScrollTracking';
import { useRenderPerformance } from '../hooks/useRenderPerformance';
import { TrackedForm } from '../components/TrackedForm';
import { TrackedButton } from '../components/TrackedButton';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { api } from '../services/api';

interface CheckoutData {
  email: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  billingAddress: string;
}

export default function CheckoutPage() {
  const { withSpan } = useTracing();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderData, setOrderData] = useState<CheckoutData | null>(null);

  // Track scroll depth on checkout page
  useScrollTracking({
    componentName: 'checkout-page',
    thresholds: [25, 50, 75, 100],
  });

  // Track render performance
  useRenderPerformance('checkout-page');

  const handleSubmit = async (data: CheckoutData) => {
    setOrderData(data);
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    if (!orderData) return;

    await withSpan('checkout.complete', async (span) => {
      span.setAttribute('checkout.has_billing_address', !!orderData.billingAddress);

      // Process payment
      const paymentResult = await api.post('/payments', {
        cardNumber: orderData.cardNumber.slice(-4),
        expiryDate: orderData.expiryDate,
      });

      span.setAttribute('payment.status', paymentResult.status);

      // Create order
      const orderResult = await api.post('/orders', {
        email: orderData.email,
        paymentId: paymentResult.data.id,
      });

      span.setAttribute('order.id', orderResult.data.id);

      return orderResult;
    });

    setShowConfirmation(false);
    // Navigate to confirmation page
  };

  const validate = (data: CheckoutData) => {
    const errors: Record<string, string> = {};

    if (!data.email) errors.email = 'Email is required';
    if (!data.cardNumber) errors.cardNumber = 'Card number is required';
    if (!data.expiryDate) errors.expiryDate = 'Expiry date is required';
    if (!data.cvv) errors.cvv = 'CVV is required';

    return Object.keys(errors).length > 0 ? errors : null;
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <TrackedForm<CheckoutData>
        formName="checkout"
        formCategory="ecommerce"
        onSubmit={handleSubmit}
        validate={validate}
        sanitizeFields={['cardNumber', 'cvv']}
      >
        {({ register, handleSubmit, errors, isSubmitting }) => (
          <>
            <div className="form-section">
              <h2>Contact Information</h2>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" {...register('email')} />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-section">
              <h2>Payment Details</h2>
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input type="text" id="cardNumber" {...register('cardNumber')} />
                {errors.cardNumber && <span className="error">{errors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry Date</label>
                  <input type="text" id="expiryDate" placeholder="MM/YY" {...register('expiryDate')} />
                  {errors.expiryDate && <span className="error">{errors.expiryDate}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input type="text" id="cvv" {...register('cvv')} />
                  {errors.cvv && <span className="error">{errors.cvv}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Billing Address</h2>
              <div className="form-group">
                <label htmlFor="billingAddress">Address</label>
                <textarea id="billingAddress" {...register('billingAddress')} />
              </div>
            </div>

            <TrackedButton
              type="submit"
              trackingName="checkout-submit"
              trackingCategory="ecommerce"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Review Order'}
            </TrackedButton>
          </>
        )}
      </TrackedForm>

      <ConfirmationModal
        isOpen={showConfirmation}
        title="Confirm Order"
        message="Are you sure you want to place this order?"
        onConfirm={handleConfirmOrder}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  );
}
```

---

## 14. Summary Reference Table

| Interaction Type | Span Name Pattern | Key Attributes | Events |
|------------------|-------------------|----------------|--------|
| **Button Click** | `ui.click.{name}` | `ui.element.name`, `ui.element.type`, `ui.category` | `click.initiated`, `click.completed` |
| **Form Submit** | `form.submit.{name}` | `form.name`, `form.time_to_submit_ms`, `form.field_count` | `form.submit.start`, `form.submit.success`, `form.submit.error` |
| **Form Interaction** | `form.interaction.{name}` | `form.name`, `form.category` | `form.focus`, `form.field.change`, `form.blur` |
| **Navigation** | `navigation.{name}` | `navigation.destination`, `navigation.source` | `navigation.click`, `navigation.start`, `navigation.complete` |
| **Route Change** | `route.{pathname}` | `route.pathname`, `route.navigation_type` | `route.enter`, `route.leave`, `page.visibility_change` |
| **Modal** | `modal.{name}` | `modal.name`, `modal.time_open_ms`, `modal.close_reason` | `modal.open`, `modal.close`, `modal.interaction.{type}` |
| **Scroll** | `scroll.{component}` | `scroll.component`, `scroll.max_depth` | `scroll.reached.{threshold}` |
| **Error Boundary** | `error.boundary.{component}` | `error.type`, `error.message`, `error.component_stack` | `error.caught` |
| **HTTP Request** | `HTTP {method} {path}` | `http.method`, `http.url`, `http.status_code` | `http.request.start`, `http.request.success`, `http.request.error` |
| **Web Vital** | `web-vital.{metric}` | `web_vital.name`, `web_vital.value`, `web_vital.rating` | `metric.recorded` |
| **Long Task** | `long-task.detected` | `long_task.duration_ms`, `long_task.start_time` | `long_task.recorded` |
| **Render** | `render.{component}` | `render.component`, `render.count`, `render.paint_time_ms` | - |

---

## Conclusion

Implementing user interaction tracing in React with OpenTelemetry provides deep visibility into how users experience your application. By instrumenting clicks, form submissions, navigation, and custom interactions, you can:

- Identify performance bottlenecks in user flows
- Debug issues with full context across frontend and backend
- Measure and optimize user experience metrics
- Correlate frontend events with backend traces

The patterns and components in this guide provide a foundation for comprehensive frontend observability. Start with the basics (click tracking and form submission) and gradually add more sophisticated tracing as needed.

Remember to balance observability depth with performance overhead. Use sampling strategies to reduce data volume while maintaining visibility into critical user journeys.

---

*Ready to visualize your React traces? Send them to [OneUptime](https://oneuptime.com) via OTLP and correlate frontend interactions with backend services for complete end-to-end observability.*

---

### Related Reading

- [What are Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Instrument Express.js Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
