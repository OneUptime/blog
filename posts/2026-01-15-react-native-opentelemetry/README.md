# How to Implement OpenTelemetry in React Native for Mobile Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, OpenTelemetry, Observability, Mobile Development, Monitoring, Tracing

Description: Learn how to implement OpenTelemetry in React Native applications for comprehensive mobile observability and distributed tracing.

---

Mobile applications present unique observability challenges. Unlike server-side applications where you control the environment, mobile apps run on countless device configurations, network conditions, and operating system versions. Understanding how your React Native application performs in the real world requires robust telemetry. OpenTelemetry provides a vendor-neutral, standardized approach to instrumenting your mobile applications for comprehensive observability.

In this guide, we will walk through implementing OpenTelemetry in a React Native application, covering everything from basic setup to advanced instrumentation patterns.

## What is OpenTelemetry?

OpenTelemetry (OTel) is an open-source observability framework that provides APIs, libraries, agents, and instrumentation to capture distributed traces, metrics, and logs from your applications. It is a Cloud Native Computing Foundation (CNCF) project that has become the industry standard for telemetry data collection.

For mobile applications, OpenTelemetry offers several key benefits:

- **Vendor neutrality**: Switch between observability backends without changing instrumentation code
- **Standardized semantics**: Consistent attribute names and conventions across services
- **Distributed tracing**: Track requests from mobile app through backend services
- **Context propagation**: Maintain trace context across network boundaries
- **Rich ecosystem**: Leverage community-built instrumentations and exporters

## Understanding Mobile Observability Challenges

Before diving into implementation, let us understand the unique challenges of mobile observability:

1. **Network variability**: Mobile devices operate on varying network conditions from WiFi to cellular
2. **Battery constraints**: Telemetry collection must be efficient to preserve battery life
3. **Offline scenarios**: Apps must handle telemetry when devices are offline
4. **Device diversity**: Different devices have varying CPU, memory, and storage capabilities
5. **App lifecycle**: Background/foreground transitions affect telemetry collection
6. **Data costs**: Users on limited data plans expect minimal overhead

## Setting Up the OpenTelemetry SDK

Let us start by installing the necessary packages for OpenTelemetry in your React Native project.

### Installation

```bash
# Core OpenTelemetry packages
npm install @opentelemetry/api
npm install @opentelemetry/sdk-trace-base
npm install @opentelemetry/sdk-trace-web
npm install @opentelemetry/resources
npm install @opentelemetry/semantic-conventions

# Exporters
npm install @opentelemetry/exporter-trace-otlp-http

# Additional instrumentations
npm install @opentelemetry/instrumentation-fetch
npm install @opentelemetry/instrumentation-xml-http-request
```

For React Native specific functionality, you may also need:

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-device-info
```

### Basic Configuration

Create a telemetry configuration file that initializes OpenTelemetry when your application starts:

```typescript
// src/telemetry/opentelemetry.ts
import { Resource } from '@opentelemetry/resources';
import {
  SemanticResourceAttributes,
  SemanticAttributes,
} from '@opentelemetry/semantic-conventions';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

// Configuration interface
interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint: string;
  enableBatching: boolean;
  batchSize?: number;
  batchDelay?: number;
}

class TelemetryService {
  private provider: BasicTracerProvider | null = null;
  private isInitialized: boolean = false;

  async initialize(config: TelemetryConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('Telemetry already initialized');
      return;
    }

    try {
      // Build resource attributes
      const resource = await this.buildResource(config);

      // Create the tracer provider
      this.provider = new BasicTracerProvider({
        resource,
      });

      // Configure the exporter
      const exporter = new OTLPTraceExporter({
        url: `${config.otlpEndpoint}/v1/traces`,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Choose processor based on configuration
      const processor = config.enableBatching
        ? new BatchSpanProcessor(exporter, {
            maxQueueSize: config.batchSize || 100,
            maxExportBatchSize: config.batchSize || 50,
            scheduledDelayMillis: config.batchDelay || 5000,
          })
        : new SimpleSpanProcessor(exporter);

      this.provider.addSpanProcessor(processor);

      // Register the provider globally
      this.provider.register();

      this.isInitialized = true;
      console.log('OpenTelemetry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  private async buildResource(config: TelemetryConfig): Promise<Resource> {
    // Gather device information
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceModel = DeviceInfo.getModel();
    const systemVersion = DeviceInfo.getSystemVersion();
    const appVersion = DeviceInfo.getVersion();
    const buildNumber = DeviceInfo.getBuildNumber();

    return new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,

      // Device attributes
      [SemanticResourceAttributes.DEVICE_ID]: deviceId,
      [SemanticResourceAttributes.DEVICE_MODEL_IDENTIFIER]: deviceModel,
      [SemanticResourceAttributes.OS_TYPE]: Platform.OS,
      [SemanticResourceAttributes.OS_VERSION]: systemVersion,

      // App attributes
      'app.version': appVersion,
      'app.build': buildNumber,
      'app.platform': Platform.OS,
    });
  }

  getTracer(name: string = 'react-native-app') {
    return trace.getTracer(name);
  }

  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.isInitialized = false;
    }
  }
}

export const telemetryService = new TelemetryService();
```

### Initializing in Your App

Initialize the telemetry service early in your application lifecycle:

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { telemetryService } from './src/telemetry/opentelemetry';

const App: React.FC = () => {
  const [telemetryReady, setTelemetryReady] = useState(false);

  useEffect(() => {
    const initTelemetry = async () => {
      try {
        await telemetryService.initialize({
          serviceName: 'my-react-native-app',
          serviceVersion: '1.0.0',
          environment: __DEV__ ? 'development' : 'production',
          otlpEndpoint: 'https://otlp.oneuptime.com',
          enableBatching: true,
          batchSize: 50,
          batchDelay: 10000,
        });
        setTelemetryReady(true);
      } catch (error) {
        console.error('Telemetry initialization failed:', error);
      }
    };

    initTelemetry();

    return () => {
      telemetryService.shutdown();
    };
  }, []);

  return (
    // Your app components
  );
};

export default App;
```

## Custom Span Creation

Creating custom spans allows you to trace specific operations in your application. Here is a utility class for managing spans:

```typescript
// src/telemetry/tracing.ts
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  SpanKind,
  Attributes,
} from '@opentelemetry/api';

interface SpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Attributes;
  parentSpan?: Span;
}

class TracingService {
  private getTracer() {
    return trace.getTracer('react-native-app');
  }

  /**
   * Start a new span for tracing an operation
   */
  startSpan(options: SpanOptions): Span {
    const tracer = this.getTracer();

    const spanContext = options.parentSpan
      ? trace.setSpan(context.active(), options.parentSpan)
      : context.active();

    return tracer.startSpan(
      options.name,
      {
        kind: options.kind || SpanKind.INTERNAL,
        attributes: options.attributes,
      },
      spanContext
    );
  }

  /**
   * Execute a function within a span context
   */
  async withSpan<T>(
    options: SpanOptions,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(options);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Synchronous version of withSpan
   */
  withSpanSync<T>(options: SpanOptions, fn: (span: Span) => T): T {
    const span = this.startSpan(options);

    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add event to the current active span
   */
  addEvent(name: string, attributes?: Attributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Set attributes on the current active span
   */
  setAttributes(attributes: Attributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }
}

export const tracingService = new TracingService();
```

### Using Custom Spans in Your Code

Here are practical examples of using custom spans:

```typescript
// Example: Tracing a database operation
import { tracingService } from './telemetry/tracing';
import { SpanKind } from '@opentelemetry/api';

async function fetchUserProfile(userId: string) {
  return tracingService.withSpan(
    {
      name: 'fetchUserProfile',
      kind: SpanKind.CLIENT,
      attributes: {
        'user.id': userId,
        'db.operation': 'SELECT',
        'db.table': 'users',
      },
    },
    async (span) => {
      // Add event for query start
      span.addEvent('query_start');

      const user = await database.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      // Add result attributes
      span.setAttribute('user.found', !!user);

      span.addEvent('query_complete', {
        'result.count': user ? 1 : 0,
      });

      return user;
    }
  );
}

// Example: Tracing a complex business operation
async function processOrder(orderId: string) {
  return tracingService.withSpan(
    {
      name: 'processOrder',
      attributes: {
        'order.id': orderId,
      },
    },
    async (parentSpan) => {
      // Validate order
      await tracingService.withSpan(
        {
          name: 'validateOrder',
          parentSpan,
        },
        async (span) => {
          const isValid = await validateOrderDetails(orderId);
          span.setAttribute('order.valid', isValid);
          if (!isValid) {
            throw new Error('Order validation failed');
          }
        }
      );

      // Process payment
      await tracingService.withSpan(
        {
          name: 'processPayment',
          parentSpan,
          kind: SpanKind.CLIENT,
        },
        async (span) => {
          const paymentResult = await paymentService.charge(orderId);
          span.setAttribute('payment.status', paymentResult.status);
          span.setAttribute('payment.transaction_id', paymentResult.transactionId);
        }
      );

      // Update inventory
      await tracingService.withSpan(
        {
          name: 'updateInventory',
          parentSpan,
        },
        async (span) => {
          const itemsUpdated = await inventoryService.decrementStock(orderId);
          span.setAttribute('inventory.items_updated', itemsUpdated);
        }
      );

      parentSpan.addEvent('order_processed_successfully');
    }
  );
}
```

## Tracing Network Requests

Network request tracing is crucial for understanding API performance and debugging issues. Here is a comprehensive fetch wrapper:

```typescript
// src/telemetry/network.ts
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  propagation,
} from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface TracedResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  duration: number;
}

class NetworkTracer {
  private getTracer() {
    return trace.getTracer('http-client');
  }

  /**
   * Make a traced HTTP request
   */
  async request<T = any>(config: RequestConfig): Promise<TracedResponse<T>> {
    const tracer = this.getTracer();
    const url = new URL(config.url);
    const method = (config.method || 'GET').toUpperCase();

    const span = tracer.startSpan(`HTTP ${method}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SemanticAttributes.HTTP_METHOD]: method,
        [SemanticAttributes.HTTP_URL]: config.url,
        [SemanticAttributes.HTTP_HOST]: url.host,
        [SemanticAttributes.HTTP_SCHEME]: url.protocol.replace(':', ''),
        [SemanticAttributes.HTTP_TARGET]: url.pathname + url.search,
        [SemanticAttributes.NET_PEER_NAME]: url.hostname,
        [SemanticAttributes.NET_PEER_PORT]: url.port || (url.protocol === 'https:' ? 443 : 80),
      },
    });

    const startTime = performance.now();

    try {
      // Inject trace context into headers for distributed tracing
      const headers: Record<string, string> = {
        ...config.headers,
      };

      // Propagate trace context
      propagation.inject(context.active(), headers);

      span.addEvent('request_start');

      const response = await fetch(config.url, {
        method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      const duration = performance.now() - startTime;

      // Set response attributes
      span.setAttributes({
        [SemanticAttributes.HTTP_STATUS_CODE]: response.status,
        'http.response_content_length': response.headers.get('content-length') || 0,
        'http.duration_ms': duration,
      });

      // Check for error status codes
      if (response.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.addEvent('response_received', {
        'http.status_code': response.status,
      });

      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Network request failed',
      });

      span.recordException(error as Error);

      span.setAttributes({
        'http.duration_ms': duration,
        'error.type': error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    } finally {
      span.end();
    }
  }

  // Convenience methods
  async get<T>(url: string, headers?: Record<string, string>): Promise<TracedResponse<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  async post<T>(url: string, body: any, headers?: Record<string, string>): Promise<TracedResponse<T>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  async put<T>(url: string, body: any, headers?: Record<string, string>): Promise<TracedResponse<T>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<TracedResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }
}

export const networkTracer = new NetworkTracer();
```

## User Interaction Tracing

Tracking user interactions helps understand user behavior and identify UX issues:

```typescript
// src/telemetry/interactions.ts
import { trace, SpanKind } from '@opentelemetry/api';
import { tracingService } from './tracing';

type InteractionType = 'tap' | 'long_press' | 'swipe' | 'scroll' | 'input' | 'gesture';

interface InteractionOptions {
  type: InteractionType;
  target: string;
  screen: string;
  attributes?: Record<string, any>;
}

class InteractionTracer {
  private getTracer() {
    return trace.getTracer('user-interactions');
  }

  /**
   * Track a user interaction
   */
  trackInteraction(options: InteractionOptions): void {
    const tracer = this.getTracer();

    const span = tracer.startSpan(`user_interaction.${options.type}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'interaction.type': options.type,
        'interaction.target': options.target,
        'interaction.screen': options.screen,
        'interaction.timestamp': Date.now(),
        ...options.attributes,
      },
    });

    span.end();
  }

  /**
   * Track button tap with automatic span creation
   */
  trackButtonTap(buttonId: string, screen: string, additionalAttributes?: Record<string, any>): void {
    this.trackInteraction({
      type: 'tap',
      target: buttonId,
      screen,
      attributes: {
        'ui.element_type': 'button',
        ...additionalAttributes,
      },
    });
  }

  /**
   * Track text input interaction
   */
  trackTextInput(inputId: string, screen: string, fieldType?: string): void {
    this.trackInteraction({
      type: 'input',
      target: inputId,
      screen,
      attributes: {
        'ui.element_type': 'text_input',
        'input.field_type': fieldType,
      },
    });
  }

  /**
   * Track scroll events
   */
  trackScroll(containerId: string, screen: string, direction: 'up' | 'down' | 'left' | 'right', offset?: number): void {
    this.trackInteraction({
      type: 'scroll',
      target: containerId,
      screen,
      attributes: {
        'scroll.direction': direction,
        'scroll.offset': offset,
      },
    });
  }

  /**
   * Create a higher-order component wrapper for tracking
   */
  createTapHandler<T extends (...args: any[]) => any>(
    handler: T,
    buttonId: string,
    screen: string
  ): T {
    return ((...args: Parameters<T>) => {
      this.trackButtonTap(buttonId, screen);
      return handler(...args);
    }) as T;
  }
}

export const interactionTracer = new InteractionTracer();
```

### React Hooks for Interaction Tracking

Create custom hooks to simplify interaction tracking in components:

```typescript
// src/hooks/useTrackedInteraction.ts
import { useCallback } from 'react';
import { interactionTracer } from '../telemetry/interactions';

interface UseTrackedPressOptions {
  buttonId: string;
  screen: string;
  attributes?: Record<string, any>;
}

export function useTrackedPress(
  onPress: () => void,
  options: UseTrackedPressOptions
) {
  return useCallback(() => {
    interactionTracer.trackButtonTap(
      options.buttonId,
      options.screen,
      options.attributes
    );
    onPress();
  }, [onPress, options.buttonId, options.screen, options.attributes]);
}

// Usage in a component
import { useTrackedPress } from '../hooks/useTrackedInteraction';

const MyComponent: React.FC = () => {
  const handleSubmit = useTrackedPress(
    () => {
      // Submit logic
    },
    {
      buttonId: 'submit-button',
      screen: 'checkout',
      attributes: {
        'button.label': 'Complete Purchase',
      },
    }
  );

  return (
    <TouchableOpacity onPress={handleSubmit}>
      <Text>Complete Purchase</Text>
    </TouchableOpacity>
  );
};
```

## Screen View Tracking

Tracking screen views provides insights into user navigation patterns:

```typescript
// src/telemetry/screens.ts
import { trace, SpanKind, Span, context } from '@opentelemetry/api';

interface ScreenViewOptions {
  screenName: string;
  screenClass?: string;
  previousScreen?: string;
  params?: Record<string, any>;
}

class ScreenTracer {
  private activeScreenSpan: Span | null = null;
  private screenHistory: string[] = [];

  private getTracer() {
    return trace.getTracer('screen-views');
  }

  /**
   * Track screen view start
   */
  trackScreenView(options: ScreenViewOptions): void {
    // End previous screen span if exists
    if (this.activeScreenSpan) {
      this.activeScreenSpan.addEvent('screen_hidden');
      this.activeScreenSpan.end();
    }

    const tracer = this.getTracer();

    this.activeScreenSpan = tracer.startSpan(`screen.${options.screenName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'screen.name': options.screenName,
        'screen.class': options.screenClass || options.screenName,
        'screen.previous': options.previousScreen || this.screenHistory[this.screenHistory.length - 1],
        'screen.view_timestamp': Date.now(),
        'screen.history_depth': this.screenHistory.length,
        ...this.flattenParams(options.params),
      },
    });

    this.activeScreenSpan.addEvent('screen_visible');

    // Update history
    this.screenHistory.push(options.screenName);
    if (this.screenHistory.length > 50) {
      this.screenHistory.shift();
    }
  }

  /**
   * Track screen exit
   */
  trackScreenExit(screenName: string, exitReason?: string): void {
    if (this.activeScreenSpan) {
      this.activeScreenSpan.addEvent('screen_exit', {
        'exit.reason': exitReason,
        'exit.timestamp': Date.now(),
      });
    }
  }

  /**
   * Track time spent on screen
   */
  trackScreenDuration(screenName: string, durationMs: number): void {
    const tracer = this.getTracer();
    const span = tracer.startSpan('screen.duration', {
      attributes: {
        'screen.name': screenName,
        'screen.duration_ms': durationMs,
        'screen.duration_seconds': Math.round(durationMs / 1000),
      },
    });
    span.end();
  }

  private flattenParams(params?: Record<string, any>): Record<string, any> {
    if (!params) return {};

    const flattened: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object') {
        flattened[`screen.param.${key}`] = JSON.stringify(value);
      } else {
        flattened[`screen.param.${key}`] = value;
      }
    }
    return flattened;
  }

  /**
   * Get current screen name
   */
  getCurrentScreen(): string | undefined {
    return this.screenHistory[this.screenHistory.length - 1];
  }

  /**
   * Get screen navigation history
   */
  getScreenHistory(): string[] {
    return [...this.screenHistory];
  }
}

export const screenTracer = new ScreenTracer();
```

### Integration with React Navigation

Integrate screen tracking with React Navigation:

```typescript
// src/navigation/NavigationContainer.tsx
import React, { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { screenTracer } from '../telemetry/screens';

const AppNavigationContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string>();

  const handleStateChange = () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (currentRouteName && previousRouteName !== currentRouteName) {
      screenTracer.trackScreenView({
        screenName: currentRouteName,
        previousScreen: previousRouteName,
        params: navigationRef.current?.getCurrentRoute()?.params,
      });
    }

    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
        if (routeNameRef.current) {
          screenTracer.trackScreenView({
            screenName: routeNameRef.current,
          });
        }
      }}
      onStateChange={handleStateChange}
    >
      {children}
    </NavigationContainer>
  );
};

export default AppNavigationContainer;
```

## Resource Attributes

Resource attributes provide context about the application and device:

```typescript
// src/telemetry/resources.ts
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import DeviceInfo from 'react-native-device-info';
import { Platform, Dimensions, PixelRatio } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface DeviceResources {
  deviceId: string;
  deviceModel: string;
  deviceManufacturer: string;
  systemName: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  isEmulator: boolean;
  hasNotch: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

async function gatherDeviceResources(): Promise<DeviceResources> {
  const [
    deviceId,
    isEmulator,
    hasNotch,
  ] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.isEmulator(),
    DeviceInfo.hasNotch(),
  ]);

  const { width, height } = Dimensions.get('window');

  return {
    deviceId,
    deviceModel: DeviceInfo.getModel(),
    deviceManufacturer: DeviceInfo.getManufacturer(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    appVersion: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    bundleId: DeviceInfo.getBundleId(),
    isEmulator,
    hasNotch,
    screenWidth: width,
    screenHeight: height,
    pixelRatio: PixelRatio.get(),
  };
}

export async function createMobileResource(
  serviceName: string,
  serviceVersion: string,
  environment: string
): Promise<Resource> {
  const device = await gatherDeviceResources();
  const networkState = await NetInfo.fetch();

  return new Resource({
    // Service identification
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,

    // Device information
    [SemanticResourceAttributes.DEVICE_ID]: device.deviceId,
    [SemanticResourceAttributes.DEVICE_MODEL_IDENTIFIER]: device.deviceModel,
    [SemanticResourceAttributes.DEVICE_MANUFACTURER]: device.deviceManufacturer,

    // OS information
    [SemanticResourceAttributes.OS_TYPE]: Platform.OS,
    [SemanticResourceAttributes.OS_NAME]: device.systemName,
    [SemanticResourceAttributes.OS_VERSION]: device.systemVersion,

    // App information
    'app.version': device.appVersion,
    'app.build': device.buildNumber,
    'app.bundle_id': device.bundleId,
    'app.platform': Platform.OS,

    // Device capabilities
    'device.is_emulator': device.isEmulator,
    'device.has_notch': device.hasNotch,
    'device.screen_width': device.screenWidth,
    'device.screen_height': device.screenHeight,
    'device.pixel_ratio': device.pixelRatio,

    // Network information
    'network.type': networkState.type,
    'network.is_connected': networkState.isConnected,
    'network.is_wifi': networkState.type === 'wifi',
    'network.is_cellular': networkState.type === 'cellular',
  });
}
```

## Exporter Configuration

Configure different exporters for various observability backends:

```typescript
// src/telemetry/exporters.ts
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  SpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';

interface ExporterConfig {
  type: 'otlp' | 'console' | 'custom';
  endpoint?: string;
  headers?: Record<string, string>;
  batching?: {
    enabled: boolean;
    maxQueueSize?: number;
    maxExportBatchSize?: number;
    scheduledDelayMillis?: number;
    exportTimeoutMillis?: number;
  };
}

export function createExporter(config: ExporterConfig): SpanProcessor {
  let exporter;

  switch (config.type) {
    case 'otlp':
      if (!config.endpoint) {
        throw new Error('OTLP endpoint is required');
      }
      exporter = new OTLPTraceExporter({
        url: config.endpoint,
        headers: config.headers,
      });
      break;

    case 'console':
      exporter = new ConsoleSpanExporter();
      break;

    default:
      throw new Error(`Unknown exporter type: ${config.type}`);
  }

  if (config.batching?.enabled) {
    return new BatchSpanProcessor(exporter, {
      maxQueueSize: config.batching.maxQueueSize || 2048,
      maxExportBatchSize: config.batching.maxExportBatchSize || 512,
      scheduledDelayMillis: config.batching.scheduledDelayMillis || 5000,
      exportTimeoutMillis: config.batching.exportTimeoutMillis || 30000,
    });
  }

  return new SimpleSpanProcessor(exporter);
}

// Production configuration for OneUptime
export function createOneUptimeExporter(apiKey: string): SpanProcessor {
  return createExporter({
    type: 'otlp',
    endpoint: 'https://otlp.oneuptime.com/v1/traces',
    headers: {
      'x-oneuptime-token': apiKey,
      'Content-Type': 'application/json',
    },
    batching: {
      enabled: true,
      maxQueueSize: 1000,
      maxExportBatchSize: 100,
      scheduledDelayMillis: 10000,
    },
  });
}
```

## Connecting to OneUptime

OneUptime provides a comprehensive observability platform. Here is how to configure OpenTelemetry to send data to OneUptime:

```typescript
// src/telemetry/oneuptime.ts
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { trace } from '@opentelemetry/api';
import { createMobileResource } from './resources';

interface OneUptimeConfig {
  apiToken: string;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
}

class OneUptimeTelemetry {
  private provider: BasicTracerProvider | null = null;

  async initialize(config: OneUptimeConfig): Promise<void> {
    // Create resource with mobile-specific attributes
    const resource = await createMobileResource(
      config.serviceName,
      config.serviceVersion,
      config.environment
    );

    // Create provider
    this.provider = new BasicTracerProvider({
      resource,
    });

    // Configure OneUptime exporter
    const exporter = new OTLPTraceExporter({
      url: config.endpoint || 'https://otlp.oneuptime.com/v1/traces',
      headers: {
        'x-oneuptime-token': config.apiToken,
        'Content-Type': 'application/json',
      },
    });

    // Use batch processor for efficiency
    const processor = new BatchSpanProcessor(exporter, {
      maxQueueSize: 1000,
      maxExportBatchSize: 100,
      scheduledDelayMillis: 10000, // Send every 10 seconds
      exportTimeoutMillis: 30000,
    });

    this.provider.addSpanProcessor(processor);
    this.provider.register();

    console.log('OneUptime telemetry initialized');
  }

  getTracer(name: string = 'oneuptime-mobile') {
    return trace.getTracer(name);
  }

  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
    }
  }
}

export const oneUptimeTelemetry = new OneUptimeTelemetry();

// Usage
oneUptimeTelemetry.initialize({
  apiToken: 'your-oneuptime-api-token',
  serviceName: 'my-mobile-app',
  serviceVersion: '1.0.0',
  environment: 'production',
});
```

## Performance Considerations

Mobile devices have limited resources. Here are strategies to minimize telemetry overhead:

```typescript
// src/telemetry/performance.ts
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PerformanceConfig {
  enableInBackground: boolean;
  minBatteryLevel: number;
  wifiOnlyExport: boolean;
  maxStoredSpans: number;
  samplingRate: number;
}

class PerformanceOptimizer {
  private config: PerformanceConfig;
  private isBackground: boolean = false;
  private networkState: NetInfoState | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableInBackground: false,
      minBatteryLevel: 20,
      wifiOnlyExport: false,
      maxStoredSpans: 1000,
      samplingRate: 1.0,
      ...config,
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    // Monitor app state
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Monitor network state
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
  }

  private handleAppStateChange(state: AppStateStatus): void {
    this.isBackground = state !== 'active';
  }

  private handleNetworkChange(state: NetInfoState): void {
    this.networkState = state;
  }

  /**
   * Check if telemetry should be collected
   */
  shouldCollectTelemetry(): boolean {
    // Respect sampling rate
    if (Math.random() > this.config.samplingRate) {
      return false;
    }

    // Check background state
    if (this.isBackground && !this.config.enableInBackground) {
      return false;
    }

    return true;
  }

  /**
   * Check if telemetry should be exported
   */
  shouldExportTelemetry(): boolean {
    // Check network connectivity
    if (!this.networkState?.isConnected) {
      return false;
    }

    // Check WiFi-only setting
    if (this.config.wifiOnlyExport && this.networkState.type !== 'wifi') {
      return false;
    }

    return true;
  }

  /**
   * Get optimized batch settings based on conditions
   */
  getOptimizedBatchSettings() {
    const isWifi = this.networkState?.type === 'wifi';
    const isBackground = this.isBackground;

    return {
      maxQueueSize: isBackground ? 500 : 1000,
      maxExportBatchSize: isWifi ? 100 : 50,
      scheduledDelayMillis: isWifi ? 5000 : 15000,
    };
  }
}

export const performanceOptimizer = new PerformanceOptimizer({
  samplingRate: 0.8, // Sample 80% of traces
  wifiOnlyExport: false,
  enableInBackground: false,
});
```

### Offline Telemetry Storage

Handle offline scenarios by storing telemetry locally:

```typescript
// src/telemetry/offline.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

const OFFLINE_SPANS_KEY = '@telemetry/offline_spans';
const MAX_STORED_SPANS = 500;

interface StoredSpan {
  id: string;
  data: any;
  timestamp: number;
}

class OfflineStorage {
  private pendingSpans: StoredSpan[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.setupNetworkListener();
    this.loadStoredSpans();
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Flush stored spans when coming back online
      if (wasOffline && this.isOnline) {
        this.flushStoredSpans();
      }
    });
  }

  private async loadStoredSpans(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_SPANS_KEY);
      if (stored) {
        this.pendingSpans = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stored spans:', error);
    }
  }

  async storeSpan(span: ReadableSpan): Promise<void> {
    const storedSpan: StoredSpan = {
      id: span.spanContext().spanId,
      data: this.serializeSpan(span),
      timestamp: Date.now(),
    };

    this.pendingSpans.push(storedSpan);

    // Limit storage size
    if (this.pendingSpans.length > MAX_STORED_SPANS) {
      this.pendingSpans = this.pendingSpans.slice(-MAX_STORED_SPANS);
    }

    await this.persistSpans();
  }

  private serializeSpan(span: ReadableSpan): any {
    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      name: span.name,
      kind: span.kind,
      startTime: span.startTime,
      endTime: span.endTime,
      attributes: span.attributes,
      status: span.status,
      events: span.events,
    };
  }

  private async persistSpans(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        OFFLINE_SPANS_KEY,
        JSON.stringify(this.pendingSpans)
      );
    } catch (error) {
      console.error('Failed to persist spans:', error);
    }
  }

  async flushStoredSpans(): Promise<StoredSpan[]> {
    const spans = [...this.pendingSpans];
    this.pendingSpans = [];
    await AsyncStorage.removeItem(OFFLINE_SPANS_KEY);
    return spans;
  }

  getStoredSpanCount(): number {
    return this.pendingSpans.length;
  }
}

export const offlineStorage = new OfflineStorage();
```

## Best Practices for Mobile Telemetry

### 1. Use Meaningful Span Names

```typescript
// Good: Descriptive and consistent naming
tracer.startSpan('user.login');
tracer.startSpan('order.checkout');
tracer.startSpan('api.fetchProducts');

// Bad: Vague or inconsistent naming
tracer.startSpan('operation1');
tracer.startSpan('doSomething');
```

### 2. Add Contextual Attributes

```typescript
// Include relevant context for debugging
span.setAttributes({
  'user.id': userId,
  'user.subscription_tier': 'premium',
  'feature.flag.new_checkout': true,
  'app.session_id': sessionId,
});
```

### 3. Handle Errors Properly

```typescript
try {
  await performOperation();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);

  // Add error-specific attributes
  span.setAttributes({
    'error.type': error.name,
    'error.stack': error.stack?.substring(0, 500),
  });

  throw error;
} finally {
  span.end();
}
```

### 4. Implement Sampling for High-Volume Apps

```typescript
// src/telemetry/sampling.ts
import { Sampler, SamplingResult, SamplingDecision } from '@opentelemetry/sdk-trace-base';

class AdaptiveSampler implements Sampler {
  private baseSampleRate: number;
  private currentRate: number;

  constructor(baseSampleRate: number = 0.1) {
    this.baseSampleRate = baseSampleRate;
    this.currentRate = baseSampleRate;
  }

  shouldSample(): SamplingResult {
    const decision = Math.random() < this.currentRate
      ? SamplingDecision.RECORD_AND_SAMPLED
      : SamplingDecision.NOT_RECORD;

    return {
      decision,
      attributes: {
        'sampling.rate': this.currentRate,
      },
    };
  }

  // Adjust sampling rate based on conditions
  adjustRate(factor: number): void {
    this.currentRate = Math.min(1, Math.max(0.01, this.baseSampleRate * factor));
  }

  toString(): string {
    return `AdaptiveSampler{rate=${this.currentRate}}`;
  }
}
```

### 5. Respect User Privacy

```typescript
// Sanitize sensitive data before adding to spans
function sanitizeAttributes(attrs: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'secret', 'credit_card', 'ssn'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(attrs)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

### 6. Monitor Telemetry Health

```typescript
// Track telemetry system health
class TelemetryHealthMonitor {
  private exportSuccessCount: number = 0;
  private exportFailureCount: number = 0;
  private droppedSpanCount: number = 0;

  recordExportSuccess(spanCount: number): void {
    this.exportSuccessCount += spanCount;
  }

  recordExportFailure(spanCount: number): void {
    this.exportFailureCount += spanCount;
  }

  recordDroppedSpans(count: number): void {
    this.droppedSpanCount += count;
  }

  getHealthMetrics() {
    const total = this.exportSuccessCount + this.exportFailureCount;
    return {
      successRate: total > 0 ? this.exportSuccessCount / total : 1,
      totalExported: this.exportSuccessCount,
      totalFailed: this.exportFailureCount,
      totalDropped: this.droppedSpanCount,
    };
  }
}
```

## Complete Integration Example

Here is a complete example bringing all the concepts together:

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { oneUptimeTelemetry } from './telemetry/oneuptime';
import { screenTracer } from './telemetry/screens';
import { interactionTracer } from './telemetry/interactions';
import { performanceOptimizer } from './telemetry/performance';
import AppNavigationContainer from './navigation/NavigationContainer';
import { config } from './config';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize telemetry
    oneUptimeTelemetry.initialize({
      apiToken: config.oneUptimeApiToken,
      serviceName: 'my-react-native-app',
      serviceVersion: config.appVersion,
      environment: config.environment,
    });

    return () => {
      oneUptimeTelemetry.shutdown();
    };
  }, []);

  return (
    <AppNavigationContainer>
      {/* Your app screens */}
    </AppNavigationContainer>
  );
};

export default App;
```

## Conclusion

Implementing OpenTelemetry in your React Native application provides invaluable insights into how your app performs in the real world. By following this guide, you have learned how to:

- Set up the OpenTelemetry SDK for React Native
- Create custom spans for tracing operations
- Instrument network requests with trace context propagation
- Track user interactions and screen views
- Configure resource attributes for mobile context
- Connect to OneUptime for centralized observability
- Optimize telemetry for mobile performance constraints

Remember that good observability is not just about collecting data; it is about collecting the right data efficiently. Start with the essential traces, monitor your app's health, and gradually expand your instrumentation based on what you learn.

With OpenTelemetry and OneUptime, you have a powerful combination for understanding and improving your React Native application's performance and user experience.

## Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
- [OneUptime Documentation](https://docs.oneuptime.com/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

By implementing comprehensive telemetry in your React Native app, you gain the visibility needed to deliver exceptional mobile experiences to your users.
