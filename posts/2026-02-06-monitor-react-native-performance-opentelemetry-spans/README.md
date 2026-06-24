# How to Monitor React Native App Performance with OpenTelemetry Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, React Native, JavaScript, Mobile, Performance

Description: Master performance monitoring in React Native applications using OpenTelemetry spans to track JavaScript execution, bridge communication, native module calls, and UI rendering across iOS and Android.

React Native enables building mobile apps with JavaScript while delivering native performance. However, the architecture introduces unique performance considerations. JavaScript runs in its own runtime, native UI operations run on native threads, and communication between the JavaScript and native layers happens through the legacy bridge or, in the New Architecture, through JSI-backed native modules and Fabric. Understanding where time is spent requires instrumenting these layers with OpenTelemetry.

## Understanding React Native Performance Characteristics

React Native apps have distinct performance characteristics that differ from both web and native applications. JavaScript execution happens in a separate runtime, most commonly Hermes in current React Native versions, while UI rendering occurs in native threads. Older React Native apps and compatibility paths may still use the asynchronous bridge, where serialized communication can become a bottleneck. Newer apps use the New Architecture's JSI, TurboModules, and Fabric paths, which reduce bridge overhead but still benefit from tracing JavaScript, native module calls, and UI work separately.

Common performance issues include excessive JavaScript/native communication, slow JavaScript execution, inefficient React component renders, and blocking native operations. OpenTelemetry spans help identify which layer causes problems by tracking execution time across the entire stack.

## Installing OpenTelemetry in React Native

React Native requires special consideration for OpenTelemetry dependencies since you're targeting mobile platforms rather than Node.js. Use packages compatible with React Native's JavaScript environment.

```bash
# Install core OpenTelemetry packages

npm install @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/sdk-trace-web @opentelemetry/core
npm install @opentelemetry/resources @opentelemetry/semantic-conventions

# Install exporter package
npm install @opentelemetry/exporter-trace-otlp-http

# Install device metadata helper used in the examples
npm install react-native-device-info
```

For iOS, install CocoaPods dependencies:

```bash
cd ios && pod install && cd ..
```

## Configuring OpenTelemetry Provider

Create a telemetry configuration file that initializes OpenTelemetry when your app starts. This should set up the tracer provider, configure exporters, and register global instances.

```javascript
// telemetry/config.js
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_DEVICE_MODEL_NAME,
  ATTR_DEVICE_MANUFACTURER,
  ATTR_OS_NAME,
  ATTR_OS_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

let provider;
let tracer;

export function initializeTelemetry() {
  // Create resource with app and device information
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'MyReactNativeApp',
    [ATTR_SERVICE_VERSION]: DeviceInfo.getVersion(),
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: __DEV__ ? 'development' : 'production',
    [ATTR_OS_NAME]: Platform.OS,
    [ATTR_OS_VERSION]: String(Platform.Version),
    [ATTR_DEVICE_MODEL_NAME]: DeviceInfo.getModel(),
    [ATTR_DEVICE_MANUFACTURER]: DeviceInfo.getBrand(),
    'app.build.number': DeviceInfo.getBuildNumber(),
  });

  // Configure span exporter
  const exporter = __DEV__
    ? new ConsoleSpanExporter() // Use console in development
    : new OTLPTraceExporter({
        url: 'https://your-backend.com/v1/traces',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
        },
      });

  // Create batch span processor to reduce network overhead
  const spanProcessor = new BatchSpanProcessor(exporter, {
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
  });

  // Create and configure tracer provider
  provider = new WebTracerProvider({
    resource,
    spanProcessors: [spanProcessor],
  });

  // Register as global provider
  provider.register({
    propagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
  });

  // Get tracer instance
  tracer = provider.getTracer('react-native-app', '1.0.0');

  console.log('OpenTelemetry initialized successfully');

  return tracer;
}

export function getTracer() {
  if (!tracer) {
    throw new Error('Telemetry not initialized. Call initializeTelemetry() first.');
  }
  return tracer;
}

export function shutdown() {
  return provider?.shutdown();
}
```

Initialize telemetry in your app's entry point:

```javascript
// index.js
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initializeTelemetry } from './telemetry/config';

// Initialize telemetry before registering the app
initializeTelemetry();

AppRegistry.registerComponent(appName, () => App);
```

## Instrumenting Component Lifecycle

React components are the building blocks of React Native apps. Instrument component lifecycle to understand rendering performance and identify expensive components.

```javascript
// components/InstrumentedComponent.js
import React, { Component } from 'react';
import { context, trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Text, View } from 'react-native';
import { getTracer } from '../telemetry/config';

// Higher-order component that adds instrumentation
export function withInstrumentation(WrappedComponent, componentName) {
  return class InstrumentedComponent extends Component {
    constructor(props) {
      super(props);
      this.tracer = getTracer();
      this.componentName = componentName || WrappedComponent.name || 'Unknown';
      this.lifecycleSpan = null;
    }

    getLifecycleContext() {
      return this.lifecycleSpan
        ? trace.setSpan(context.active(), this.lifecycleSpan)
        : context.active();
    }

    componentDidMount() {
      // Start span for component lifecycle
      this.lifecycleSpan = this.tracer.startSpan(`Component.${this.componentName}`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'component.type': 'React',
          'component.name': this.componentName,
        },
      });

      // Create span for mount phase
      const mountSpan = this.tracer.startSpan(
        `Component.${this.componentName}.mount`,
        undefined,
        this.getLifecycleContext(),
      );

      try {
        mountSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        mountSpan.recordException(error);
        mountSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        mountSpan.end();
      }
    }

    componentDidUpdate(prevProps, prevState) {
      // Track component updates to identify unnecessary re-renders
      const updateSpan = this.tracer.startSpan(
        `Component.${this.componentName}.update`,
        {
          attributes: {
            'update.props_changed': JSON.stringify(prevProps) !== JSON.stringify(this.props),
            'update.state_changed': JSON.stringify(prevState) !== JSON.stringify(this.state),
          },
        },
        this.getLifecycleContext(),
      );

      try {
        updateSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        updateSpan.recordException(error);
        updateSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        updateSpan.end();
      }
    }

    componentWillUnmount() {
      const unmountSpan = this.tracer.startSpan(
        `Component.${this.componentName}.unmount`,
        undefined,
        this.getLifecycleContext(),
      );

      try {
        unmountSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        unmountSpan.recordException(error);
        unmountSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        unmountSpan.end();

        if (this.lifecycleSpan) {
          this.lifecycleSpan.setStatus({ code: SpanStatusCode.OK });
          this.lifecycleSpan.end();
        }
      }
    }

    render() {
      return (
        <React.Profiler
          id={this.componentName}
          onRender={(id, phase, actualDuration, baseDuration) => {
            const renderSpan = this.tracer.startSpan(
              `Component.${id}.render`,
              {
                kind: SpanKind.INTERNAL,
                attributes: {
                  'render.phase': phase,
                  'render.actual_duration_ms': actualDuration,
                  'render.base_duration_ms': baseDuration,
                },
              },
              this.getLifecycleContext(),
            );

            renderSpan.setStatus({ code: SpanStatusCode.OK });
            renderSpan.end();
          }}
        >
          <WrappedComponent {...this.props} />
        </React.Profiler>
      );
    }
  };
}

// Usage
class UserProfile extends Component {
  render() {
    return (
      <View>
        <Text>{this.props.user.name}</Text>
      </View>
    );
  }
}

export default withInstrumentation(UserProfile, 'UserProfile');
```

## Creating a React Hooks-Based Instrumentation API

For functional components with hooks, create custom hooks that provide tracing capabilities:

```javascript
// hooks/useTracing.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { getTracer } from '../telemetry/config';

export function useComponentTracing(componentName) {
  const tracer = getTracer();
  const spanRef = useRef(null);

  useEffect(() => {
    // Start component lifecycle span
    spanRef.current = tracer.startSpan(`Component.${componentName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'component.type': 'React.Functional',
        'component.name': componentName,
      },
    });

    // Add mount event
    spanRef.current.addEvent('component_mounted');

    // Cleanup on unmount
    return () => {
      if (spanRef.current) {
        spanRef.current.addEvent('component_unmounting');
        spanRef.current.setStatus({ code: SpanStatusCode.OK });
        spanRef.current.end();
      }
    };
  }, [componentName, tracer]);

  return spanRef.current;
}

export function useTracedCallback(name, callback, deps = []) {
  const tracer = getTracer();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    const span = tracer.startSpan(`Callback.${name}`, {
      kind: SpanKind.INTERNAL,
    });

    try {
      const result = callbackRef.current(...args);

      // Handle async results
      if (result instanceof Promise) {
        return result
          .then(value => {
            span.setStatus({ code: SpanStatusCode.OK });
            return value;
          })
          .catch(error => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            throw error;
          })
          .finally(() => span.end());
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.end();
      throw error;
    }
  }, [name, tracer, ...deps]);
}

export function useTracedEffect(name, effect, deps = []) {
  const tracer = getTracer();

  useEffect(() => {
    const span = tracer.startSpan(`Effect.${name}`, {
      kind: SpanKind.INTERNAL,
    });

    try {
      const cleanup = effect();
      span.setStatus({ code: SpanStatusCode.OK });

      return () => {
        if (typeof cleanup === 'function') {
          const cleanupSpan = tracer.startSpan(`Effect.${name}.cleanup`, {
            kind: SpanKind.INTERNAL,
          });

          try {
            cleanup();
            cleanupSpan.setStatus({ code: SpanStatusCode.OK });
          } catch (error) {
            cleanupSpan.recordException(error);
            cleanupSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
          } finally {
            cleanupSpan.end();
          }
        }
        span.end();
      };
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.end();
      throw error;
    }
  }, [name, tracer, ...deps]);
}

function UserProfileScreen({ userId }) {
  // Trace component lifecycle
  useComponentTracing('UserProfileScreen');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Traced callback for data fetching
  const loadUser = useTracedCallback(
    'loadUser',
    async () => {
      setLoading(true);
      const userData = await fetchUser(userId);
      setUser(userData);
      setLoading(false);
    },
    [userId],
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) return <LoadingSpinner />;
  return <UserProfile user={user} onRefresh={loadUser} />;
}
```

## Instrumenting Navigation

React Native apps typically use React Navigation. Instrument navigation to track screen transitions and user flows.

```javascript
// navigation/InstrumentedNavigator.js
import { createRef, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { getTracer } from '../telemetry/config';

export function useNavigationTracing() {
  const navigation = useNavigation();
  const route = useRoute();
  const tracer = getTracer();
  const screenSpanRef = useRef(null);

  useEffect(() => {
    // Start span when screen comes into focus
    const startScreenSpan = () => {
      if (screenSpanRef.current) {
        return;
      }

      screenSpanRef.current = tracer.startSpan(`Screen.${route.name}`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'screen.name': route.name,
          'screen.params': JSON.stringify(route.params),
        },
      });

      screenSpanRef.current.addEvent('screen_focused');
    };

    // End span when screen loses focus
    const endScreenSpan = () => {
      if (screenSpanRef.current) {
        screenSpanRef.current.addEvent('screen_blurred');
        screenSpanRef.current.setStatus({ code: SpanStatusCode.OK });
        screenSpanRef.current.end();
        screenSpanRef.current = null;
      }
    };

    // Subscribe to navigation events
    const unsubscribeFocus = navigation.addListener('focus', startScreenSpan);
    const unsubscribeBlur = navigation.addListener('blur', endScreenSpan);

    // If screen is already focused, start span immediately
    if (navigation.isFocused()) {
      startScreenSpan();
    }

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      endScreenSpan();
    };
  }, [navigation, route, tracer]);
}

// Create a custom navigation container with instrumentation
export function createInstrumentedNavigator() {
  const navigationRef = createRef();
  const routeNameRef = { current: undefined };
  const tracer = getTracer();

  return {
    ref: navigationRef,
    onReady: () => {
      routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
    },
    onStateChange: () => {
      const previousRouteName = routeNameRef.current;
      const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

      if (previousRouteName !== currentRouteName) {
        // Track navigation transition
        const span = tracer.startSpan('Navigation.transition', {
          kind: SpanKind.INTERNAL,
          attributes: {
            'navigation.from': previousRouteName,
            'navigation.to': currentRouteName,
          },
        });

        span.addEvent('navigation_completed');
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      }

      routeNameRef.current = currentRouteName;
    },
  };
}
```

## Instrumenting API Calls

Network requests are critical to track. Create an instrumented fetch wrapper that captures request timing and errors.

```javascript
// api/tracedFetch.js
import { context, propagation, trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { getTracer } from '../telemetry/config';

export async function tracedFetch(url, options = {}) {
  const tracer = getTracer();

  // Parse URL to extract useful attributes
  const urlObj = new URL(url);

  const span = tracer.startSpan(`HTTP ${options.method || 'GET'} ${urlObj.pathname}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': options.method || 'GET',
      'http.url': url,
      'http.scheme': urlObj.protocol.replace(':', ''),
      'http.host': urlObj.host,
      'http.target': urlObj.pathname + urlObj.search,
    },
  });

  // Inject trace context into request headers
  const headers = {
    ...options.headers,
  };

  // Add W3C trace context headers for propagation
  const spanContext = trace.setSpan(context.active(), span);
  propagation.inject(spanContext, headers);

  try {
    const startTime = Date.now();
    const response = await fetch(url, { ...options, headers });
    const duration = Date.now() - startTime;

    // Add response attributes
    span.setAttribute('http.status_code', response.status);
    span.setAttribute('http.duration_ms', duration);

    // Check if response indicates an error
    if (response.status >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    return response;
  } catch (error) {
    // Record network errors
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.end();
    throw error;
  }
}

// Usage in API client
export class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async get(endpoint, options = {}) {
    return tracedFetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: 'GET',
    });
  }

  async post(endpoint, body, options = {}) {
    return tracedFetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  }
}
```

## Instrumenting Native Module Calls

React Native's calls into native code can be a performance bottleneck, especially for legacy bridge modules or frequently called native APIs. Instrument native module calls to understand their overhead.

```javascript
// telemetry/nativeModuleTracer.js
import { NativeModules } from 'react-native';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { getTracer } from './config';

export function instrumentNativeModule(moduleName) {
  const module = NativeModules[moduleName];
  if (!module) {
    console.warn(`Native module ${moduleName} not found`);
    return module;
  }

  const tracer = getTracer();
  const instrumentedModule = {};

  // Wrap each method in the native module
  Object.keys(module).forEach(methodName => {
    const originalMethod = module[methodName];

    if (typeof originalMethod !== 'function') {
      instrumentedModule[methodName] = originalMethod;
      return;
    }

    instrumentedModule[methodName] = function(...args) {
      const span = tracer.startSpan(`NativeModule.${moduleName}.${methodName}`, {
        kind: SpanKind.CLIENT,
        attributes: {
          'native_module.name': moduleName,
          'native_module.method': methodName,
          'native_module.args_count': args.length,
        },
      });

      try {
        const result = originalMethod.apply(this, args);

        // Handle promise results
        if (result instanceof Promise) {
          return result
            .then(value => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return value;
            })
            .catch(error => {
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
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.end();
        throw error;
      }
    };
  });

  return instrumentedModule;
}

// Usage
const InstrumentedCalendarModule = instrumentNativeModule('CalendarModule');

// Now use InstrumentedCalendarModule instead of direct NativeModules.CalendarModule
async function createCalendarEvent(title, location) {
  await InstrumentedCalendarModule.createCalendarEvent(title, location);
}
```

## Performance Trace Flow

Here's how performance traces flow through a React Native application:

```mermaid
graph TD
    A[User Tap] --> B[Navigation.transition]
    B --> C[Screen.ProductDetails]
    C --> D[Component.mount]
    D --> E[Effect.fetchProductData]
    E --> F[HTTP GET /products/123]
    F --> G[Native Boundary Call]
    G --> H[NativeModule.NetworkRequest]
    E --> I[Component.render]
    I --> J[Effect.loadImages]
    J --> K[NativeModule.ImageCache]
```

## Best Practices for React Native Performance Monitoring

When monitoring React Native performance with OpenTelemetry, follow these practices:

**Focus on native boundary crossings**. Legacy bridge calls can be bottlenecks, and New Architecture native module calls can still become expensive when they are frequent or move large payloads. Track how often your app crosses the JavaScript/native boundary and how much data is passed.

**Monitor render performance**. Use spans to identify components that re-render excessively or take too long to render. This helps optimize React component design.

**Track animation performance**. React Native animations should run at 60fps. Instrument animation-related code to ensure smooth user experiences.

**Measure bundle load time**. Track how long it takes to load JavaScript bundles, especially on cold starts. Large bundles significantly impact startup performance.

**Use sampling for production**. Mobile devices have limited resources. Implement sampling to reduce telemetry overhead while maintaining visibility into performance issues.

**Correlate with native metrics**. Combine OpenTelemetry traces with native performance metrics like memory usage, CPU load, and frame drops for complete visibility.

Monitoring React Native applications with OpenTelemetry provides visibility into your app's performance across the JavaScript runtime, JavaScript/native communication, and native modules. This comprehensive instrumentation helps you deliver fast, responsive experiences to your users.
