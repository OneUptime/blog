# How to Implement Real User Monitoring (RUM) in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, RUM, Real User Monitoring, Performance, Mobile Development, Analytics

Description: Learn how to implement Real User Monitoring in React Native to understand actual user experience and performance.

---

## Introduction

Building a React Native application is only half the battle. Understanding how your app performs in the hands of real users across thousands of different devices, network conditions, and usage patterns is where the real challenge begins. This is where Real User Monitoring (RUM) becomes indispensable.

Unlike synthetic monitoring that runs scripted tests in controlled environments, RUM captures actual user interactions and performance metrics from production. It gives you visibility into what your users actually experience, not what you hope they experience.

In this comprehensive guide, we will explore how to implement RUM in React Native applications, from understanding the fundamental concepts to building a complete monitoring solution that provides actionable insights.

## What is Real User Monitoring (RUM)?

Real User Monitoring is a passive monitoring technique that captures and analyzes every transaction made by users of a website or application. In the context of React Native, RUM involves collecting performance data, user interactions, errors, and session information from your mobile app as real users interact with it.

### Core Components of RUM

RUM typically captures the following types of data:

1. **Performance Metrics**: App startup time, screen load times, frame rates, and response times
2. **User Sessions**: Session duration, user journeys, and interaction patterns
3. **Device Information**: Device type, OS version, screen size, and memory usage
4. **Network Data**: API response times, request failures, and bandwidth usage
5. **Error Tracking**: JavaScript errors, native crashes, and unhandled exceptions
6. **Custom Events**: Business-specific metrics and user actions

### Why RUM Matters for React Native Apps

React Native applications face unique challenges that make RUM essential:

```typescript
// Consider the diversity of environments your app runs in
const environmentFactors = {
  devices: 'Thousands of Android and iOS devices',
  osVersions: 'Multiple OS versions with different behaviors',
  networkConditions: '2G, 3G, 4G, 5G, WiFi, offline',
  userBehaviors: 'Infinite variations in how users interact',
  geographicLocations: 'Global distribution with varying latency',
};
```

Without RUM, you are essentially flying blind, making decisions based on assumptions rather than data.

## RUM vs Synthetic Monitoring

Understanding the difference between RUM and synthetic monitoring helps you know when to use each approach.

### Synthetic Monitoring

Synthetic monitoring uses scripted tests that simulate user interactions from controlled locations:

```typescript
// Synthetic monitoring example - scripted test
const syntheticTest = {
  name: 'Login Flow Test',
  steps: [
    { action: 'navigate', target: 'LoginScreen' },
    { action: 'type', target: 'emailInput', value: 'test@example.com' },
    { action: 'type', target: 'passwordInput', value: 'password123' },
    { action: 'tap', target: 'loginButton' },
    { action: 'waitFor', target: 'HomeScreen', timeout: 5000 },
  ],
  runFrequency: '5 minutes',
  locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
};
```

**Pros of Synthetic Monitoring:**
- Consistent baseline measurements
- Proactive issue detection
- Works before users encounter problems
- Controlled test conditions

**Cons of Synthetic Monitoring:**
- Does not capture real user experience
- Limited device and network coverage
- Cannot detect issues in complex user flows
- May miss edge cases

### Real User Monitoring

RUM captures data from actual user sessions:

```typescript
// RUM captures real-world diversity
interface RUMSession {
  userId: string;
  sessionId: string;
  device: {
    model: string;        // e.g., "iPhone 14 Pro", "Samsung Galaxy S23"
    os: string;           // e.g., "iOS 17.2", "Android 14"
    screenSize: string;   // e.g., "1170x2532"
    memoryTotal: number;  // Actual device memory
  };
  network: {
    type: string;         // e.g., "4G", "WiFi"
    effectiveType: string;// e.g., "4g", "3g"
    downlink: number;     // Actual bandwidth
  };
  location: {
    country: string;
    region: string;
  };
  events: RUMEvent[];
  errors: RUMError[];
  performance: PerformanceMetrics;
}
```

**Pros of RUM:**
- Reflects actual user experience
- Captures diverse real-world conditions
- Identifies issues across device types
- Provides business context

**Cons of RUM:**
- Requires actual traffic
- Can be noisy with outliers
- Privacy considerations
- More complex to implement

### When to Use Each

| Scenario | Recommended Approach |
|----------|---------------------|
| Pre-launch testing | Synthetic |
| Production monitoring | RUM |
| SLA compliance | Both |
| Performance regression detection | Both |
| User experience optimization | RUM |
| API endpoint monitoring | Synthetic |
| Understanding user journeys | RUM |

## Key RUM Metrics for Mobile Apps

Before implementing RUM, you need to understand which metrics matter most for React Native applications.

### App Startup Metrics

```typescript
interface StartupMetrics {
  // Time from app launch to first frame rendered
  coldStartTime: number;

  // Time from background to foreground
  warmStartTime: number;

  // Time to first meaningful paint
  timeToFirstMeaningfulPaint: number;

  // Time to interactive (app responds to input)
  timeToInteractive: number;

  // JavaScript bundle load time
  jsBundleLoadTime: number;

  // Native module initialization time
  nativeModuleInitTime: number;
}
```

### Screen Performance Metrics

```typescript
interface ScreenMetrics {
  screenName: string;

  // Time to render the screen
  renderTime: number;

  // Time to become interactive
  interactiveTime: number;

  // Frame rate during transitions
  transitionFps: number;

  // Time spent on screen
  dwellTime: number;

  // Memory usage delta
  memoryDelta: number;
}
```

### User Interaction Metrics

```typescript
interface InteractionMetrics {
  // Time from touch to response
  touchResponseTime: number;

  // Scroll performance (frames per second)
  scrollFps: number;

  // Animation smoothness
  animationFps: number;

  // Gesture recognition latency
  gestureLatency: number;
}
```

### Network Metrics

```typescript
interface NetworkMetrics {
  // API request duration
  requestDuration: number;

  // Time to first byte
  ttfb: number;

  // Download size
  responseSize: number;

  // Request success rate
  successRate: number;

  // Retry count
  retryCount: number;
}
```

## Implementing RUM Collection in React Native

Now let us build a comprehensive RUM implementation for React Native.

### Project Setup

First, create the core RUM module structure:

```typescript
// src/rum/index.ts
export { RUMProvider, useRUM } from './RUMContext';
export { RUMCollector } from './RUMCollector';
export { SessionManager } from './SessionManager';
export { PerformanceTracker } from './PerformanceTracker';
export { NetworkInterceptor } from './NetworkInterceptor';
export { ErrorTracker } from './ErrorTracker';
export type { RUMConfig, RUMEvent, RUMSession } from './types';
```

### Core Types Definition

```typescript
// src/rum/types.ts
export interface RUMConfig {
  apiEndpoint: string;
  apiKey: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  sampleRate: number; // 0-1, percentage of sessions to track
  batchSize: number;
  flushInterval: number; // milliseconds
  enableNetworkTracking: boolean;
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  customAttributes?: Record<string, string>;
}

export interface RUMEvent {
  id: string;
  type: RUMEventType;
  name: string;
  timestamp: number;
  sessionId: string;
  viewId: string;
  attributes: Record<string, unknown>;
  duration?: number;
}

export type RUMEventType =
  | 'view'
  | 'action'
  | 'resource'
  | 'error'
  | 'long_task'
  | 'custom';

export interface RUMSession {
  id: string;
  userId?: string;
  startTime: number;
  lastActivityTime: number;
  isActive: boolean;
  device: DeviceInfo;
  app: AppInfo;
  events: RUMEvent[];
}

export interface DeviceInfo {
  model: string;
  brand: string;
  os: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  totalMemory: number;
  isEmulator: boolean;
}

export interface AppInfo {
  version: string;
  buildNumber: string;
  bundleId: string;
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}
```

### Session Manager Implementation

```typescript
// src/rum/SessionManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { v4 as uuidv4 } from 'uuid';
import type { RUMSession, DeviceInfo as DeviceInfoType, AppInfo } from './types';

const SESSION_STORAGE_KEY = '@rum_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export class SessionManager {
  private currentSession: RUMSession | null = null;
  private sessionListeners: Set<(session: RUMSession) => void> = new Set();

  async initialize(): Promise<RUMSession> {
    // Try to restore existing session
    const storedSession = await this.restoreSession();

    if (storedSession && this.isSessionValid(storedSession)) {
      this.currentSession = storedSession;
      this.updateLastActivity();
    } else {
      this.currentSession = await this.createNewSession();
    }

    return this.currentSession;
  }

  private async restoreSession(): Promise<RUMSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (error) {
      console.warn('Failed to restore RUM session:', error);
    }
    return null;
  }

  private isSessionValid(session: RUMSession): boolean {
    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivityTime;
    return timeSinceLastActivity < SESSION_TIMEOUT && session.isActive;
  }

  private async createNewSession(): Promise<RUMSession> {
    const deviceInfo = await this.collectDeviceInfo();
    const appInfo = await this.collectAppInfo();

    const session: RUMSession = {
      id: uuidv4(),
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      isActive: true,
      device: deviceInfo,
      app: appInfo,
      events: [],
    };

    await this.persistSession(session);
    this.notifyListeners(session);

    return session;
  }

  private async collectDeviceInfo(): Promise<DeviceInfoType> {
    const [
      model,
      brand,
      osVersion,
      totalMemory,
      isEmulator,
    ] = await Promise.all([
      DeviceInfo.getModel(),
      DeviceInfo.getBrand(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getTotalMemory(),
      DeviceInfo.isEmulator(),
    ]);

    const { width, height } = require('react-native').Dimensions.get('window');
    const pixelRatio = require('react-native').PixelRatio.get();

    return {
      model,
      brand,
      os: Platform.OS,
      osVersion,
      screenWidth: width,
      screenHeight: height,
      pixelRatio,
      totalMemory,
      isEmulator,
    };
  }

  private async collectAppInfo(): Promise<AppInfo> {
    const [version, buildNumber, bundleId] = await Promise.all([
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getBundleId(),
    ]);

    return { version, buildNumber, bundleId };
  }

  private async persistSession(session: RUMSession): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist RUM session:', error);
    }
  }

  getSession(): RUMSession | null {
    return this.currentSession;
  }

  getSessionId(): string | null {
    return this.currentSession?.id ?? null;
  }

  async setUserId(userId: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.userId = userId;
      await this.persistSession(this.currentSession);
    }
  }

  updateLastActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivityTime = Date.now();
    }
  }

  async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      await this.persistSession(this.currentSession);
      this.currentSession = null;
    }
  }

  addSessionListener(listener: (session: RUMSession) => void): () => void {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }

  private notifyListeners(session: RUMSession): void {
    this.sessionListeners.forEach(listener => listener(session));
  }
}
```

### Performance Tracker Implementation

```typescript
// src/rum/PerformanceTracker.ts
import { InteractionManager, NativeModules, Platform } from 'react-native';
import type { PerformanceEntry, RUMEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

interface PerformanceMark {
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceTracker {
  private marks: Map<string, PerformanceMark> = new Map();
  private entries: PerformanceEntry[] = [];
  private frameCallback: number | null = null;
  private frameTimestamps: number[] = [];
  private onEventCallback: ((event: RUMEvent) => void) | null = null;

  constructor(onEvent?: (event: RUMEvent) => void) {
    this.onEventCallback = onEvent ?? null;
  }

  // Mark the start of a performance measurement
  mark(name: string, metadata?: Record<string, unknown>): void {
    this.marks.set(name, {
      name,
      timestamp: this.now(),
      metadata,
    });
  }

  // Measure duration between two marks
  measure(
    name: string,
    startMark: string,
    endMark?: string,
    metadata?: Record<string, unknown>
  ): PerformanceEntry | null {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Performance mark '${startMark}' not found`);
      return null;
    }

    const endTime = endMark
      ? this.marks.get(endMark)?.timestamp ?? this.now()
      : this.now();

    const entry: PerformanceEntry = {
      name,
      entryType: 'measure',
      startTime: start.timestamp,
      duration: endTime - start.timestamp,
      metadata: { ...start.metadata, ...metadata },
    };

    this.entries.push(entry);
    this.emitPerformanceEvent(entry);

    return entry;
  }

  // Track screen render time
  trackScreenRender(
    screenName: string,
    sessionId: string,
    viewId: string
  ): () => void {
    const startTime = this.now();
    const markName = `screen_render_${screenName}_${startTime}`;
    this.mark(markName, { screenName });

    return () => {
      // Wait for all interactions to complete
      InteractionManager.runAfterInteractions(() => {
        const duration = this.now() - startTime;

        const entry: PerformanceEntry = {
          name: `screen_render_${screenName}`,
          entryType: 'screen',
          startTime,
          duration,
          metadata: { screenName },
        };

        this.entries.push(entry);

        if (this.onEventCallback) {
          this.onEventCallback({
            id: uuidv4(),
            type: 'view',
            name: screenName,
            timestamp: startTime,
            sessionId,
            viewId,
            attributes: {
              renderTime: duration,
              screenName,
            },
            duration,
          });
        }
      });
    };
  }

  // Track app startup time
  async trackAppStartup(sessionId: string): Promise<PerformanceEntry> {
    // Get native startup metrics if available
    let nativeStartTime: number | null = null;

    try {
      if (Platform.OS === 'android' && NativeModules.PerformanceModule) {
        nativeStartTime = await NativeModules.PerformanceModule.getAppStartTime();
      } else if (Platform.OS === 'ios' && NativeModules.PerformanceModule) {
        nativeStartTime = await NativeModules.PerformanceModule.getAppStartTime();
      }
    } catch (error) {
      console.warn('Native startup time not available:', error);
    }

    const jsInitTime = this.now();
    const startupDuration = nativeStartTime
      ? jsInitTime - nativeStartTime
      : jsInitTime;

    const entry: PerformanceEntry = {
      name: 'app_startup',
      entryType: 'startup',
      startTime: nativeStartTime ?? 0,
      duration: startupDuration,
      metadata: {
        nativeStartTime,
        jsInitTime,
        platform: Platform.OS,
      },
    };

    this.entries.push(entry);
    this.emitPerformanceEvent(entry);

    return entry;
  }

  // Start FPS monitoring
  startFPSMonitoring(): void {
    if (this.frameCallback !== null) {
      return; // Already monitoring
    }

    const monitorFrame = (timestamp: number) => {
      this.frameTimestamps.push(timestamp);

      // Keep only last second of frames
      const oneSecondAgo = timestamp - 1000;
      this.frameTimestamps = this.frameTimestamps.filter(t => t > oneSecondAgo);

      this.frameCallback = requestAnimationFrame(monitorFrame);
    };

    this.frameCallback = requestAnimationFrame(monitorFrame);
  }

  // Stop FPS monitoring
  stopFPSMonitoring(): void {
    if (this.frameCallback !== null) {
      cancelAnimationFrame(this.frameCallback);
      this.frameCallback = null;
    }
  }

  // Get current FPS
  getCurrentFPS(): number {
    return this.frameTimestamps.length;
  }

  // Track long tasks (operations > 50ms)
  trackLongTask(
    taskName: string,
    duration: number,
    sessionId: string,
    viewId: string
  ): void {
    if (duration > 50) {
      const entry: PerformanceEntry = {
        name: taskName,
        entryType: 'longtask',
        startTime: this.now() - duration,
        duration,
      };

      this.entries.push(entry);

      if (this.onEventCallback) {
        this.onEventCallback({
          id: uuidv4(),
          type: 'long_task',
          name: taskName,
          timestamp: entry.startTime,
          sessionId,
          viewId,
          attributes: {
            duration,
            taskName,
          },
          duration,
        });
      }
    }
  }

  // Get all performance entries
  getEntries(type?: string): PerformanceEntry[] {
    if (type) {
      return this.entries.filter(e => e.entryType === type);
    }
    return [...this.entries];
  }

  // Clear all entries
  clearEntries(): void {
    this.entries = [];
    this.marks.clear();
  }

  private now(): number {
    return Date.now();
  }

  private emitPerformanceEvent(entry: PerformanceEntry): void {
    if (this.onEventCallback) {
      // Convert performance entry to RUM event
      // Implementation depends on event handling strategy
    }
  }
}
```

### Network Interceptor Implementation

```typescript
// src/rum/NetworkInterceptor.ts
import { v4 as uuidv4 } from 'uuid';
import type { RUMEvent } from './types';

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  startTime: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
}

interface NetworkResponse {
  id: string;
  status: number;
  statusText: string;
  endTime: number;
  duration: number;
  responseSize: number;
  responseHeaders?: Record<string, string>;
  error?: Error;
}

export class NetworkInterceptor {
  private requests: Map<string, NetworkRequest> = new Map();
  private onEventCallback: ((event: RUMEvent) => void) | null = null;
  private sessionId: string = '';
  private viewId: string = '';
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  constructor(onEvent?: (event: RUMEvent) => void) {
    this.onEventCallback = onEvent ?? null;
  }

  setSessionContext(sessionId: string, viewId: string): void {
    this.sessionId = sessionId;
    this.viewId = viewId;
  }

  install(): void {
    this.interceptFetch();
    this.interceptXHR();
  }

  uninstall(): void {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }
  }

  private interceptFetch(): void {
    this.originalFetch = global.fetch;
    const self = this;

    global.fetch = async function(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const requestId = uuidv4();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      const startTime = Date.now();

      // Track request start
      const request: NetworkRequest = {
        id: requestId,
        url,
        method,
        startTime,
        requestHeaders: init?.headers as Record<string, string>,
        requestBody: init?.body,
      };
      self.requests.set(requestId, request);

      try {
        const response = await self.originalFetch!.call(this, input, init);
        const endTime = Date.now();

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseSize = 0;

        try {
          const blob = await clonedResponse.blob();
          responseSize = blob.size;
        } catch {
          // Response body might not be readable
        }

        // Track successful response
        self.trackResponse({
          id: requestId,
          status: response.status,
          statusText: response.statusText,
          endTime,
          duration: endTime - startTime,
          responseSize,
        });

        return response;
      } catch (error) {
        const endTime = Date.now();

        // Track failed request
        self.trackResponse({
          id: requestId,
          status: 0,
          statusText: 'Network Error',
          endTime,
          duration: endTime - startTime,
          responseSize: 0,
          error: error as Error,
        });

        throw error;
      }
    };
  }

  private interceptXHR(): void {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      (this as XMLHttpRequest & { _rumRequestId: string; _rumUrl: string; _rumMethod: string })._rumRequestId = uuidv4();
      (this as XMLHttpRequest & { _rumUrl: string })._rumUrl = url.toString();
      (this as XMLHttpRequest & { _rumMethod: string })._rumMethod = method;

      return self.originalXHROpen!.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null): void {
      const xhr = this as XMLHttpRequest & {
        _rumRequestId: string;
        _rumUrl: string;
        _rumMethod: string
      };
      const requestId = xhr._rumRequestId;
      const startTime = Date.now();

      const request: NetworkRequest = {
        id: requestId,
        url: xhr._rumUrl,
        method: xhr._rumMethod,
        startTime,
      };
      self.requests.set(requestId, request);

      const originalOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = function(ev: Event) {
        if (this.readyState === XMLHttpRequest.DONE) {
          const endTime = Date.now();

          self.trackResponse({
            id: requestId,
            status: this.status,
            statusText: this.statusText,
            endTime,
            duration: endTime - startTime,
            responseSize: this.responseText?.length ?? 0,
            error: this.status === 0 ? new Error('Network Error') : undefined,
          });
        }

        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.call(this, ev);
        }
      };

      return self.originalXHRSend!.call(this, body);
    };
  }

  private trackResponse(response: NetworkResponse): void {
    const request = this.requests.get(response.id);
    if (!request) return;

    this.requests.delete(response.id);

    if (this.onEventCallback) {
      this.onEventCallback({
        id: uuidv4(),
        type: 'resource',
        name: request.url,
        timestamp: request.startTime,
        sessionId: this.sessionId,
        viewId: this.viewId,
        attributes: {
          url: request.url,
          method: request.method,
          status: response.status,
          statusText: response.statusText,
          duration: response.duration,
          responseSize: response.responseSize,
          success: response.status >= 200 && response.status < 400,
          error: response.error?.message,
        },
        duration: response.duration,
      });
    }
  }
}
```

### Error Tracker Implementation

```typescript
// src/rum/ErrorTracker.ts
import { v4 as uuidv4 } from 'uuid';
import type { RUMEvent } from './types';

interface ErrorContext {
  sessionId: string;
  viewId: string;
  userId?: string;
  customAttributes?: Record<string, unknown>;
}

interface TrackedError {
  id: string;
  type: 'js_error' | 'unhandled_promise' | 'native_crash' | 'custom';
  message: string;
  stack?: string;
  timestamp: number;
  context: ErrorContext;
  metadata?: Record<string, unknown>;
}

export class ErrorTracker {
  private errors: TrackedError[] = [];
  private onEventCallback: ((event: RUMEvent) => void) | null = null;
  private context: ErrorContext = {
    sessionId: '',
    viewId: '',
  };
  private originalErrorHandler: ErrorUtils['getGlobalHandler'] extends () => infer R ? R : never = null;
  private originalPromiseRejectionHandler: ((error: unknown) => void) | null = null;

  constructor(onEvent?: (event: RUMEvent) => void) {
    this.onEventCallback = onEvent ?? null;
  }

  setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  install(): void {
    this.installGlobalErrorHandler();
    this.installPromiseRejectionHandler();
  }

  uninstall(): void {
    if (this.originalErrorHandler && global.ErrorUtils) {
      global.ErrorUtils.setGlobalHandler(this.originalErrorHandler);
    }
  }

  private installGlobalErrorHandler(): void {
    if (global.ErrorUtils) {
      this.originalErrorHandler = global.ErrorUtils.getGlobalHandler();

      global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.trackError({
          type: 'js_error',
          message: error.message,
          stack: error.stack,
          metadata: { isFatal },
        });

        // Call original handler
        if (this.originalErrorHandler) {
          this.originalErrorHandler(error, isFatal);
        }
      });
    }
  }

  private installPromiseRejectionHandler(): void {
    // React Native specific promise rejection tracking
    const tracking = require('promise/setimmediate/rejection-tracking');

    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: Error) => {
        this.trackError({
          type: 'unhandled_promise',
          message: error?.message ?? 'Unhandled Promise Rejection',
          stack: error?.stack,
          metadata: { promiseId: id },
        });
      },
      onHandled: () => {
        // Promise was handled later
      },
    });
  }

  trackError(params: {
    type: TrackedError['type'];
    message: string;
    stack?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const error: TrackedError = {
      id: uuidv4(),
      type: params.type,
      message: params.message,
      stack: params.stack,
      timestamp: Date.now(),
      context: { ...this.context },
      metadata: params.metadata,
    };

    this.errors.push(error);
    this.emitErrorEvent(error);
  }

  // Track caught errors manually
  captureError(error: Error, metadata?: Record<string, unknown>): void {
    this.trackError({
      type: 'custom',
      message: error.message,
      stack: error.stack,
      metadata,
    });
  }

  // Create error boundary handler
  createErrorBoundaryHandler(componentName: string): (error: Error, errorInfo: { componentStack: string }) => void {
    return (error: Error, errorInfo: { componentStack: string }) => {
      this.trackError({
        type: 'js_error',
        message: error.message,
        stack: error.stack,
        metadata: {
          componentName,
          componentStack: errorInfo.componentStack,
          isErrorBoundary: true,
        },
      });
    };
  }

  private emitErrorEvent(error: TrackedError): void {
    if (this.onEventCallback) {
      this.onEventCallback({
        id: error.id,
        type: 'error',
        name: error.message,
        timestamp: error.timestamp,
        sessionId: error.context.sessionId,
        viewId: error.context.viewId,
        attributes: {
          errorType: error.type,
          message: error.message,
          stack: error.stack,
          userId: error.context.userId,
          ...error.metadata,
        },
      });
    }
  }

  getErrors(): TrackedError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}
```

### RUM Collector - Bringing It All Together

```typescript
// src/rum/RUMCollector.ts
import { AppState, type AppStateStatus } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './SessionManager';
import { PerformanceTracker } from './PerformanceTracker';
import { NetworkInterceptor } from './NetworkInterceptor';
import { ErrorTracker } from './ErrorTracker';
import type { RUMConfig, RUMEvent, RUMSession } from './types';

export class RUMCollector {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private performanceTracker: PerformanceTracker;
  private networkInterceptor: NetworkInterceptor;
  private errorTracker: ErrorTracker;

  private eventQueue: RUMEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private currentViewId: string = '';
  private isInitialized: boolean = false;
  private isSampled: boolean = false;

  constructor(config: RUMConfig) {
    this.config = config;

    // Determine if this session should be sampled
    this.isSampled = Math.random() < config.sampleRate;

    // Initialize components
    this.sessionManager = new SessionManager();
    this.performanceTracker = new PerformanceTracker(this.handleEvent.bind(this));
    this.networkInterceptor = new NetworkInterceptor(this.handleEvent.bind(this));
    this.errorTracker = new ErrorTracker(this.handleEvent.bind(this));
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isSampled) {
      return;
    }

    try {
      // Initialize session
      const session = await this.sessionManager.initialize();
      this.currentViewId = uuidv4();

      // Set up components with session context
      this.networkInterceptor.setSessionContext(session.id, this.currentViewId);
      this.errorTracker.setContext({
        sessionId: session.id,
        viewId: this.currentViewId,
      });

      // Install interceptors
      if (this.config.enableNetworkTracking) {
        this.networkInterceptor.install();
      }
      if (this.config.enableErrorTracking) {
        this.errorTracker.install();
      }
      if (this.config.enablePerformanceTracking) {
        this.performanceTracker.startFPSMonitoring();
        await this.performanceTracker.trackAppStartup(session.id);
      }

      // Set up app state listener
      AppState.addEventListener('change', this.handleAppStateChange.bind(this));

      // Start flush timer
      this.startFlushTimer();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize RUM:', error);
    }
  }

  private handleEvent(event: RUMEvent): void {
    if (!this.isSampled) return;

    // Add common attributes
    const enrichedEvent: RUMEvent = {
      ...event,
      attributes: {
        ...event.attributes,
        ...this.config.customAttributes,
        appVersion: this.config.appVersion,
        environment: this.config.environment,
      },
    };

    this.eventQueue.push(enrichedEvent);

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const session = this.sessionManager.getSession();
    if (!session) return;

    if (nextAppState === 'active') {
      this.sessionManager.updateLastActivity();
      this.handleEvent({
        id: uuidv4(),
        type: 'action',
        name: 'app_foreground',
        timestamp: Date.now(),
        sessionId: session.id,
        viewId: this.currentViewId,
        attributes: {},
      });
    } else if (nextAppState === 'background') {
      this.handleEvent({
        id: uuidv4(),
        type: 'action',
        name: 'app_background',
        timestamp: Date.now(),
        sessionId: session.id,
        viewId: this.currentViewId,
        attributes: {},
      });
      this.flush(); // Flush before going to background
    }
  }

  // Track screen/view changes
  trackView(screenName: string, attributes?: Record<string, unknown>): () => void {
    const session = this.sessionManager.getSession();
    if (!session || !this.isSampled) {
      return () => {};
    }

    // Generate new view ID for each screen
    this.currentViewId = uuidv4();

    // Update context
    this.networkInterceptor.setSessionContext(session.id, this.currentViewId);
    this.errorTracker.setContext({
      sessionId: session.id,
      viewId: this.currentViewId,
    });

    // Track view start
    const startTime = Date.now();
    this.handleEvent({
      id: uuidv4(),
      type: 'view',
      name: screenName,
      timestamp: startTime,
      sessionId: session.id,
      viewId: this.currentViewId,
      attributes: {
        ...attributes,
        viewStart: true,
      },
    });

    // Return render tracker
    return this.performanceTracker.trackScreenRender(
      screenName,
      session.id,
      this.currentViewId
    );
  }

  // Track user actions
  trackAction(actionName: string, attributes?: Record<string, unknown>): void {
    const session = this.sessionManager.getSession();
    if (!session || !this.isSampled) return;

    this.sessionManager.updateLastActivity();

    this.handleEvent({
      id: uuidv4(),
      type: 'action',
      name: actionName,
      timestamp: Date.now(),
      sessionId: session.id,
      viewId: this.currentViewId,
      attributes: attributes ?? {},
    });
  }

  // Track custom events
  trackCustomEvent(
    name: string,
    attributes?: Record<string, unknown>,
    duration?: number
  ): void {
    const session = this.sessionManager.getSession();
    if (!session || !this.isSampled) return;

    this.handleEvent({
      id: uuidv4(),
      type: 'custom',
      name,
      timestamp: Date.now(),
      sessionId: session.id,
      viewId: this.currentViewId,
      attributes: attributes ?? {},
      duration,
    });
  }

  // Set user identity
  async setUser(userId: string, attributes?: Record<string, unknown>): Promise<void> {
    await this.sessionManager.setUserId(userId);
    this.errorTracker.setContext({ userId });

    if (attributes) {
      this.config.customAttributes = {
        ...this.config.customAttributes,
        ...attributes,
      };
    }
  }

  // Capture errors manually
  captureError(error: Error, metadata?: Record<string, unknown>): void {
    this.errorTracker.captureError(error, metadata);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const session = this.sessionManager.getSession();

    const payload = {
      session: session ? {
        id: session.id,
        userId: session.userId,
        device: session.device,
        app: session.app,
      } : null,
      events,
      timestamp: Date.now(),
    };

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue = [...events, ...this.eventQueue];
      console.warn('Failed to flush RUM events:', error);
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): {
    fps: number;
    entries: ReturnType<PerformanceTracker['getEntries']>;
  } {
    return {
      fps: this.performanceTracker.getCurrentFPS(),
      entries: this.performanceTracker.getEntries(),
    };
  }

  // Clean up
  async shutdown(): Promise<void> {
    await this.flush();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.networkInterceptor.uninstall();
    this.errorTracker.uninstall();
    this.performanceTracker.stopFPSMonitoring();

    await this.sessionManager.endSession();
  }
}
```

### React Context and Hooks

```typescript
// src/rum/RUMContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { RUMCollector } from './RUMCollector';
import type { RUMConfig } from './types';

interface RUMContextValue {
  collector: RUMCollector | null;
  trackView: (screenName: string, attributes?: Record<string, unknown>) => () => void;
  trackAction: (actionName: string, attributes?: Record<string, unknown>) => void;
  trackCustomEvent: (
    name: string,
    attributes?: Record<string, unknown>,
    duration?: number
  ) => void;
  setUser: (userId: string, attributes?: Record<string, unknown>) => Promise<void>;
  captureError: (error: Error, metadata?: Record<string, unknown>) => void;
}

const RUMContext = createContext<RUMContextValue | null>(null);

interface RUMProviderProps {
  config: RUMConfig;
  children: ReactNode;
}

export function RUMProvider({ config, children }: RUMProviderProps): JSX.Element {
  const collectorRef = useRef<RUMCollector | null>(null);

  useEffect(() => {
    const collector = new RUMCollector(config);
    collectorRef.current = collector;

    collector.initialize().catch(error => {
      console.error('Failed to initialize RUM:', error);
    });

    return () => {
      collector.shutdown();
    };
  }, []);

  const contextValue: RUMContextValue = {
    collector: collectorRef.current,
    trackView: (screenName, attributes) => {
      return collectorRef.current?.trackView(screenName, attributes) ?? (() => {});
    },
    trackAction: (actionName, attributes) => {
      collectorRef.current?.trackAction(actionName, attributes);
    },
    trackCustomEvent: (name, attributes, duration) => {
      collectorRef.current?.trackCustomEvent(name, attributes, duration);
    },
    setUser: async (userId, attributes) => {
      await collectorRef.current?.setUser(userId, attributes);
    },
    captureError: (error, metadata) => {
      collectorRef.current?.captureError(error, metadata);
    },
  };

  return (
    <RUMContext.Provider value={contextValue}>
      {children}
    </RUMContext.Provider>
  );
}

export function useRUM(): RUMContextValue {
  const context = useContext(RUMContext);
  if (!context) {
    throw new Error('useRUM must be used within a RUMProvider');
  }
  return context;
}

// Hook for tracking screen views
export function useRUMView(
  screenName: string,
  attributes?: Record<string, unknown>
): void {
  const { trackView } = useRUM();

  useEffect(() => {
    const endTracking = trackView(screenName, attributes);
    return endTracking;
  }, [screenName]);
}
```

## User Session Tracking

Effective user session tracking goes beyond simple session IDs. Here is how to implement comprehensive session tracking:

### Session Attributes and Segmentation

```typescript
// src/rum/SessionAttributes.ts
import NetInfo from '@react-native-community/netinfo';

interface SessionAttributes {
  // Network information
  networkType: string;
  networkEffectiveType: string;
  isConnected: boolean;

  // User engagement
  sessionDuration: number;
  screenCount: number;
  actionCount: number;
  errorCount: number;

  // Business context
  userSegment?: string;
  subscriptionTier?: string;
  experimentGroups?: string[];
}

export class SessionAttributeTracker {
  private attributes: Partial<SessionAttributes> = {};
  private screenCount: number = 0;
  private actionCount: number = 0;
  private errorCount: number = 0;
  private sessionStartTime: number = Date.now();

  async collectNetworkAttributes(): Promise<void> {
    const netInfo = await NetInfo.fetch();

    this.attributes.networkType = netInfo.type;
    this.attributes.networkEffectiveType = netInfo.details?.cellularGeneration ?? 'unknown';
    this.attributes.isConnected = netInfo.isConnected ?? false;
  }

  incrementScreenCount(): void {
    this.screenCount++;
    this.attributes.screenCount = this.screenCount;
  }

  incrementActionCount(): void {
    this.actionCount++;
    this.attributes.actionCount = this.actionCount;
  }

  incrementErrorCount(): void {
    this.errorCount++;
    this.attributes.errorCount = this.errorCount;
  }

  setUserSegment(segment: string): void {
    this.attributes.userSegment = segment;
  }

  setSubscriptionTier(tier: string): void {
    this.attributes.subscriptionTier = tier;
  }

  addExperimentGroup(group: string): void {
    if (!this.attributes.experimentGroups) {
      this.attributes.experimentGroups = [];
    }
    this.attributes.experimentGroups.push(group);
  }

  getAttributes(): SessionAttributes {
    return {
      ...this.attributes,
      sessionDuration: Date.now() - this.sessionStartTime,
      screenCount: this.screenCount,
      actionCount: this.actionCount,
      errorCount: this.errorCount,
    } as SessionAttributes;
  }
}
```

### User Journey Tracking

```typescript
// src/rum/UserJourney.ts
interface JourneyStep {
  screenName: string;
  timestamp: number;
  duration: number;
  actions: string[];
}

interface UserJourney {
  steps: JourneyStep[];
  conversionEvents: string[];
  dropOffPoint?: string;
}

export class UserJourneyTracker {
  private currentJourney: UserJourney = {
    steps: [],
    conversionEvents: [],
  };
  private currentStep: JourneyStep | null = null;

  startStep(screenName: string): void {
    // End previous step if exists
    if (this.currentStep) {
      this.currentStep.duration = Date.now() - this.currentStep.timestamp;
      this.currentJourney.steps.push(this.currentStep);
    }

    // Start new step
    this.currentStep = {
      screenName,
      timestamp: Date.now(),
      duration: 0,
      actions: [],
    };
  }

  recordAction(actionName: string): void {
    if (this.currentStep) {
      this.currentStep.actions.push(actionName);
    }
  }

  recordConversion(eventName: string): void {
    this.currentJourney.conversionEvents.push(eventName);
  }

  markDropOff(): void {
    if (this.currentStep) {
      this.currentJourney.dropOffPoint = this.currentStep.screenName;
    }
  }

  getJourney(): UserJourney {
    // Include current step
    const journey = { ...this.currentJourney };
    if (this.currentStep) {
      journey.steps = [
        ...journey.steps,
        {
          ...this.currentStep,
          duration: Date.now() - this.currentStep.timestamp,
        },
      ];
    }
    return journey;
  }

  // Analyze common paths
  static analyzeJourneys(journeys: UserJourney[]): {
    commonPaths: string[][];
    conversionRate: number;
    averageSteps: number;
    topDropOffPoints: { screen: string; count: number }[];
  } {
    const paths = journeys.map(j => j.steps.map(s => s.screenName));
    const conversions = journeys.filter(j => j.conversionEvents.length > 0).length;
    const dropOffs = journeys
      .filter(j => j.dropOffPoint)
      .reduce((acc, j) => {
        acc[j.dropOffPoint!] = (acc[j.dropOffPoint!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      commonPaths: paths.slice(0, 10), // Simplified - would need clustering
      conversionRate: conversions / journeys.length,
      averageSteps: journeys.reduce((sum, j) => sum + j.steps.length, 0) / journeys.length,
      topDropOffPoints: Object.entries(dropOffs)
        .map(([screen, count]) => ({ screen, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
```

## Analyzing RUM Data

Once you are collecting RUM data, the next step is meaningful analysis. Here are patterns for extracting insights:

### Performance Percentiles

```typescript
// src/rum/analysis/PerformanceAnalysis.ts
interface PerformanceAnalysis {
  metric: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export function analyzePerformance(
  values: number[],
  metricName: string
): PerformanceAnalysis {
  if (values.length === 0) {
    throw new Error('No values to analyze');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  const percentile = (p: number): number => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    metric: metricName,
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    median: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
  };
}

// Calculate Apdex score
export function calculateApdex(
  responseTimes: number[],
  satisfiedThreshold: number,
  toleratedThreshold: number
): number {
  let satisfied = 0;
  let tolerated = 0;

  for (const time of responseTimes) {
    if (time <= satisfiedThreshold) {
      satisfied++;
    } else if (time <= toleratedThreshold) {
      tolerated++;
    }
  }

  return (satisfied + tolerated / 2) / responseTimes.length;
}
```

### Segmentation Analysis

```typescript
// src/rum/analysis/Segmentation.ts
import type { RUMSession, RUMEvent } from '../types';

interface SegmentedMetrics {
  segment: string;
  sessionCount: number;
  avgSessionDuration: number;
  avgScreenViews: number;
  errorRate: number;
  performanceMetrics: {
    avgStartupTime: number;
    avgScreenLoadTime: number;
    avgApiResponseTime: number;
  };
}

export function segmentByDevice(
  sessions: RUMSession[],
  events: RUMEvent[]
): Map<string, SegmentedMetrics> {
  const segments = new Map<string, RUMSession[]>();

  // Group sessions by device
  for (const session of sessions) {
    const key = `${session.device.brand} ${session.device.model}`;
    if (!segments.has(key)) {
      segments.set(key, []);
    }
    segments.get(key)!.push(session);
  }

  const results = new Map<string, SegmentedMetrics>();

  for (const [device, deviceSessions] of segments) {
    const sessionIds = new Set(deviceSessions.map(s => s.id));
    const deviceEvents = events.filter(e => sessionIds.has(e.sessionId));

    results.set(device, calculateSegmentMetrics(device, deviceSessions, deviceEvents));
  }

  return results;
}

export function segmentByOS(
  sessions: RUMSession[],
  events: RUMEvent[]
): Map<string, SegmentedMetrics> {
  const segments = new Map<string, RUMSession[]>();

  for (const session of sessions) {
    const key = `${session.device.os} ${session.device.osVersion}`;
    if (!segments.has(key)) {
      segments.set(key, []);
    }
    segments.get(key)!.push(session);
  }

  const results = new Map<string, SegmentedMetrics>();

  for (const [os, osSessions] of segments) {
    const sessionIds = new Set(osSessions.map(s => s.id));
    const osEvents = events.filter(e => sessionIds.has(e.sessionId));

    results.set(os, calculateSegmentMetrics(os, osSessions, osEvents));
  }

  return results;
}

export function segmentByNetworkType(
  sessions: RUMSession[],
  events: RUMEvent[]
): Map<string, SegmentedMetrics> {
  // Implementation similar to above, grouping by network type
  // This would require network info in session data
  return new Map();
}

function calculateSegmentMetrics(
  segmentName: string,
  sessions: RUMSession[],
  events: RUMEvent[]
): SegmentedMetrics {
  const errorEvents = events.filter(e => e.type === 'error');
  const viewEvents = events.filter(e => e.type === 'view');
  const resourceEvents = events.filter(e => e.type === 'resource');

  const startupEvents = events.filter(
    e => e.type === 'custom' && e.name === 'app_startup'
  );

  return {
    segment: segmentName,
    sessionCount: sessions.length,
    avgSessionDuration: sessions.reduce(
      (sum, s) => sum + (s.lastActivityTime - s.startTime),
      0
    ) / sessions.length,
    avgScreenViews: viewEvents.length / sessions.length,
    errorRate: errorEvents.length / sessions.length,
    performanceMetrics: {
      avgStartupTime: startupEvents.length > 0
        ? startupEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) / startupEvents.length
        : 0,
      avgScreenLoadTime: viewEvents.length > 0
        ? viewEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) / viewEvents.length
        : 0,
      avgApiResponseTime: resourceEvents.length > 0
        ? resourceEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) / resourceEvents.length
        : 0,
    },
  };
}
```

## Setting Performance Baselines

Establishing baselines helps you understand what normal looks like and detect regressions:

```typescript
// src/rum/analysis/Baselines.ts
interface PerformanceBaseline {
  metric: string;
  baseline: number;
  upperThreshold: number;
  lowerThreshold: number;
  standardDeviation: number;
  sampleSize: number;
  calculatedAt: number;
}

export class BaselineManager {
  private baselines: Map<string, PerformanceBaseline> = new Map();

  calculateBaseline(
    metricName: string,
    values: number[],
    stdDevMultiplier: number = 2
  ): PerformanceBaseline {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const baseline: PerformanceBaseline = {
      metric: metricName,
      baseline: mean,
      upperThreshold: mean + stdDev * stdDevMultiplier,
      lowerThreshold: Math.max(0, mean - stdDev * stdDevMultiplier),
      standardDeviation: stdDev,
      sampleSize: values.length,
      calculatedAt: Date.now(),
    };

    this.baselines.set(metricName, baseline);
    return baseline;
  }

  checkRegression(metricName: string, currentValue: number): {
    isRegression: boolean;
    percentageChange: number;
    severity: 'none' | 'minor' | 'major' | 'critical';
  } {
    const baseline = this.baselines.get(metricName);
    if (!baseline) {
      return { isRegression: false, percentageChange: 0, severity: 'none' };
    }

    const percentageChange = ((currentValue - baseline.baseline) / baseline.baseline) * 100;
    const isRegression = currentValue > baseline.upperThreshold;

    let severity: 'none' | 'minor' | 'major' | 'critical' = 'none';
    if (isRegression) {
      if (percentageChange > 100) {
        severity = 'critical';
      } else if (percentageChange > 50) {
        severity = 'major';
      } else {
        severity = 'minor';
      }
    }

    return { isRegression, percentageChange, severity };
  }

  getBaseline(metricName: string): PerformanceBaseline | undefined {
    return this.baselines.get(metricName);
  }
}
```

## Actionable Insights from RUM

The ultimate goal of RUM is to drive improvements. Here is how to extract actionable insights:

### Automated Insight Generation

```typescript
// src/rum/insights/InsightGenerator.ts
interface Insight {
  type: 'performance' | 'error' | 'user_experience' | 'business';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedUsers: number;
  recommendation: string;
  metrics: Record<string, number>;
}

export class InsightGenerator {
  generateInsights(
    sessions: RUMSession[],
    events: RUMEvent[],
    baselines: Map<string, PerformanceBaseline>
  ): Insight[] {
    const insights: Insight[] = [];

    // Check for slow startup times
    const startupInsight = this.analyzeStartupPerformance(events, baselines);
    if (startupInsight) insights.push(startupInsight);

    // Check for high error rates
    const errorInsight = this.analyzeErrorRates(sessions, events);
    if (errorInsight) insights.push(errorInsight);

    // Check for network performance issues
    const networkInsight = this.analyzeNetworkPerformance(events, baselines);
    if (networkInsight) insights.push(networkInsight);

    // Check for device-specific issues
    const deviceInsights = this.analyzeDevicePerformance(sessions, events);
    insights.push(...deviceInsights);

    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private analyzeStartupPerformance(
    events: RUMEvent[],
    baselines: Map<string, PerformanceBaseline>
  ): Insight | null {
    const startupEvents = events.filter(
      e => e.type === 'custom' && e.name === 'app_startup'
    );

    if (startupEvents.length === 0) return null;

    const avgStartup = startupEvents.reduce(
      (sum, e) => sum + (e.duration ?? 0),
      0
    ) / startupEvents.length;

    const baseline = baselines.get('app_startup');
    if (baseline && avgStartup > baseline.upperThreshold) {
      const percentageIncrease = ((avgStartup - baseline.baseline) / baseline.baseline) * 100;

      return {
        type: 'performance',
        severity: percentageIncrease > 50 ? 'critical' : 'warning',
        title: 'App Startup Time Regression Detected',
        description: `Average startup time has increased by ${percentageIncrease.toFixed(1)}% compared to baseline.`,
        affectedUsers: startupEvents.length,
        recommendation: 'Review recent changes to app initialization. Consider lazy loading non-critical modules and optimizing bundle size.',
        metrics: {
          currentAverage: avgStartup,
          baseline: baseline.baseline,
          percentageIncrease,
        },
      };
    }

    return null;
  }

  private analyzeErrorRates(
    sessions: RUMSession[],
    events: RUMEvent[]
  ): Insight | null {
    const errorEvents = events.filter(e => e.type === 'error');
    const errorRate = errorEvents.length / sessions.length;

    if (errorRate > 0.1) { // More than 10% of sessions have errors
      // Group errors by message
      const errorGroups = errorEvents.reduce((acc, e) => {
        const message = String(e.attributes.message ?? 'Unknown');
        acc[message] = (acc[message] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topError = Object.entries(errorGroups)
        .sort((a, b) => b[1] - a[1])[0];

      return {
        type: 'error',
        severity: errorRate > 0.25 ? 'critical' : 'warning',
        title: 'High Error Rate Detected',
        description: `${(errorRate * 100).toFixed(1)}% of sessions are experiencing errors. Most common: "${topError[0]}"`,
        affectedUsers: errorEvents.length,
        recommendation: 'Investigate the most common error and implement proper error handling. Consider adding error boundaries around problematic components.',
        metrics: {
          errorRate,
          totalErrors: errorEvents.length,
          uniqueErrors: Object.keys(errorGroups).length,
        },
      };
    }

    return null;
  }

  private analyzeNetworkPerformance(
    events: RUMEvent[],
    baselines: Map<string, PerformanceBaseline>
  ): Insight | null {
    const resourceEvents = events.filter(e => e.type === 'resource');
    if (resourceEvents.length === 0) return null;

    const failedRequests = resourceEvents.filter(
      e => !e.attributes.success
    );
    const failureRate = failedRequests.length / resourceEvents.length;

    if (failureRate > 0.05) { // More than 5% failure rate
      return {
        type: 'performance',
        severity: failureRate > 0.15 ? 'critical' : 'warning',
        title: 'High Network Request Failure Rate',
        description: `${(failureRate * 100).toFixed(1)}% of network requests are failing.`,
        affectedUsers: new Set(failedRequests.map(e => e.sessionId)).size,
        recommendation: 'Implement retry logic with exponential backoff. Add offline support and optimistic updates where applicable.',
        metrics: {
          failureRate,
          totalRequests: resourceEvents.length,
          failedRequests: failedRequests.length,
        },
      };
    }

    return null;
  }

  private analyzeDevicePerformance(
    sessions: RUMSession[],
    events: RUMEvent[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Group by device
    const deviceGroups = sessions.reduce((acc, s) => {
      const key = `${s.device.brand} ${s.device.model}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {} as Record<string, RUMSession[]>);

    for (const [device, deviceSessions] of Object.entries(deviceGroups)) {
      if (deviceSessions.length < 10) continue; // Need enough data

      const sessionIds = new Set(deviceSessions.map(s => s.id));
      const deviceErrors = events.filter(
        e => e.type === 'error' && sessionIds.has(e.sessionId)
      );

      const errorRate = deviceErrors.length / deviceSessions.length;

      if (errorRate > 0.2) { // 20% error rate for this device
        insights.push({
          type: 'user_experience',
          severity: 'warning',
          title: `High Error Rate on ${device}`,
          description: `Users on ${device} are experiencing ${(errorRate * 100).toFixed(1)}% error rate.`,
          affectedUsers: deviceSessions.length,
          recommendation: `Test the app specifically on ${device} and similar devices. Check for compatibility issues with this device's OS version.`,
          metrics: {
            errorRate,
            sessionCount: deviceSessions.length,
            errorCount: deviceErrors.length,
          },
        });
      }
    }

    return insights;
  }
}
```

## Complete Integration Example

Here is how to integrate everything in your React Native application:

```typescript
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RUMProvider } from './src/rum';
import { AppNavigator } from './src/navigation/AppNavigator';

const rumConfig = {
  apiEndpoint: 'https://your-rum-endpoint.com/v1/events',
  apiKey: 'your-api-key',
  appVersion: '1.0.0',
  environment: 'production' as const,
  sampleRate: 1.0, // Track 100% of sessions
  batchSize: 20,
  flushInterval: 30000, // 30 seconds
  enableNetworkTracking: true,
  enableErrorTracking: true,
  enablePerformanceTracking: true,
};

export default function App(): JSX.Element {
  return (
    <RUMProvider config={rumConfig}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </RUMProvider>
  );
}
```

```typescript
// src/screens/HomeScreen.tsx
import React, { useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { useRUM, useRUMView } from '../rum';

export function HomeScreen(): JSX.Element {
  // Automatically track this screen view
  useRUMView('HomeScreen');

  const { trackAction, setUser } = useRUM();

  useEffect(() => {
    // Set user after authentication
    setUser('user-123', { plan: 'premium' });
  }, []);

  const handleButtonPress = () => {
    trackAction('button_press', { buttonName: 'cta_button' });
    // Handle action...
  };

  return (
    <View>
      <Text>Welcome to the App</Text>
      <Button title="Get Started" onPress={handleButtonPress} />
    </View>
  );
}
```

## Conclusion

Implementing Real User Monitoring in React Native applications provides invaluable insights into how your users actually experience your app. By tracking performance metrics, user sessions, network requests, and errors in real-world conditions, you can make data-driven decisions to improve your app.

Key takeaways from this guide:

1. **RUM captures real-world diversity** - Unlike synthetic monitoring, RUM shows you the full spectrum of devices, network conditions, and user behaviors your app encounters.

2. **Comprehensive tracking is essential** - Track not just errors, but performance metrics, user journeys, and business events to get the complete picture.

3. **Session context correlates data** - Linking errors, performance issues, and user actions to sessions helps you understand the full impact of issues.

4. **Segmentation reveals patterns** - Breaking down data by device, OS, network type, and user segments helps identify specific problem areas.

5. **Baselines detect regressions** - Establishing performance baselines enables automated detection of regressions before they affect too many users.

6. **Actionable insights drive improvements** - The ultimate goal is to translate RUM data into specific, prioritized actions that improve user experience.

By following the implementation patterns in this guide, you will have a solid foundation for understanding and improving your React Native application's real-world performance. Remember that RUM is not a one-time setup but an ongoing practice of measurement, analysis, and optimization.

Start with the core metrics that matter most to your users, establish baselines, and continuously iterate based on the insights you gather. Your users will thank you with better engagement, higher retention, and fewer support tickets.
