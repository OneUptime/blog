# How to Implement Real User Monitoring (RUM) in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, RUM, Real User Monitoring, Performance, Analytics, Frontend

Description: A comprehensive guide to implementing Real User Monitoring in React applications, covering core Web Vitals, custom metrics collection, error tracking, and performance optimization strategies.

---

> Synthetic monitoring tells you if your application *can* work. Real User Monitoring tells you if it *does* work for your actual users in real-world conditions.

Real User Monitoring (RUM) captures performance data from actual user sessions, giving you insights that synthetic tests cannot provide. While synthetic monitoring tests your application from controlled environments, RUM reveals how your application performs across different devices, network conditions, geographic locations, and user behaviors.

This guide walks through implementing comprehensive RUM in React applications, from basic setup to advanced patterns for metrics collection, error tracking, and performance optimization.

---

## Table of Contents

1. What is Real User Monitoring
2. Core Web Vitals Overview
3. Setting Up RUM Infrastructure
4. Implementing Performance Observer
5. Tracking Core Web Vitals in React
6. Custom Metrics Collection
7. User Session Tracking
8. Error and Crash Reporting
9. Network Request Monitoring
10. React-Specific Performance Patterns
11. Data Aggregation and Analysis
12. Sampling Strategies
13. Privacy Considerations
14. Building a RUM Dashboard
15. Integration with OneUptime
16. Summary

---

## 1. What is Real User Monitoring

Real User Monitoring collects performance and behavior data from actual users interacting with your application. Unlike synthetic monitoring that runs scripted tests, RUM captures the real experience of diverse users.

| Aspect | Synthetic Monitoring | Real User Monitoring |
|--------|---------------------|---------------------|
| Data Source | Scripted tests from controlled locations | Actual user sessions |
| Network Conditions | Simulated | Real (3G, 4G, WiFi, varying latency) |
| Device Diversity | Limited test devices | All user devices (phones, tablets, desktops) |
| Geographic Coverage | Selected test locations | Wherever users are |
| User Behavior | Predefined scripts | Natural interaction patterns |
| Issue Detection | Catches availability issues | Catches real-world performance problems |
| Volume | Periodic checks | Continuous from all users |

RUM answers questions that synthetic tests cannot:

- How long does my React app take to become interactive for users in different regions?
- Which components cause the most rendering delays?
- What percentage of users experience JavaScript errors?
- How do performance metrics correlate with user engagement and conversion?

---

## 2. Core Web Vitals Overview

Google's Core Web Vitals are the foundation of modern RUM. These metrics represent critical aspects of user experience.

### Largest Contentful Paint (LCP)

Measures loading performance: how long until the largest visible content element renders.

| Rating | Threshold | User Experience |
|--------|-----------|-----------------|
| Good | <= 2.5s | Content loads quickly |
| Needs Improvement | 2.5s - 4.0s | Noticeable delay |
| Poor | > 4.0s | Users may abandon |

### Interaction to Next Paint (INP)

Measures responsiveness: how long the page takes to respond to user interactions.

| Rating | Threshold | User Experience |
|--------|-----------|-----------------|
| Good | <= 200ms | Feels instant |
| Needs Improvement | 200ms - 500ms | Noticeable lag |
| Poor | > 500ms | Feels broken |

### Cumulative Layout Shift (CLS)

Measures visual stability: how much the page layout shifts unexpectedly.

| Rating | Threshold | User Experience |
|--------|-----------|-----------------|
| Good | <= 0.1 | Stable layout |
| Needs Improvement | 0.1 - 0.25 | Some shifting |
| Poor | > 0.25 | Frustrating shifts |

### Additional Metrics Worth Tracking

| Metric | Description | Why It Matters |
|--------|-------------|----------------|
| First Contentful Paint (FCP) | First content rendered | Early feedback to user |
| Time to First Byte (TTFB) | Server response time | Backend/network performance |
| First Input Delay (FID) | Legacy responsiveness metric | Replaced by INP but still useful |
| Total Blocking Time (TBT) | Main thread blocking | JavaScript performance |
| Time to Interactive (TTI) | When page is fully interactive | Complete readiness |

---

## 3. Setting Up RUM Infrastructure

### Project Structure

```
src/
  rum/
    index.ts              # Main export
    collector.ts          # Metrics collection
    reporter.ts           # Data transmission
    vitals.ts             # Core Web Vitals
    errors.ts             # Error tracking
    session.ts            # Session management
    network.ts            # Network monitoring
    types.ts              # TypeScript types
    utils.ts              # Helper functions
```

### TypeScript Types

```typescript
// src/rum/types.ts

export interface RUMConfig {
  endpoint: string;
  apiKey: string;
  sampleRate: number;
  sessionTimeout: number;
  enableErrorTracking: boolean;
  enableNetworkTracking: boolean;
  enableResourceTiming: boolean;
  maxBatchSize: number;
  flushInterval: number;
  debug: boolean;
}

export interface MetricEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  lastActivity: number;
}

export interface PageContext {
  url: string;
  path: string;
  referrer: string;
  title: string;
}

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  connectionType?: string;
  effectiveType?: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
}

export interface RUMEvent {
  type: 'metric' | 'error' | 'navigation' | 'resource' | 'interaction';
  timestamp: number;
  session: SessionData;
  page: PageContext;
  device: DeviceInfo;
  data: MetricEntry | ErrorData | NavigationData | ResourceData | InteractionData;
}

export interface ErrorData {
  message: string;
  stack?: string;
  type: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  componentStack?: string;
}

export interface NavigationData {
  type: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  duration: number;
  redirectCount: number;
  domContentLoaded: number;
  loadComplete: number;
}

export interface ResourceData {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
}

export interface InteractionData {
  type: string;
  target: string;
  duration: number;
  timestamp: number;
}
```

### Utility Functions

```typescript
// src/rum/utils.ts

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  const [good, poor] = thresholds[name] || [Infinity, Infinity];

  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function getDeviceInfo(): DeviceInfo {
  const connection = (navigator as any).connection;

  return {
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    connectionType: connection?.type,
    effectiveType: connection?.effectiveType,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
  };
}

export function getPageContext(): PageContext {
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    title: document.title,
  };
}

export function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T {
  let inThrottle = false;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}
```

---

## 4. Implementing Performance Observer

The Performance Observer API is the foundation for collecting browser performance metrics.

```typescript
// src/rum/collector.ts

import { MetricEntry, RUMConfig, RUMEvent } from './types';
import { generateId, getRating, getDeviceInfo, getPageContext } from './utils';
import { SessionManager } from './session';
import { Reporter } from './reporter';

export class MetricsCollector {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private reporter: Reporter;
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, MetricEntry> = new Map();

  constructor(config: RUMConfig, sessionManager: SessionManager, reporter: Reporter) {
    this.config = config;
    this.sessionManager = sessionManager;
    this.reporter = reporter;
  }

  public start(): void {
    this.observeNavigationTiming();
    this.observePaintTiming();
    this.observeLargestContentfulPaint();
    this.observeFirstInputDelay();
    this.observeLayoutShift();
    this.observeLongTasks();
    this.observeResourceTiming();
  }

  public stop(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  private observeNavigationTiming(): void {
    // Navigation timing is available immediately or after load
    const processNavigation = () => {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

      if (navigation) {
        this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart);
        this.recordMetric('DOM_CONTENT_LOADED', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        this.recordMetric('LOAD_COMPLETE', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('DNS_LOOKUP', navigation.domainLookupEnd - navigation.domainLookupStart);
        this.recordMetric('TCP_CONNECT', navigation.connectEnd - navigation.connectStart);
        this.recordMetric('TLS_NEGOTIATION', navigation.secureConnectionStart > 0
          ? navigation.connectEnd - navigation.secureConnectionStart
          : 0);
      }
    };

    if (document.readyState === 'complete') {
      processNavigation();
    } else {
      window.addEventListener('load', processNavigation);
    }
  }

  private observePaintTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            this.recordMetric('FP', entry.startTime);
          } else if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime);
          }
        }
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      if (this.config.debug) {
        console.warn('Paint timing not supported:', e);
      }
    }
  }

  private observeLargestContentfulPaint(): void {
    try {
      let lcpValue = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry) {
          lcpValue = lastEntry.startTime;
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);

      // Report LCP when user interacts or page is hidden
      const reportLCP = () => {
        if (lcpValue > 0) {
          this.recordMetric('LCP', lcpValue);
        }
      };

      // LCP is finalized on first input or page hide
      ['keydown', 'click', 'scroll'].forEach((type) => {
        window.addEventListener(type, reportLCP, { once: true, capture: true });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportLCP();
        }
      });
    } catch (e) {
      if (this.config.debug) {
        console.warn('LCP observation not supported:', e);
      }
    }
  }

  private observeFirstInputDelay(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0] as PerformanceEventTiming;
        if (firstInput) {
          const fid = firstInput.processingStart - firstInput.startTime;
          this.recordMetric('FID', fid);
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      if (this.config.debug) {
        console.warn('FID observation not supported:', e);
      }
    }
  }

  private observeLayoutShift(): void {
    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          // Only count shifts without recent input
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);

      // Report CLS on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && clsValue > 0) {
          this.recordMetric('CLS', clsValue, {
            shiftCount: clsEntries.length,
          });
        }
      });
    } catch (e) {
      if (this.config.debug) {
        console.warn('CLS observation not supported:', e);
      }
    }
  }

  private observeLongTasks(): void {
    try {
      let longTaskCount = 0;
      let totalBlockingTime = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskCount++;
          // TBT is time beyond 50ms for each long task
          const blockingTime = entry.duration - 50;
          if (blockingTime > 0) {
            totalBlockingTime += blockingTime;
          }
        }
      });

      observer.observe({ type: 'longtask', buffered: true });
      this.observers.push(observer);

      // Report on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          if (longTaskCount > 0) {
            this.recordMetric('LONG_TASK_COUNT', longTaskCount);
          }
          if (totalBlockingTime > 0) {
            this.recordMetric('TBT', totalBlockingTime);
          }
        }
      });
    } catch (e) {
      if (this.config.debug) {
        console.warn('Long task observation not supported:', e);
      }
    }
  }

  private observeResourceTiming(): void {
    if (!this.config.enableResourceTiming) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          this.reporter.queueEvent({
            type: 'resource',
            timestamp: Date.now(),
            session: this.sessionManager.getSession(),
            page: getPageContext(),
            device: getDeviceInfo(),
            data: {
              name: entry.name,
              initiatorType: entry.initiatorType,
              duration: entry.duration,
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize,
            },
          });
        }
      });

      observer.observe({ type: 'resource', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      if (this.config.debug) {
        console.warn('Resource timing not supported:', e);
      }
    }
  }

  private recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: MetricEntry = {
      name,
      value,
      rating: getRating(name, value),
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);

    const event: RUMEvent = {
      type: 'metric',
      timestamp: Date.now(),
      session: this.sessionManager.getSession(),
      page: getPageContext(),
      device: getDeviceInfo(),
      data: metric,
    };

    this.reporter.queueEvent(event);

    if (this.config.debug) {
      console.log(`[RUM] ${name}:`, value, `(${metric.rating})`);
    }
  }

  public getMetric(name: string): MetricEntry | undefined {
    return this.metrics.get(name);
  }

  public getAllMetrics(): Map<string, MetricEntry> {
    return new Map(this.metrics);
  }
}
```

---

## 5. Tracking Core Web Vitals in React

### Using web-vitals Library

For production use, the `web-vitals` library provides a battle-tested implementation.

```typescript
// src/rum/vitals.ts

import { onLCP, onINP, onCLS, onFCP, onTTFB, Metric } from 'web-vitals';
import { MetricEntry, RUMConfig } from './types';
import { getRating, getDeviceInfo, getPageContext } from './utils';
import { SessionManager } from './session';
import { Reporter } from './reporter';

export class WebVitalsCollector {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private reporter: Reporter;

  constructor(config: RUMConfig, sessionManager: SessionManager, reporter: Reporter) {
    this.config = config;
    this.sessionManager = sessionManager;
    this.reporter = reporter;
  }

  public start(): void {
    const reportMetric = (metric: Metric) => {
      const entry: MetricEntry = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        metadata: {
          id: metric.id,
          delta: metric.delta,
          navigationType: metric.navigationType,
          entries: metric.entries.map((e) => ({
            name: e.name,
            startTime: e.startTime,
            duration: e.duration,
          })),
        },
      };

      this.reporter.queueEvent({
        type: 'metric',
        timestamp: Date.now(),
        session: this.sessionManager.getSession(),
        page: getPageContext(),
        device: getDeviceInfo(),
        data: entry,
      });

      if (this.config.debug) {
        console.log(`[RUM] ${metric.name}:`, metric.value, `(${metric.rating})`);
      }
    };

    // Collect all Core Web Vitals
    onLCP(reportMetric);
    onINP(reportMetric);
    onCLS(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
  }
}
```

### React Component Integration

```tsx
// src/rum/RUMProvider.tsx

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { RUMConfig, MetricEntry } from './types';
import { RUMClient } from './index';

interface RUMContextValue {
  client: RUMClient | null;
  trackEvent: (name: string, data?: Record<string, unknown>) => void;
  trackError: (error: Error, componentStack?: string) => void;
  getMetrics: () => Map<string, MetricEntry>;
}

const RUMContext = createContext<RUMContextValue>({
  client: null,
  trackEvent: () => {},
  trackError: () => {},
  getMetrics: () => new Map(),
});

interface RUMProviderProps {
  config: RUMConfig;
  children: React.ReactNode;
}

export function RUMProvider({ config, children }: RUMProviderProps): JSX.Element {
  const clientRef = useRef<RUMClient | null>(null);

  useEffect(() => {
    // Initialize RUM client
    clientRef.current = new RUMClient(config);
    clientRef.current.start();

    return () => {
      clientRef.current?.stop();
    };
  }, [config]);

  const trackEvent = (name: string, data?: Record<string, unknown>) => {
    clientRef.current?.trackCustomEvent(name, data);
  };

  const trackError = (error: Error, componentStack?: string) => {
    clientRef.current?.trackError(error, componentStack);
  };

  const getMetrics = () => {
    return clientRef.current?.getMetrics() || new Map();
  };

  return (
    <RUMContext.Provider value={{ client: clientRef.current, trackEvent, trackError, getMetrics }}>
      {children}
    </RUMContext.Provider>
  );
}

export function useRUM(): RUMContextValue {
  return useContext(RUMContext);
}
```

### React Error Boundary with RUM

```tsx
// src/rum/RUMErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRUM } from './RUMProvider';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RUMErrorBoundaryClass extends Component<Props & { trackError: (error: Error, componentStack?: string) => void }, State> {
  constructor(props: Props & { trackError: (error: Error, componentStack?: string) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Track error in RUM
    this.props.trackError(error, errorInfo.componentStack || undefined);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!);
      }
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>We have been notified and are working to fix the issue.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RUMErrorBoundary(props: Props): JSX.Element {
  const { trackError } = useRUM();
  return <RUMErrorBoundaryClass {...props} trackError={trackError} />;
}
```

---

## 6. Custom Metrics Collection

### Component Render Timing

```tsx
// src/rum/hooks/useRenderTiming.ts

import { useEffect, useRef } from 'react';
import { useRUM } from '../RUMProvider';

export function useRenderTiming(componentName: string): void {
  const { trackEvent } = useRUM();
  const mountTime = useRef<number>(0);

  useEffect(() => {
    const renderTime = performance.now() - mountTime.current;
    trackEvent('component_render', {
      component: componentName,
      duration: renderTime,
    });
  });

  // Capture time before render starts
  mountTime.current = performance.now();
}

// Usage
function ProductList({ products }: { products: Product[] }) {
  useRenderTiming('ProductList');

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Interaction Timing Hook

```tsx
// src/rum/hooks/useInteractionTiming.ts

import { useCallback, useRef } from 'react';
import { useRUM } from '../RUMProvider';

interface InteractionOptions {
  name: string;
  metadata?: Record<string, unknown>;
}

export function useInteractionTiming(): {
  startInteraction: (options: InteractionOptions) => void;
  endInteraction: () => void;
} {
  const { trackEvent } = useRUM();
  const interactionRef = useRef<{ name: string; startTime: number; metadata?: Record<string, unknown> } | null>(null);

  const startInteraction = useCallback((options: InteractionOptions) => {
    interactionRef.current = {
      name: options.name,
      startTime: performance.now(),
      metadata: options.metadata,
    };
  }, []);

  const endInteraction = useCallback(() => {
    if (interactionRef.current) {
      const duration = performance.now() - interactionRef.current.startTime;
      trackEvent('interaction', {
        name: interactionRef.current.name,
        duration,
        ...interactionRef.current.metadata,
      });
      interactionRef.current = null;
    }
  }, [trackEvent]);

  return { startInteraction, endInteraction };
}

// Usage
function SearchForm() {
  const { startInteraction, endInteraction } = useInteractionTiming();
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (query: string) => {
    startInteraction({ name: 'search', metadata: { queryLength: query.length } });

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
    } finally {
      endInteraction();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}>
      {/* ... */}
    </form>
  );
}
```

### Data Fetching Performance

```tsx
// src/rum/hooks/useTrackedFetch.ts

import { useState, useCallback } from 'react';
import { useRUM } from '../RUMProvider';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface FetchOptions {
  name: string;
  metadata?: Record<string, unknown>;
}

export function useTrackedFetch<T>(): [
  FetchState<T>,
  (url: string, options?: FetchOptions & RequestInit) => Promise<T>
] {
  const { trackEvent, trackError } = useRUM();
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async (url: string, options?: FetchOptions & RequestInit): Promise<T> => {
    const startTime = performance.now();
    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      trackEvent('fetch_success', {
        name: options?.name || url,
        url,
        duration,
        status: response.status,
        size: response.headers.get('content-length'),
        ...options?.metadata,
      });

      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const duration = performance.now() - startTime;

      trackEvent('fetch_error', {
        name: options?.name || url,
        url,
        duration,
        error: (error as Error).message,
        ...options?.metadata,
      });

      trackError(error as Error);
      setState({ data: null, loading: false, error: error as Error });
      throw error;
    }
  }, [trackEvent, trackError]);

  return [state, fetchData];
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const [{ data: user, loading, error }, fetchUser] = useTrackedFetch<User>();

  useEffect(() => {
    fetchUser(`/api/users/${userId}`, {
      name: 'fetch_user_profile',
      metadata: { userId },
    });
  }, [userId, fetchUser]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileCard user={user!} />;
}
```

---

## 7. User Session Tracking

```typescript
// src/rum/session.ts

import { SessionData, RUMConfig } from './types';
import { generateId } from './utils';

const SESSION_KEY = 'rum_session';

export class SessionManager {
  private config: RUMConfig;
  private session: SessionData;
  private activityTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RUMConfig) {
    this.config = config;
    this.session = this.initSession();
    this.startActivityTracking();
  }

  private initSession(): SessionData {
    const stored = this.getStoredSession();

    if (stored && this.isSessionValid(stored)) {
      return {
        ...stored,
        pageViews: stored.pageViews + 1,
        lastActivity: Date.now(),
      };
    }

    return this.createNewSession();
  }

  private getStoredSession(): SessionData | null {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private isSessionValid(session: SessionData): boolean {
    const now = Date.now();
    const elapsed = now - session.lastActivity;
    return elapsed < this.config.sessionTimeout;
  }

  private createNewSession(): SessionData {
    const session: SessionData = {
      sessionId: generateId(),
      startTime: Date.now(),
      pageViews: 1,
      lastActivity: Date.now(),
    };

    this.saveSession(session);
    return session;
  }

  private saveSession(session: SessionData): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage full or disabled
    }
  }

  private startActivityTracking(): void {
    // Update activity on user interactions
    const updateActivity = () => {
      this.session.lastActivity = Date.now();
      this.saveSession(this.session);
    };

    ['click', 'scroll', 'keypress', 'mousemove'].forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session validity periodically
    this.activityTimer = setInterval(() => {
      if (!this.isSessionValid(this.session)) {
        this.session = this.createNewSession();
      }
    }, 60000);
  }

  public getSession(): SessionData {
    return { ...this.session };
  }

  public setUserId(userId: string): void {
    this.session.userId = userId;
    this.saveSession(this.session);
  }

  public endSession(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    sessionStorage.removeItem(SESSION_KEY);
  }
}
```

---

## 8. Error and Crash Reporting

```typescript
// src/rum/errors.ts

import { ErrorData, RUMConfig, RUMEvent } from './types';
import { getDeviceInfo, getPageContext } from './utils';
import { SessionManager } from './session';
import { Reporter } from './reporter';

export class ErrorTracker {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private reporter: Reporter;
  private errorCount: Map<string, number> = new Map();

  constructor(config: RUMConfig, sessionManager: SessionManager, reporter: Reporter) {
    this.config = config;
    this.sessionManager = sessionManager;
    this.reporter = reporter;
  }

  public start(): void {
    if (!this.config.enableErrorTracking) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: event.error?.name || 'Error',
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      this.captureError({
        message: error?.message || String(error),
        stack: error?.stack,
        type: 'UnhandledRejection',
      });
    });
  }

  public captureError(errorData: ErrorData): void {
    // Deduplicate errors
    const errorKey = `${errorData.type}:${errorData.message}:${errorData.filename}:${errorData.lineno}`;
    const count = (this.errorCount.get(errorKey) || 0) + 1;
    this.errorCount.set(errorKey, count);

    // Rate limit: only send first 5 occurrences per session
    if (count > 5) {
      if (this.config.debug) {
        console.log(`[RUM] Error rate limited: ${errorData.message}`);
      }
      return;
    }

    const event: RUMEvent = {
      type: 'error',
      timestamp: Date.now(),
      session: this.sessionManager.getSession(),
      page: getPageContext(),
      device: getDeviceInfo(),
      data: {
        ...errorData,
        occurrences: count,
      } as ErrorData,
    };

    this.reporter.queueEvent(event);

    if (this.config.debug) {
      console.error(`[RUM] Captured error:`, errorData);
    }
  }

  public captureReactError(error: Error, componentStack?: string): void {
    this.captureError({
      message: error.message,
      stack: error.stack,
      type: error.name,
      componentStack,
    });
  }
}
```

---

## 9. Network Request Monitoring

```typescript
// src/rum/network.ts

import { ResourceData, RUMConfig, RUMEvent } from './types';
import { getDeviceInfo, getPageContext } from './utils';
import { SessionManager } from './session';
import { Reporter } from './reporter';

export class NetworkMonitor {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private reporter: Reporter;
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;

  constructor(config: RUMConfig, sessionManager: SessionManager, reporter: Reporter) {
    this.config = config;
    this.sessionManager = sessionManager;
    this.reporter = reporter;
    this.originalFetch = window.fetch.bind(window);
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  public start(): void {
    if (!this.config.enableNetworkTracking) return;

    this.interceptFetch();
    this.interceptXHR();
  }

  public stop(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
  }

  private interceptFetch(): void {
    const self = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      try {
        const response = await self.originalFetch(input, init);
        const duration = performance.now() - startTime;

        self.recordRequest({
          url,
          method,
          status: response.status,
          duration,
          size: parseInt(response.headers.get('content-length') || '0', 10),
          success: response.ok,
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        self.recordRequest({
          url,
          method,
          status: 0,
          duration,
          size: 0,
          success: false,
          error: (error as Error).message,
        });

        throw error;
      }
    };
  }

  private interceptXHR(): void {
    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      (this as any)._rumMethod = method;
      (this as any)._rumUrl = url.toString();
      (this as any)._rumStartTime = 0;
      return self.originalXHROpen.call(this, method, url, async ?? true, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
      (this as any)._rumStartTime = performance.now();

      this.addEventListener('loadend', function () {
        const duration = performance.now() - (this as any)._rumStartTime;

        self.recordRequest({
          url: (this as any)._rumUrl,
          method: (this as any)._rumMethod,
          status: this.status,
          duration,
          size: parseInt(this.getResponseHeader('content-length') || '0', 10),
          success: this.status >= 200 && this.status < 400,
        });
      });

      return self.originalXHRSend.call(this, body);
    };
  }

  private recordRequest(data: {
    url: string;
    method: string;
    status: number;
    duration: number;
    size: number;
    success: boolean;
    error?: string;
  }): void {
    // Filter out RUM endpoint requests to avoid infinite loops
    if (data.url.includes(this.config.endpoint)) return;

    const event: RUMEvent = {
      type: 'resource',
      timestamp: Date.now(),
      session: this.sessionManager.getSession(),
      page: getPageContext(),
      device: getDeviceInfo(),
      data: {
        name: data.url,
        initiatorType: 'fetch',
        duration: data.duration,
        transferSize: data.size,
        encodedBodySize: data.size,
        decodedBodySize: data.size,
        method: data.method,
        status: data.status,
        success: data.success,
        error: data.error,
      } as ResourceData & { method: string; status: number; success: boolean; error?: string },
    };

    this.reporter.queueEvent(event);
  }
}
```

---

## 10. React-Specific Performance Patterns

### Profiler Integration

```tsx
// src/rum/ReactProfiler.tsx

import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { useRUM } from './RUMProvider';

interface RUMProfilerProps {
  id: string;
  children: React.ReactNode;
  threshold?: number; // Only report renders above this threshold (ms)
}

export function RUMProfiler({ id, children, threshold = 16 }: RUMProfilerProps): JSX.Element {
  const { trackEvent } = useRUM();

  const onRender: ProfilerOnRenderCallback = (
    profilerId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    // Only track renders above threshold
    if (actualDuration >= threshold) {
      trackEvent('react_render', {
        component: profilerId,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      });
    }
  };

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

// Usage
function App() {
  return (
    <RUMProfiler id="App" threshold={10}>
      <Header />
      <RUMProfiler id="MainContent" threshold={5}>
        <MainContent />
      </RUMProfiler>
      <Footer />
    </RUMProfiler>
  );
}
```

### Route Change Tracking

```tsx
// src/rum/hooks/useRouteTracking.ts

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useRUM } from '../RUMProvider';

export function useRouteTracking(): void {
  const location = useLocation();
  const { trackEvent } = useRUM();
  const previousPath = useRef<string | null>(null);
  const navigationStartRef = useRef<number>(0);

  useEffect(() => {
    const currentPath = location.pathname;

    if (previousPath.current !== null && previousPath.current !== currentPath) {
      // Route change detected
      const duration = performance.now() - navigationStartRef.current;

      trackEvent('route_change', {
        from: previousPath.current,
        to: currentPath,
        duration,
        search: location.search,
        hash: location.hash,
      });
    }

    previousPath.current = currentPath;
    navigationStartRef.current = performance.now();
  }, [location, trackEvent]);
}

// Usage in App component
function App() {
  useRouteTracking();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      {/* ... */}
    </Routes>
  );
}
```

### Lazy Load Tracking

```tsx
// src/rum/lazyWithRUM.tsx

import React, { Suspense, lazy, ComponentType } from 'react';
import { useRUM } from './RUMProvider';

interface LazyOptions {
  chunkName: string;
  fallback?: React.ReactNode;
}

export function lazyWithRUM<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions
): React.LazyExoticComponent<T> {
  const LazyComponent = lazy(async () => {
    const startTime = performance.now();

    try {
      const module = await importFn();
      const duration = performance.now() - startTime;

      // We will track this in the wrapper
      (LazyComponent as any).__rumLoadTime = duration;
      (LazyComponent as any).__rumChunkName = options.chunkName;

      return module;
    } catch (error) {
      const duration = performance.now() - startTime;
      (LazyComponent as any).__rumLoadError = error;
      (LazyComponent as any).__rumLoadTime = duration;
      throw error;
    }
  });

  return LazyComponent;
}

// Wrapper component that tracks the load
export function TrackedSuspense({
  children,
  fallback,
  chunkName,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  chunkName: string;
}): JSX.Element {
  const { trackEvent } = useRUM();
  const loadStartRef = React.useRef(performance.now());
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!loaded) {
      const checkLoaded = () => {
        setLoaded(true);
        const duration = performance.now() - loadStartRef.current;
        trackEvent('lazy_load', {
          chunkName,
          duration,
        });
      };

      // Small delay to ensure component has mounted
      const timer = setTimeout(checkLoaded, 0);
      return () => clearTimeout(timer);
    }
  }, [loaded, chunkName, trackEvent]);

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

// Usage
const ProductDetails = lazyWithRUM(
  () => import('./pages/ProductDetails'),
  { chunkName: 'ProductDetails' }
);

function App() {
  return (
    <TrackedSuspense fallback={<Spinner />} chunkName="ProductDetails">
      <ProductDetails />
    </TrackedSuspense>
  );
}
```

---

## 11. Data Aggregation and Analysis

### Reporter Implementation

```typescript
// src/rum/reporter.ts

import { RUMConfig, RUMEvent } from './types';

export class Reporter {
  private config: RUMConfig;
  private queue: RUMEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing: boolean = false;

  constructor(config: RUMConfig) {
    this.config = config;
  }

  public start(): void {
    // Periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Flush on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });

    // Flush before unload
    window.addEventListener('pagehide', () => {
      this.flush(true);
    });
  }

  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }

  public queueEvent(event: RUMEvent): void {
    this.queue.push(event);

    // Flush if queue is full
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  private async flush(useBeacon: boolean = false): Promise<void> {
    if (this.queue.length === 0 || this.isFlushing) return;

    const events = this.queue.splice(0, this.config.maxBatchSize);
    this.isFlushing = true;

    const payload = JSON.stringify({
      events,
      timestamp: Date.now(),
    });

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliability during page unload
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(this.config.endpoint, blob);
      } else {
        // Use fetch for normal operation
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
          },
          body: payload,
          keepalive: true, // Allows request to outlive page
        });
      }

      if (this.config.debug) {
        console.log(`[RUM] Sent ${events.length} events`);
      }
    } catch (error) {
      // Re-queue failed events
      this.queue.unshift(...events);

      if (this.config.debug) {
        console.error('[RUM] Failed to send events:', error);
      }
    } finally {
      this.isFlushing = false;
    }
  }
}
```

---

## 12. Sampling Strategies

```typescript
// src/rum/sampling.ts

import { RUMConfig, SessionData } from './types';

export type SamplingDecision = 'include' | 'exclude';

export interface SamplingRule {
  name: string;
  condition: (session: SessionData, page: { url: string; path: string }) => boolean;
  rate: number;
}

export class SamplingManager {
  private config: RUMConfig;
  private rules: SamplingRule[] = [];
  private decision: SamplingDecision | null = null;

  constructor(config: RUMConfig) {
    this.config = config;
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    // Always sample errors (handled separately)

    // Higher sampling for important pages
    this.addRule({
      name: 'checkout_pages',
      condition: (_, page) => page.path.includes('/checkout'),
      rate: 1.0, // 100% sampling for checkout
    });

    // Lower sampling for high-traffic pages
    this.addRule({
      name: 'homepage',
      condition: (_, page) => page.path === '/',
      rate: 0.1, // 10% sampling for homepage
    });

    // Default sampling rate
    this.addRule({
      name: 'default',
      condition: () => true,
      rate: this.config.sampleRate,
    });
  }

  public addRule(rule: SamplingRule): void {
    this.rules.push(rule);
  }

  public shouldSample(session: SessionData, page: { url: string; path: string }): boolean {
    // Consistent sampling per session
    if (this.decision !== null) {
      return this.decision === 'include';
    }

    // Find matching rule
    for (const rule of this.rules) {
      if (rule.condition(session, page)) {
        const shouldInclude = Math.random() < rule.rate;
        this.decision = shouldInclude ? 'include' : 'exclude';

        if (this.config.debug) {
          console.log(`[RUM] Sampling decision: ${this.decision} (rule: ${rule.name}, rate: ${rule.rate})`);
        }

        return shouldInclude;
      }
    }

    return true;
  }

  public resetDecision(): void {
    this.decision = null;
  }
}
```

---

## 13. Privacy Considerations

```typescript
// src/rum/privacy.ts

export interface PrivacyConfig {
  maskUrls: boolean;
  maskUserAgent: boolean;
  excludePatterns: RegExp[];
  piiPatterns: RegExp[];
}

export class PrivacyFilter {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = {
      maskUrls: config.maskUrls ?? true,
      maskUserAgent: config.maskUserAgent ?? false,
      excludePatterns: config.excludePatterns ?? [
        /token=/i,
        /password=/i,
        /secret=/i,
        /auth=/i,
      ],
      piiPatterns: config.piiPatterns ?? [
        /\b[\w.-]+@[\w.-]+\.\w+\b/g, // Email
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
        /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // SSN
      ],
    };
  }

  public sanitizeUrl(url: string): string {
    if (!this.config.maskUrls) return url;

    try {
      const urlObj = new URL(url);

      // Remove query params that match exclude patterns
      const params = new URLSearchParams(urlObj.search);
      for (const [key] of params) {
        if (this.config.excludePatterns.some((pattern) => pattern.test(key))) {
          params.set(key, '[REDACTED]');
        }
      }

      urlObj.search = params.toString();

      // Mask path parameters that look like IDs
      urlObj.pathname = urlObj.pathname.replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/[UUID]'
      ).replace(
        /\/\d{5,}/g,
        '/[ID]'
      );

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  public sanitizeText(text: string): string {
    let sanitized = text;

    for (const pattern of this.config.piiPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  public sanitizeUserAgent(userAgent: string): string {
    if (!this.config.maskUserAgent) return userAgent;

    // Keep only browser and OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    const osMatch = userAgent.match(/(Windows|Mac OS X|Linux|Android|iOS)[\s\d._]*/);

    return [browserMatch?.[0], osMatch?.[0]].filter(Boolean).join(' ') || 'Unknown';
  }

  public shouldExcludeUrl(url: string): boolean {
    return this.config.excludePatterns.some((pattern) => pattern.test(url));
  }
}
```

---

## 14. Building a RUM Dashboard

### Metrics Aggregation Utilities

```typescript
// src/rum/analytics.ts

import { MetricEntry } from './types';

export interface AggregatedMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
  count: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
}

export function aggregateMetrics(metrics: MetricEntry[]): AggregatedMetrics {
  if (metrics.length === 0) {
    return {
      p50: 0, p75: 0, p90: 0, p95: 0, p99: 0,
      mean: 0, count: 0,
      goodCount: 0, needsImprovementCount: 0, poorCount: 0,
    };
  }

  const values = metrics.map((m) => m.value).sort((a, b) => a - b);

  const percentile = (p: number): number => {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  };

  return {
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
    goodCount: metrics.filter((m) => m.rating === 'good').length,
    needsImprovementCount: metrics.filter((m) => m.rating === 'needs-improvement').length,
    poorCount: metrics.filter((m) => m.rating === 'poor').length,
  };
}

export function calculateWebVitalsScore(metrics: {
  lcp?: AggregatedMetrics;
  inp?: AggregatedMetrics;
  cls?: AggregatedMetrics;
}): number {
  const weights = { lcp: 0.4, inp: 0.3, cls: 0.3 };
  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const metric = metrics[key as keyof typeof metrics];
    if (metric && metric.count > 0) {
      const goodRatio = metric.goodCount / metric.count;
      score += goodRatio * weight * 100;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}
```

### Dashboard Component

```tsx
// src/components/RUMDashboard.tsx

import React, { useState, useEffect } from 'react';
import { aggregateMetrics, calculateWebVitalsScore, AggregatedMetrics } from '../rum/analytics';

interface DashboardData {
  lcp: AggregatedMetrics;
  inp: AggregatedMetrics;
  cls: AggregatedMetrics;
  fcp: AggregatedMetrics;
  ttfb: AggregatedMetrics;
  errorRate: number;
  totalSessions: number;
  avgSessionDuration: number;
}

export function RUMDashboard(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    fetchDashboardData(timeRange).then(setData);
  }, [timeRange]);

  if (!data) return <div>Loading...</div>;

  const webVitalsScore = calculateWebVitalsScore({
    lcp: data.lcp,
    inp: data.inp,
    cls: data.cls,
  });

  return (
    <div className="rum-dashboard">
      <header>
        <h1>Real User Monitoring</h1>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)}>
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </header>

      <div className="score-card">
        <h2>Web Vitals Score</h2>
        <div className={`score ${webVitalsScore >= 75 ? 'good' : webVitalsScore >= 50 ? 'medium' : 'poor'}`}>
          {webVitalsScore.toFixed(0)}
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard title="LCP" metric={data.lcp} unit="ms" target={2500} />
        <MetricCard title="INP" metric={data.inp} unit="ms" target={200} />
        <MetricCard title="CLS" metric={data.cls} unit="" target={0.1} />
        <MetricCard title="FCP" metric={data.fcp} unit="ms" target={1800} />
        <MetricCard title="TTFB" metric={data.ttfb} unit="ms" target={800} />
      </div>

      <div className="stats-row">
        <StatCard title="Total Sessions" value={data.totalSessions.toLocaleString()} />
        <StatCard title="Error Rate" value={`${(data.errorRate * 100).toFixed(2)}%`} />
        <StatCard title="Avg Session Duration" value={`${(data.avgSessionDuration / 60000).toFixed(1)} min`} />
      </div>
    </div>
  );
}

function MetricCard({ title, metric, unit, target }: {
  title: string;
  metric: AggregatedMetrics;
  unit: string;
  target: number;
}): JSX.Element {
  const p75Value = metric.p75;
  const status = p75Value <= target ? 'good' : p75Value <= target * 1.5 ? 'medium' : 'poor';

  return (
    <div className={`metric-card ${status}`}>
      <h3>{title}</h3>
      <div className="value">{p75Value.toFixed(unit === 'ms' ? 0 : 3)}{unit}</div>
      <div className="label">P75</div>
      <div className="distribution">
        <div className="bar good" style={{ width: `${(metric.goodCount / metric.count) * 100}%` }} />
        <div className="bar medium" style={{ width: `${(metric.needsImprovementCount / metric.count) * 100}%` }} />
        <div className="bar poor" style={{ width: `${(metric.poorCount / metric.count) * 100}%` }} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }): JSX.Element {
  return (
    <div className="stat-card">
      <div className="title">{title}</div>
      <div className="value">{value}</div>
    </div>
  );
}

async function fetchDashboardData(timeRange: string): Promise<DashboardData> {
  const response = await fetch(`/api/rum/dashboard?range=${timeRange}`);
  return response.json();
}
```

---

## 15. Integration with OneUptime

### Complete RUM Client

```typescript
// src/rum/index.ts

import { RUMConfig, MetricEntry } from './types';
import { SessionManager } from './session';
import { Reporter } from './reporter';
import { MetricsCollector } from './collector';
import { WebVitalsCollector } from './vitals';
import { ErrorTracker } from './errors';
import { NetworkMonitor } from './network';
import { SamplingManager } from './sampling';
import { PrivacyFilter } from './privacy';
import { getPageContext, getDeviceInfo } from './utils';

export class RUMClient {
  private config: RUMConfig;
  private sessionManager: SessionManager;
  private reporter: Reporter;
  private metricsCollector: MetricsCollector;
  private webVitalsCollector: WebVitalsCollector;
  private errorTracker: ErrorTracker;
  private networkMonitor: NetworkMonitor;
  private samplingManager: SamplingManager;
  private privacyFilter: PrivacyFilter;
  private isStarted: boolean = false;

  constructor(config: Partial<RUMConfig>) {
    this.config = {
      endpoint: config.endpoint || 'https://oneuptime.com/api/rum/ingest',
      apiKey: config.apiKey || '',
      sampleRate: config.sampleRate ?? 1.0,
      sessionTimeout: config.sessionTimeout ?? 30 * 60 * 1000, // 30 minutes
      enableErrorTracking: config.enableErrorTracking ?? true,
      enableNetworkTracking: config.enableNetworkTracking ?? true,
      enableResourceTiming: config.enableResourceTiming ?? true,
      maxBatchSize: config.maxBatchSize ?? 25,
      flushInterval: config.flushInterval ?? 5000,
      debug: config.debug ?? false,
    };

    this.sessionManager = new SessionManager(this.config);
    this.reporter = new Reporter(this.config);
    this.metricsCollector = new MetricsCollector(this.config, this.sessionManager, this.reporter);
    this.webVitalsCollector = new WebVitalsCollector(this.config, this.sessionManager, this.reporter);
    this.errorTracker = new ErrorTracker(this.config, this.sessionManager, this.reporter);
    this.networkMonitor = new NetworkMonitor(this.config, this.sessionManager, this.reporter);
    this.samplingManager = new SamplingManager(this.config);
    this.privacyFilter = new PrivacyFilter();
  }

  public start(): void {
    if (this.isStarted) return;

    const page = getPageContext();
    if (!this.samplingManager.shouldSample(this.sessionManager.getSession(), page)) {
      if (this.config.debug) {
        console.log('[RUM] Session excluded by sampling');
      }
      return;
    }

    this.reporter.start();
    this.metricsCollector.start();
    this.webVitalsCollector.start();
    this.errorTracker.start();
    this.networkMonitor.start();
    this.isStarted = true;

    if (this.config.debug) {
      console.log('[RUM] Started');
    }
  }

  public stop(): void {
    if (!this.isStarted) return;

    this.metricsCollector.stop();
    this.networkMonitor.stop();
    this.reporter.stop();
    this.isStarted = false;

    if (this.config.debug) {
      console.log('[RUM] Stopped');
    }
  }

  public trackCustomEvent(name: string, data?: Record<string, unknown>): void {
    if (!this.isStarted) return;

    this.reporter.queueEvent({
      type: 'interaction',
      timestamp: Date.now(),
      session: this.sessionManager.getSession(),
      page: getPageContext(),
      device: getDeviceInfo(),
      data: {
        type: 'custom',
        target: name,
        duration: 0,
        timestamp: Date.now(),
        ...data,
      },
    });
  }

  public trackError(error: Error, componentStack?: string): void {
    if (!this.isStarted) return;
    this.errorTracker.captureReactError(error, componentStack);
  }

  public setUserId(userId: string): void {
    this.sessionManager.setUserId(userId);
  }

  public getMetrics(): Map<string, MetricEntry> {
    return this.metricsCollector.getAllMetrics();
  }
}

// Export everything
export * from './types';
export * from './RUMProvider';
export * from './RUMErrorBoundary';
export * from './hooks/useRenderTiming';
export * from './hooks/useInteractionTiming';
export * from './hooks/useTrackedFetch';
export * from './hooks/useRouteTracking';
export * from './ReactProfiler';
export * from './lazyWithRUM';
```

### Usage Example

```tsx
// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RUMProvider, RUMErrorBoundary, useRUM, useRouteTracking } from './rum';

const rumConfig = {
  endpoint: process.env.REACT_APP_ONEUPTIME_RUM_ENDPOINT,
  apiKey: process.env.REACT_APP_ONEUPTIME_API_KEY,
  sampleRate: 1.0,
  enableErrorTracking: true,
  enableNetworkTracking: true,
  debug: process.env.NODE_ENV === 'development',
};

function AppContent() {
  useRouteTracking();
  const { trackEvent } = useRUM();

  // Track user authentication
  const handleLogin = async (credentials: LoginCredentials) => {
    const startTime = performance.now();
    try {
      const user = await loginUser(credentials);
      trackEvent('login_success', { duration: performance.now() - startTime });
      return user;
    } catch (error) {
      trackEvent('login_failure', {
        duration: performance.now() - startTime,
        error: (error as Error).message,
      });
      throw error;
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/checkout" element={<Checkout />} />
    </Routes>
  );
}

export function App() {
  return (
    <RUMProvider config={rumConfig}>
      <RUMErrorBoundary
        fallback={(error) => <ErrorPage error={error} />}
        onError={(error, errorInfo) => {
          console.error('Caught error:', error, errorInfo);
        }}
      >
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </RUMErrorBoundary>
    </RUMProvider>
  );
}
```

---

## 16. Summary

| Aspect | Implementation |
|--------|----------------|
| **Core Web Vitals** | LCP, INP, CLS tracked via Performance Observer and web-vitals library |
| **Custom Metrics** | Render timing, interaction timing, data fetching hooks |
| **Error Tracking** | Global error handler, React error boundary, unhandled rejections |
| **Network Monitoring** | Fetch and XHR interception for API call tracking |
| **Session Management** | Session storage with timeout and activity tracking |
| **Data Transmission** | Batched events with sendBeacon for reliability |
| **Sampling** | Configurable per-route sampling with session consistency |
| **Privacy** | URL sanitization, PII detection, configurable masking |
| **React Integration** | Context provider, hooks, profiler, error boundary |

### Key Metrics Summary

| Metric | Good | Needs Improvement | Poor | What It Measures |
|--------|------|-------------------|------|------------------|
| LCP | <= 2.5s | 2.5s - 4.0s | > 4.0s | Loading performance |
| INP | <= 200ms | 200ms - 500ms | > 500ms | Interactivity |
| CLS | <= 0.1 | 0.1 - 0.25 | > 0.25 | Visual stability |
| FCP | <= 1.8s | 1.8s - 3.0s | > 3.0s | First content render |
| TTFB | <= 800ms | 800ms - 1800ms | > 1800ms | Server response time |

### Best Practices

1. **Start simple**: Begin with Core Web Vitals before adding custom metrics
2. **Sample appropriately**: Use higher sampling for critical paths, lower for high-traffic pages
3. **Protect privacy**: Sanitize URLs, mask PII, respect user consent
4. **Batch transmissions**: Reduce network overhead with batched reporting
5. **Use sendBeacon**: Ensure data is sent even during page unload
6. **Monitor trends**: Focus on percentiles (p75, p90) over averages
7. **Correlate with business metrics**: Connect performance to conversion and engagement
8. **Set up alerts**: Get notified when metrics degrade beyond thresholds

Real User Monitoring transforms performance optimization from guesswork into data-driven improvement. By understanding how real users experience your React application across diverse conditions, you can prioritize optimizations that matter most.

---

*Send your RUM data to [OneUptime](https://oneuptime.com) for unified observability across frontend performance, backend traces, and infrastructure metrics.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) - Connect frontend performance with backend distributed tracing
- [How to Instrument Express.js Applications with OpenTelemetry](/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view) - Complete backend observability for your Node.js APIs
- [Three Pillars of Observability: Logs, Metrics, Traces](/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view) - Understand the full observability landscape
