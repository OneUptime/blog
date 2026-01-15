# How to Track App Performance Metrics in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Performance, Metrics, Monitoring, Mobile Development, Analytics

Description: Learn how to track and monitor key performance metrics in React Native applications for optimal user experience.

---

## Introduction

Performance is a critical factor that determines the success of any mobile application. Users expect apps to be fast, responsive, and smooth. In React Native, tracking performance metrics becomes even more important because you're dealing with a bridge between JavaScript and native code. Understanding where bottlenecks occur and how to measure them is essential for delivering a great user experience.

This comprehensive guide will walk you through everything you need to know about tracking app performance metrics in React Native, from measuring app launch times to setting up continuous monitoring systems.

## Key Performance Metrics for Mobile Apps

Before diving into implementation, let's understand the critical performance metrics you should be tracking in your React Native application.

### Time to Interactive (TTI)

Time to Interactive measures how long it takes for your app to become fully interactive after launch. This includes:

- Initial JavaScript bundle loading
- Native module initialization
- First meaningful content render
- Event handlers being ready

### Frame Rate (FPS)

Frame rate measures how smoothly your UI renders. The target is 60 frames per second (FPS), which means each frame should render within 16.67 milliseconds.

### Memory Usage

Memory consumption affects app stability and device performance. High memory usage can lead to:

- App crashes
- System killing your app in the background
- Poor overall device performance

### Network Performance

Network metrics include:

- Request latency
- Response time
- Payload sizes
- Error rates

### JavaScript Thread Performance

Since React Native runs JavaScript on a separate thread, monitoring its performance is crucial for understanding UI responsiveness.

## Measuring App Launch Time

App launch time is often the first impression users have of your application. Here's how to measure it effectively.

### Basic Launch Time Measurement

```javascript
// App.tsx
import React, { useEffect } from 'react';
import { PerformanceObserver, performance } from 'perf_hooks';

const APP_START_TIME = Date.now();

const App: React.FC = () => {
  useEffect(() => {
    const launchTime = Date.now() - APP_START_TIME;
    console.log(`App launch time: ${launchTime}ms`);

    // Send to analytics
    trackMetric('app_launch_time', launchTime);
  }, []);

  return (
    // Your app content
  );
};

export default App;
```

### Native Module for Precise Measurement

For more accurate measurements, create a native module.

#### iOS Implementation (AppLaunchMetrics.m)

```objective-c
#import "AppLaunchMetrics.h"
#import <React/RCTBridgeModule.h>

@implementation AppLaunchMetrics

RCT_EXPORT_MODULE();

static CFAbsoluteTime appStartTime;

+ (void)load {
    appStartTime = CFAbsoluteTimeGetCurrent();
}

RCT_EXPORT_METHOD(getAppStartTime:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    CFAbsoluteTime currentTime = CFAbsoluteTimeGetCurrent();
    double launchTime = (currentTime - appStartTime) * 1000;
    resolve(@(launchTime));
}

RCT_EXPORT_METHOD(markFirstRender) {
    CFAbsoluteTime currentTime = CFAbsoluteTimeGetCurrent();
    double timeToFirstRender = (currentTime - appStartTime) * 1000;
    NSLog(@"Time to first render: %f ms", timeToFirstRender);
}

@end
```

#### Android Implementation (AppLaunchMetrics.java)

```java
package com.yourapp.metrics;

import android.os.SystemClock;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AppLaunchMetrics extends ReactContextBaseJavaModule {
    private static long appStartTime = SystemClock.elapsedRealtime();

    public AppLaunchMetrics(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppLaunchMetrics";
    }

    @ReactMethod
    public void getAppStartTime(Promise promise) {
        long currentTime = SystemClock.elapsedRealtime();
        long launchTime = currentTime - appStartTime;
        promise.resolve((double) launchTime);
    }

    @ReactMethod
    public void markFirstRender() {
        long currentTime = SystemClock.elapsedRealtime();
        long timeToFirstRender = currentTime - appStartTime;
        System.out.println("Time to first render: " + timeToFirstRender + " ms");
    }
}
```

### Using the Native Module

```typescript
// hooks/useAppLaunchMetrics.ts
import { NativeModules } from 'react-native';
import { useEffect, useState } from 'react';

const { AppLaunchMetrics } = NativeModules;

interface LaunchMetrics {
  launchTime: number | null;
  isLoading: boolean;
}

export const useAppLaunchMetrics = (): LaunchMetrics => {
  const [metrics, setMetrics] = useState<LaunchMetrics>({
    launchTime: null,
    isLoading: true,
  });

  useEffect(() => {
    const measureLaunchTime = async () => {
      try {
        const launchTime = await AppLaunchMetrics.getAppStartTime();
        setMetrics({
          launchTime,
          isLoading: false,
        });

        // Report to monitoring service
        reportMetric('app_launch_time_ms', launchTime);
      } catch (error) {
        console.error('Failed to measure launch time:', error);
        setMetrics({
          launchTime: null,
          isLoading: false,
        });
      }
    };

    measureLaunchTime();
  }, []);

  return metrics;
};
```

## Frame Rate Monitoring

Maintaining 60 FPS is crucial for a smooth user experience. Here's how to monitor frame rates in React Native.

### Using the React Native Performance Monitor

```typescript
// utils/frameRateMonitor.ts
import { FrameRateLogger } from 'react-native';

class FrameRateMonitor {
  private isMonitoring: boolean = false;
  private frameRates: number[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Enable frame rate logging in development
    if (__DEV__) {
      // React Native's built-in performance monitor
      console.log('Frame rate monitoring started');
    }

    this.intervalId = setInterval(() => {
      this.captureFrameRate();
    }, 1000);
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private captureFrameRate(): void {
    // Implementation depends on platform-specific APIs
    // This is a simplified example
  }

  getAverageFrameRate(): number {
    if (this.frameRates.length === 0) return 0;
    const sum = this.frameRates.reduce((a, b) => a + b, 0);
    return sum / this.frameRates.length;
  }

  getDroppedFrames(): number {
    return this.frameRates.filter(fps => fps < 55).length;
  }
}

export const frameRateMonitor = new FrameRateMonitor();
```

### Custom Frame Rate Hook

```typescript
// hooks/useFrameRate.ts
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

interface FrameRateMetrics {
  currentFPS: number;
  averageFPS: number;
  droppedFrames: number;
}

export const useFrameRate = (sampleDuration: number = 1000): FrameRateMetrics => {
  const [metrics, setMetrics] = useState<FrameRateMetrics>({
    currentFPS: 60,
    averageFPS: 60,
    droppedFrames: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const fpsHistory = useRef<number[]>([]);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const measureFrame = () => {
      if (!isActive) return;

      frameCount.current++;
      const currentTime = Date.now();
      const elapsed = currentTime - lastTime.current;

      if (elapsed >= sampleDuration) {
        const fps = Math.round((frameCount.current * 1000) / elapsed);
        fpsHistory.current.push(fps);

        // Keep last 60 samples (1 minute at 1-second intervals)
        if (fpsHistory.current.length > 60) {
          fpsHistory.current.shift();
        }

        const averageFPS = Math.round(
          fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
        );

        const droppedFrames = fpsHistory.current.filter(f => f < 55).length;

        setMetrics({
          currentFPS: fps,
          averageFPS,
          droppedFrames,
        });

        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationFrameId.current = requestAnimationFrame(measureFrame);
    };

    InteractionManager.runAfterInteractions(() => {
      animationFrameId.current = requestAnimationFrame(measureFrame);
    });

    return () => {
      isActive = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [sampleDuration]);

  return metrics;
};
```

## Memory Usage Tracking

Monitoring memory usage helps prevent crashes and ensures optimal performance.

### Memory Monitoring Utility

```typescript
// utils/memoryMonitor.ts
import { NativeModules, Platform } from 'react-native';

interface MemoryInfo {
  usedMemory: number;
  totalMemory: number;
  freeMemory: number;
  memoryWarningLevel: 'normal' | 'warning' | 'critical';
}

class MemoryMonitor {
  private memoryHistory: number[] = [];
  private readonly maxHistoryLength = 100;
  private warningThreshold = 0.7; // 70% usage
  private criticalThreshold = 0.85; // 85% usage

  async getMemoryInfo(): Promise<MemoryInfo> {
    try {
      // This requires a native module implementation
      const { MemoryMetrics } = NativeModules;

      if (MemoryMetrics) {
        const info = await MemoryMetrics.getMemoryInfo();
        this.recordMemoryUsage(info.usedMemory);
        return {
          ...info,
          memoryWarningLevel: this.calculateWarningLevel(info),
        };
      }

      // Fallback for when native module isn't available
      return this.getEstimatedMemoryInfo();
    } catch (error) {
      console.error('Failed to get memory info:', error);
      return this.getEstimatedMemoryInfo();
    }
  }

  private getEstimatedMemoryInfo(): MemoryInfo {
    // Rough estimation based on typical device specs
    return {
      usedMemory: 0,
      totalMemory: 0,
      freeMemory: 0,
      memoryWarningLevel: 'normal',
    };
  }

  private calculateWarningLevel(info: MemoryInfo): 'normal' | 'warning' | 'critical' {
    const usageRatio = info.usedMemory / info.totalMemory;

    if (usageRatio >= this.criticalThreshold) {
      return 'critical';
    } else if (usageRatio >= this.warningThreshold) {
      return 'warning';
    }
    return 'normal';
  }

  private recordMemoryUsage(usedMemory: number): void {
    this.memoryHistory.push(usedMemory);
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }
  }

  getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 10) return 'stable';

    const recent = this.memoryHistory.slice(-10);
    const earlier = this.memoryHistory.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const difference = recentAvg - earlierAvg;
    const threshold = earlierAvg * 0.05; // 5% threshold

    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  detectMemoryLeak(): boolean {
    const trend = this.getMemoryTrend();
    return trend === 'increasing' && this.memoryHistory.length >= this.maxHistoryLength;
  }
}

export const memoryMonitor = new MemoryMonitor();
```

### Memory Monitoring Hook

```typescript
// hooks/useMemoryMonitor.ts
import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { memoryMonitor } from '../utils/memoryMonitor';

interface MemoryMetrics {
  usedMemory: number;
  totalMemory: number;
  usagePercentage: number;
  warningLevel: 'normal' | 'warning' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
  potentialLeak: boolean;
}

export const useMemoryMonitor = (intervalMs: number = 5000): MemoryMetrics => {
  const [metrics, setMetrics] = useState<MemoryMetrics>({
    usedMemory: 0,
    totalMemory: 0,
    usagePercentage: 0,
    warningLevel: 'normal',
    trend: 'stable',
    potentialLeak: false,
  });

  const updateMetrics = useCallback(async () => {
    const info = await memoryMonitor.getMemoryInfo();
    const trend = memoryMonitor.getMemoryTrend();
    const potentialLeak = memoryMonitor.detectMemoryLeak();

    setMetrics({
      usedMemory: info.usedMemory,
      totalMemory: info.totalMemory,
      usagePercentage: info.totalMemory > 0
        ? (info.usedMemory / info.totalMemory) * 100
        : 0,
      warningLevel: info.memoryWarningLevel,
      trend,
      potentialLeak,
    });

    if (potentialLeak) {
      console.warn('Potential memory leak detected!');
      // Report to monitoring service
      reportWarning('potential_memory_leak', {
        usedMemory: info.usedMemory,
        totalMemory: info.totalMemory,
      });
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        updateMetrics();
        intervalId = setInterval(updateMetrics, intervalMs);
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial measurement
    updateMetrics();
    intervalId = setInterval(updateMetrics, intervalMs);

    return () => {
      subscription.remove();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalMs, updateMetrics]);

  return metrics;
};
```

## Network Request Timing

Monitoring network performance is essential for understanding app responsiveness.

### Network Performance Interceptor

```typescript
// utils/networkPerformance.ts
interface NetworkMetric {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  requestSize: number;
  responseSize: number;
  error?: string;
}

class NetworkPerformanceMonitor {
  private metrics: NetworkMetric[] = [];
  private readonly maxMetrics = 500;
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = global.fetch;
  }

  enable(): void {
    global.fetch = this.createInstrumentedFetch();
  }

  disable(): void {
    global.fetch = this.originalFetch;
  }

  private createInstrumentedFetch(): typeof fetch {
    const self = this;

    return async function instrumentedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      let requestSize = 0;
      if (init?.body) {
        requestSize = typeof init.body === 'string'
          ? init.body.length
          : JSON.stringify(init.body).length;
      }

      try {
        const response = await self.originalFetch(input, init);
        const endTime = performance.now();

        // Clone response to read body size without consuming it
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        const responseSize = responseText.length;

        const metric: NetworkMetric = {
          url,
          method,
          startTime,
          endTime,
          duration: endTime - startTime,
          status: response.status,
          requestSize,
          responseSize,
        };

        self.recordMetric(metric);

        return response;
      } catch (error) {
        const endTime = performance.now();

        const metric: NetworkMetric = {
          url,
          method,
          startTime,
          endTime,
          duration: endTime - startTime,
          status: 0,
          requestSize,
          responseSize: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        self.recordMetric(metric);

        throw error;
      }
    };
  }

  private recordMetric(metric: NetworkMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow requests
    if (metric.duration > 3000) {
      console.warn(`Slow network request: ${metric.url} took ${metric.duration}ms`);
    }
  }

  getMetrics(): NetworkMetric[] {
    return [...this.metrics];
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.metrics.length;
  }

  getSlowRequests(thresholdMs: number = 1000): NetworkMetric[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  getFailedRequests(): NetworkMetric[] {
    return this.metrics.filter(m => m.status >= 400 || m.error);
  }

  getMetricsByEndpoint(urlPattern: string): NetworkMetric[] {
    const regex = new RegExp(urlPattern);
    return this.metrics.filter(m => regex.test(m.url));
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const networkPerformanceMonitor = new NetworkPerformanceMonitor();
```

### Network Performance Hook

```typescript
// hooks/useNetworkPerformance.ts
import { useEffect, useState } from 'react';
import { networkPerformanceMonitor } from '../utils/networkPerformance';

interface NetworkStats {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  failedRequests: number;
  totalBytesTransferred: number;
}

export const useNetworkPerformance = (): NetworkStats => {
  const [stats, setStats] = useState<NetworkStats>({
    totalRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    failedRequests: 0,
    totalBytesTransferred: 0,
  });

  useEffect(() => {
    networkPerformanceMonitor.enable();

    const updateStats = () => {
      const metrics = networkPerformanceMonitor.getMetrics();

      setStats({
        totalRequests: metrics.length,
        averageResponseTime: networkPerformanceMonitor.getAverageResponseTime(),
        slowRequests: networkPerformanceMonitor.getSlowRequests().length,
        failedRequests: networkPerformanceMonitor.getFailedRequests().length,
        totalBytesTransferred: metrics.reduce(
          (sum, m) => sum + m.requestSize + m.responseSize,
          0
        ),
      });
    };

    const intervalId = setInterval(updateStats, 5000);

    return () => {
      clearInterval(intervalId);
      networkPerformanceMonitor.disable();
    };
  }, []);

  return stats;
};
```

## Screen Render Performance

Measuring how long screens take to render helps identify performance bottlenecks.

### Screen Performance Tracker

```typescript
// utils/screenPerformance.ts
interface ScreenRenderMetric {
  screenName: string;
  renderTime: number;
  timestamp: number;
  navigationParams?: Record<string, unknown>;
}

class ScreenPerformanceTracker {
  private metrics: Map<string, ScreenRenderMetric[]> = new Map();
  private activeScreens: Map<string, number> = new Map();

  startTracking(screenName: string): void {
    this.activeScreens.set(screenName, performance.now());
  }

  endTracking(screenName: string, navigationParams?: Record<string, unknown>): void {
    const startTime = this.activeScreens.get(screenName);
    if (!startTime) {
      console.warn(`No start time found for screen: ${screenName}`);
      return;
    }

    const renderTime = performance.now() - startTime;
    this.activeScreens.delete(screenName);

    const metric: ScreenRenderMetric = {
      screenName,
      renderTime,
      timestamp: Date.now(),
      navigationParams,
    };

    const existingMetrics = this.metrics.get(screenName) || [];
    existingMetrics.push(metric);

    // Keep last 50 metrics per screen
    if (existingMetrics.length > 50) {
      existingMetrics.shift();
    }

    this.metrics.set(screenName, existingMetrics);

    // Log slow renders
    if (renderTime > 500) {
      console.warn(`Slow screen render: ${screenName} took ${renderTime}ms`);
    }
  }

  getAverageRenderTime(screenName: string): number {
    const metrics = this.metrics.get(screenName);
    if (!metrics || metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / metrics.length;
  }

  getSlowestScreens(limit: number = 5): { screenName: string; avgTime: number }[] {
    const averages: { screenName: string; avgTime: number }[] = [];

    this.metrics.forEach((metrics, screenName) => {
      averages.push({
        screenName,
        avgTime: this.getAverageRenderTime(screenName),
      });
    });

    return averages
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  getAllMetrics(): Map<string, ScreenRenderMetric[]> {
    return new Map(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.activeScreens.clear();
  }
}

export const screenPerformanceTracker = new ScreenPerformanceTracker();
```

### Screen Performance HOC

```typescript
// components/withScreenPerformance.tsx
import React, { useEffect, useRef } from 'react';
import { screenPerformanceTracker } from '../utils/screenPerformance';

interface WithScreenPerformanceProps {
  screenName: string;
}

export function withScreenPerformance<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
): React.FC<P> {
  const WithScreenPerformance: React.FC<P> = (props) => {
    const hasTrackedRender = useRef(false);

    useEffect(() => {
      screenPerformanceTracker.startTracking(screenName);

      return () => {
        // Track when component unmounts (navigation away)
      };
    }, []);

    useEffect(() => {
      if (!hasTrackedRender.current) {
        // Use requestAnimationFrame to ensure render is complete
        requestAnimationFrame(() => {
          screenPerformanceTracker.endTracking(screenName);
          hasTrackedRender.current = true;
        });
      }
    });

    return <WrappedComponent {...props} />;
  };

  WithScreenPerformance.displayName = `WithScreenPerformance(${screenName})`;

  return WithScreenPerformance;
}
```

### Screen Performance Hook

```typescript
// hooks/useScreenPerformance.ts
import { useEffect, useRef } from 'react';
import { screenPerformanceTracker } from '../utils/screenPerformance';

export const useScreenPerformance = (screenName: string): void => {
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = performance.now();
    screenPerformanceTracker.startTracking(screenName);

    // Track initial render completion
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screenPerformanceTracker.endTracking(screenName);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [screenName]);
};
```

## JavaScript Execution Metrics

Monitoring JavaScript execution time helps identify computationally expensive operations.

### JavaScript Profiler

```typescript
// utils/jsProfiler.ts
interface ExecutionMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'function' | 'render' | 'effect' | 'callback';
}

class JavaScriptProfiler {
  private metrics: ExecutionMetric[] = [];
  private readonly maxMetrics = 1000;
  private activeProfiles: Map<string, number> = new Map();

  startProfile(name: string): void {
    this.activeProfiles.set(name, performance.now());
  }

  endProfile(name: string, category: ExecutionMetric['category'] = 'function'): number {
    const startTime = this.activeProfiles.get(name);
    if (!startTime) {
      console.warn(`No start time found for profile: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeProfiles.delete(name);

    const metric: ExecutionMetric = {
      name,
      duration,
      timestamp: Date.now(),
      category,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Warn on long-running operations
    if (duration > 16) {
      console.warn(`Long-running JS execution: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  profile<T>(name: string, fn: () => T, category: ExecutionMetric['category'] = 'function'): T {
    this.startProfile(name);
    try {
      const result = fn();
      this.endProfile(name, category);
      return result;
    } catch (error) {
      this.endProfile(name, category);
      throw error;
    }
  }

  async profileAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: ExecutionMetric['category'] = 'function'
  ): Promise<T> {
    this.startProfile(name);
    try {
      const result = await fn();
      this.endProfile(name, category);
      return result;
    } catch (error) {
      this.endProfile(name, category);
      throw error;
    }
  }

  getMetricsByCategory(category: ExecutionMetric['category']): ExecutionMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  getSlowOperations(thresholdMs: number = 16): ExecutionMetric[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  getAverageExecutionTime(name: string): number {
    const matching = this.metrics.filter(m => m.name === name);
    if (matching.length === 0) return 0;

    const total = matching.reduce((sum, m) => sum + m.duration, 0);
    return total / matching.length;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeProfiles.clear();
  }
}

export const jsProfiler = new JavaScriptProfiler();
```

### Profiling Decorator

```typescript
// utils/profileDecorator.ts
import { jsProfiler } from './jsProfiler';

export function profileMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const className = target.constructor.name;
    const profileName = `${className}.${propertyKey}`;

    return jsProfiler.profile(profileName, () => originalMethod.apply(this, args));
  };

  return descriptor;
}

export function profileAsyncMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const className = target.constructor.name;
    const profileName = `${className}.${propertyKey}`;

    return jsProfiler.profileAsync(profileName, () => originalMethod.apply(this, args));
  };

  return descriptor;
}
```

## Native vs JS Thread Metrics

Understanding the performance of both threads is crucial for React Native optimization.

### Thread Performance Monitor

```typescript
// utils/threadPerformance.ts
import { NativeModules, Platform } from 'react-native';

interface ThreadMetrics {
  jsThread: {
    busy: boolean;
    utilizationPercent: number;
    queueLength: number;
  };
  nativeThread: {
    busy: boolean;
    utilizationPercent: number;
  };
  bridgeCalls: number;
  bridgeLatency: number;
}

class ThreadPerformanceMonitor {
  private bridgeCallCount = 0;
  private bridgeLatencies: number[] = [];
  private jsThreadBlockedTime = 0;
  private measurementStartTime = Date.now();

  async getThreadMetrics(): Promise<ThreadMetrics> {
    // This requires native module implementation
    const { ThreadMetrics: NativeThreadMetrics } = NativeModules;

    if (NativeThreadMetrics) {
      try {
        const nativeMetrics = await NativeThreadMetrics.getMetrics();
        return {
          ...nativeMetrics,
          bridgeCalls: this.bridgeCallCount,
          bridgeLatency: this.getAverageBridgeLatency(),
        };
      } catch (error) {
        console.error('Failed to get native thread metrics:', error);
      }
    }

    // Fallback to JS-only metrics
    return this.getJSOnlyMetrics();
  }

  private getJSOnlyMetrics(): ThreadMetrics {
    return {
      jsThread: {
        busy: false,
        utilizationPercent: this.estimateJSUtilization(),
        queueLength: 0,
      },
      nativeThread: {
        busy: false,
        utilizationPercent: 0,
      },
      bridgeCalls: this.bridgeCallCount,
      bridgeLatency: this.getAverageBridgeLatency(),
    };
  }

  private estimateJSUtilization(): number {
    const elapsed = Date.now() - this.measurementStartTime;
    if (elapsed === 0) return 0;
    return (this.jsThreadBlockedTime / elapsed) * 100;
  }

  recordBridgeCall(latency: number): void {
    this.bridgeCallCount++;
    this.bridgeLatencies.push(latency);

    // Keep last 100 latencies
    if (this.bridgeLatencies.length > 100) {
      this.bridgeLatencies.shift();
    }
  }

  recordJSThreadBlock(duration: number): void {
    this.jsThreadBlockedTime += duration;
  }

  getAverageBridgeLatency(): number {
    if (this.bridgeLatencies.length === 0) return 0;
    const total = this.bridgeLatencies.reduce((a, b) => a + b, 0);
    return total / this.bridgeLatencies.length;
  }

  reset(): void {
    this.bridgeCallCount = 0;
    this.bridgeLatencies = [];
    this.jsThreadBlockedTime = 0;
    this.measurementStartTime = Date.now();
  }
}

export const threadPerformanceMonitor = new ThreadPerformanceMonitor();
```

## Custom Performance Marks

Creating custom performance marks allows you to measure specific operations in your app.

### Performance Marks Manager

```typescript
// utils/performanceMarks.ts
interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
}

class PerformanceMarksManager {
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: PerformanceMeasure[] = [];

  mark(name: string, metadata?: Record<string, unknown>): void {
    const existingMark = this.marks.get(name);

    if (existingMark && !existingMark.endTime) {
      // End the existing mark
      existingMark.endTime = performance.now();
      existingMark.duration = existingMark.endTime - existingMark.startTime;
      this.marks.set(name, existingMark);
    } else {
      // Start a new mark
      this.marks.set(name, {
        name,
        startTime: performance.now(),
        metadata,
      });
    }
  }

  measure(name: string, startMark: string, endMark: string): number | null {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);

    if (!start || !end) {
      console.warn(`Missing marks for measure: ${startMark} -> ${endMark}`);
      return null;
    }

    const startTime = start.startTime;
    const endTime = end.endTime || end.startTime;
    const duration = endTime - startTime;

    this.measures.push({
      name,
      startMark,
      endMark,
      duration,
    });

    return duration;
  }

  getMark(name: string): PerformanceMark | undefined {
    return this.marks.get(name);
  }

  getAllMarks(): PerformanceMark[] {
    return Array.from(this.marks.values());
  }

  getAllMeasures(): PerformanceMeasure[] {
    return [...this.measures];
  }

  clearMarks(): void {
    this.marks.clear();
  }

  clearMeasures(): void {
    this.measures = [];
  }

  clearAll(): void {
    this.clearMarks();
    this.clearMeasures();
  }

  // Convenience method for timing operations
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startMark = `${name}_start`;
    const endMark = `${name}_end`;

    this.mark(startMark);
    const result = await operation();
    this.mark(endMark);

    const duration = this.measure(name, startMark, endMark) || 0;

    return { result, duration };
  }
}

export const performanceMarks = new PerformanceMarksManager();
```

### Custom Performance Marks Hook

```typescript
// hooks/usePerformanceMarks.ts
import { useCallback, useEffect, useRef } from 'react';
import { performanceMarks } from '../utils/performanceMarks';

interface UsePerformanceMarksResult {
  mark: (name: string) => void;
  measure: (name: string, startMark: string, endMark: string) => number | null;
  timeOperation: <T>(name: string, operation: () => Promise<T>) => Promise<T>;
}

export const usePerformanceMarks = (prefix?: string): UsePerformanceMarksResult => {
  const getMarkName = useCallback((name: string) => {
    return prefix ? `${prefix}_${name}` : name;
  }, [prefix]);

  const mark = useCallback((name: string) => {
    performanceMarks.mark(getMarkName(name));
  }, [getMarkName]);

  const measure = useCallback((
    name: string,
    startMark: string,
    endMark: string
  ): number | null => {
    return performanceMarks.measure(
      getMarkName(name),
      getMarkName(startMark),
      getMarkName(endMark)
    );
  }, [getMarkName]);

  const timeOperation = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const { result } = await performanceMarks.timeOperation(
      getMarkName(name),
      operation
    );
    return result;
  }, [getMarkName]);

  return { mark, measure, timeOperation };
};
```

## Automated Performance Reporting

Setting up automated reporting ensures you capture performance data consistently.

### Performance Reporter

```typescript
// utils/performanceReporter.ts
interface PerformanceReport {
  timestamp: number;
  sessionId: string;
  deviceInfo: DeviceInfo;
  metrics: {
    launchTime?: number;
    averageFPS: number;
    memoryUsage: number;
    networkStats: NetworkStats;
    screenRenderTimes: Record<string, number>;
    slowOperations: SlowOperation[];
  };
}

interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  isEmulator: boolean;
}

interface NetworkStats {
  averageResponseTime: number;
  totalRequests: number;
  failedRequests: number;
}

interface SlowOperation {
  name: string;
  duration: number;
  category: string;
}

class PerformanceReporter {
  private sessionId: string;
  private reportQueue: PerformanceReport[] = [];
  private readonly batchSize = 10;
  private readonly reportEndpoint: string;
  private isReporting = false;

  constructor(reportEndpoint: string) {
    this.sessionId = this.generateSessionId();
    this.reportEndpoint = reportEndpoint;
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async collectAndReport(): Promise<void> {
    const report = await this.collectMetrics();
    this.reportQueue.push(report);

    if (this.reportQueue.length >= this.batchSize && !this.isReporting) {
      await this.flushReports();
    }
  }

  private async collectMetrics(): Promise<PerformanceReport> {
    // Import monitoring utilities
    const { memoryMonitor } = await import('./memoryMonitor');
    const { networkPerformanceMonitor } = await import('./networkPerformance');
    const { screenPerformanceTracker } = await import('./screenPerformance');
    const { jsProfiler } = await import('./jsProfiler');

    const memoryInfo = await memoryMonitor.getMemoryInfo();
    const networkMetrics = networkPerformanceMonitor.getMetrics();
    const slowOps = jsProfiler.getSlowOperations();

    const screenRenderTimes: Record<string, number> = {};
    screenPerformanceTracker.getAllMetrics().forEach((metrics, screenName) => {
      screenRenderTimes[screenName] = screenPerformanceTracker.getAverageRenderTime(screenName);
    });

    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      deviceInfo: await this.getDeviceInfo(),
      metrics: {
        averageFPS: 60, // Replace with actual FPS measurement
        memoryUsage: memoryInfo.usedMemory,
        networkStats: {
          averageResponseTime: networkPerformanceMonitor.getAverageResponseTime(),
          totalRequests: networkMetrics.length,
          failedRequests: networkPerformanceMonitor.getFailedRequests().length,
        },
        screenRenderTimes,
        slowOperations: slowOps.map(op => ({
          name: op.name,
          duration: op.duration,
          category: op.category,
        })),
      },
    };
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    const { Platform } = await import('react-native');

    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown', // Use react-native-device-info for actual model
      isEmulator: false, // Use react-native-device-info for actual value
    };
  }

  private async flushReports(): Promise<void> {
    if (this.reportQueue.length === 0 || this.isReporting) return;

    this.isReporting = true;
    const reportsToSend = [...this.reportQueue];
    this.reportQueue = [];

    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reports: reportsToSend,
        }),
      });
    } catch (error) {
      console.error('Failed to send performance reports:', error);
      // Re-queue failed reports
      this.reportQueue.unshift(...reportsToSend);
    } finally {
      this.isReporting = false;
    }
  }

  async forceFlush(): Promise<void> {
    await this.flushReports();
  }
}

export const createPerformanceReporter = (endpoint: string) => {
  return new PerformanceReporter(endpoint);
};
```

### Automated Reporting Setup

```typescript
// utils/setupPerformanceReporting.ts
import { AppState, AppStateStatus } from 'react-native';
import { createPerformanceReporter } from './performanceReporter';

export const setupPerformanceReporting = (
  endpoint: string,
  intervalMs: number = 60000
): () => void => {
  const reporter = createPerformanceReporter(endpoint);
  let intervalId: NodeJS.Timeout | null = null;
  let isActive = true;

  const startReporting = () => {
    if (intervalId) return;

    intervalId = setInterval(() => {
      if (isActive) {
        reporter.collectAndReport();
      }
    }, intervalMs);
  };

  const stopReporting = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      isActive = true;
      startReporting();
    } else if (state === 'background') {
      isActive = false;
      reporter.forceFlush();
      stopReporting();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  // Start reporting immediately
  startReporting();

  // Return cleanup function
  return () => {
    subscription.remove();
    stopReporting();
    reporter.forceFlush();
  };
};
```

## Setting Performance Budgets

Performance budgets help maintain app quality by setting thresholds for key metrics.

### Performance Budget Manager

```typescript
// utils/performanceBudget.ts
interface PerformanceBudget {
  launchTime: number;
  screenRenderTime: number;
  networkResponseTime: number;
  memoryUsage: number;
  minFPS: number;
  jsExecutionTime: number;
}

interface BudgetViolation {
  metric: keyof PerformanceBudget;
  budget: number;
  actual: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

type BudgetViolationHandler = (violation: BudgetViolation) => void;

class PerformanceBudgetManager {
  private budgets: PerformanceBudget;
  private violations: BudgetViolation[] = [];
  private violationHandlers: BudgetViolationHandler[] = [];
  private readonly warningThreshold = 0.9; // 90% of budget
  private readonly maxViolations = 100;

  constructor(budgets?: Partial<PerformanceBudget>) {
    // Default budgets
    this.budgets = {
      launchTime: 3000, // 3 seconds
      screenRenderTime: 500, // 500ms
      networkResponseTime: 2000, // 2 seconds
      memoryUsage: 150 * 1024 * 1024, // 150 MB
      minFPS: 55, // 55 FPS minimum
      jsExecutionTime: 16, // 16ms (one frame)
      ...budgets,
    };
  }

  setBudget(metric: keyof PerformanceBudget, value: number): void {
    this.budgets[metric] = value;
  }

  getBudget(metric: keyof PerformanceBudget): number {
    return this.budgets[metric];
  }

  getAllBudgets(): PerformanceBudget {
    return { ...this.budgets };
  }

  checkMetric(
    metric: keyof PerformanceBudget,
    value: number
  ): { passed: boolean; violation?: BudgetViolation } {
    const budget = this.budgets[metric];
    let passed: boolean;

    // For FPS, higher is better; for others, lower is better
    if (metric === 'minFPS') {
      passed = value >= budget;
    } else {
      passed = value <= budget;
    }

    if (!passed) {
      const violation: BudgetViolation = {
        metric,
        budget,
        actual: value,
        severity: this.calculateSeverity(metric, value, budget),
        timestamp: Date.now(),
      };

      this.recordViolation(violation);
      return { passed: false, violation };
    }

    // Check for warning threshold
    if (metric === 'minFPS') {
      if (value < budget / this.warningThreshold) {
        const violation: BudgetViolation = {
          metric,
          budget,
          actual: value,
          severity: 'warning',
          timestamp: Date.now(),
        };
        this.recordViolation(violation);
        return { passed: true, violation };
      }
    } else {
      if (value > budget * this.warningThreshold) {
        const violation: BudgetViolation = {
          metric,
          budget,
          actual: value,
          severity: 'warning',
          timestamp: Date.now(),
        };
        this.recordViolation(violation);
        return { passed: true, violation };
      }
    }

    return { passed: true };
  }

  private calculateSeverity(
    metric: keyof PerformanceBudget,
    value: number,
    budget: number
  ): 'warning' | 'critical' {
    let ratio: number;

    if (metric === 'minFPS') {
      ratio = budget / value; // Higher ratio means worse performance
    } else {
      ratio = value / budget;
    }

    return ratio > 1.5 ? 'critical' : 'warning';
  }

  private recordViolation(violation: BudgetViolation): void {
    this.violations.push(violation);

    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }

    // Notify handlers
    this.violationHandlers.forEach(handler => handler(violation));
  }

  onViolation(handler: BudgetViolationHandler): () => void {
    this.violationHandlers.push(handler);

    return () => {
      const index = this.violationHandlers.indexOf(handler);
      if (index > -1) {
        this.violationHandlers.splice(index, 1);
      }
    };
  }

  getViolations(): BudgetViolation[] {
    return [...this.violations];
  }

  getViolationsByMetric(metric: keyof PerformanceBudget): BudgetViolation[] {
    return this.violations.filter(v => v.metric === metric);
  }

  getCriticalViolations(): BudgetViolation[] {
    return this.violations.filter(v => v.severity === 'critical');
  }

  clearViolations(): void {
    this.violations = [];
  }
}

export const performanceBudget = new PerformanceBudgetManager();
```

### Budget Checking Hook

```typescript
// hooks/usePerformanceBudget.ts
import { useEffect, useState } from 'react';
import { performanceBudget, BudgetViolation } from '../utils/performanceBudget';

interface BudgetStatus {
  violations: BudgetViolation[];
  criticalCount: number;
  warningCount: number;
  isHealthy: boolean;
}

export const usePerformanceBudget = (): BudgetStatus => {
  const [status, setStatus] = useState<BudgetStatus>({
    violations: [],
    criticalCount: 0,
    warningCount: 0,
    isHealthy: true,
  });

  useEffect(() => {
    const updateStatus = () => {
      const violations = performanceBudget.getViolations();
      const criticalCount = violations.filter(v => v.severity === 'critical').length;
      const warningCount = violations.filter(v => v.severity === 'warning').length;

      setStatus({
        violations,
        criticalCount,
        warningCount,
        isHealthy: criticalCount === 0,
      });
    };

    const unsubscribe = performanceBudget.onViolation(updateStatus);
    updateStatus();

    return unsubscribe;
  }, []);

  return status;
};
```

## Continuous Monitoring Setup

Setting up continuous monitoring ensures you always have visibility into your app's performance.

### Complete Performance Monitoring Provider

```typescript
// providers/PerformanceProvider.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { networkPerformanceMonitor } from '../utils/networkPerformance';
import { memoryMonitor } from '../utils/memoryMonitor';
import { screenPerformanceTracker } from '../utils/screenPerformance';
import { jsProfiler } from '../utils/jsProfiler';
import { performanceBudget } from '../utils/performanceBudget';
import { setupPerformanceReporting } from '../utils/setupPerformanceReporting';

interface PerformanceContextValue {
  isMonitoring: boolean;
  networkStats: {
    averageResponseTime: number;
    totalRequests: number;
    failedRequests: number;
  };
  memoryStats: {
    usedMemory: number;
    warningLevel: string;
    trend: string;
  };
  budgetViolations: number;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

interface PerformanceProviderProps {
  children: ReactNode;
  reportingEndpoint?: string;
  reportingInterval?: number;
  budgets?: {
    launchTime?: number;
    screenRenderTime?: number;
    networkResponseTime?: number;
    memoryUsage?: number;
    minFPS?: number;
    jsExecutionTime?: number;
  };
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  reportingEndpoint,
  reportingInterval = 60000,
  budgets,
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [networkStats, setNetworkStats] = useState({
    averageResponseTime: 0,
    totalRequests: 0,
    failedRequests: 0,
  });
  const [memoryStats, setMemoryStats] = useState({
    usedMemory: 0,
    warningLevel: 'normal',
    trend: 'stable',
  });
  const [budgetViolations, setBudgetViolations] = useState(0);

  useEffect(() => {
    // Configure budgets if provided
    if (budgets) {
      Object.entries(budgets).forEach(([key, value]) => {
        if (value !== undefined) {
          performanceBudget.setBudget(key as any, value);
        }
      });
    }

    // Set up violation tracking
    const unsubscribe = performanceBudget.onViolation(() => {
      setBudgetViolations(performanceBudget.getCriticalViolations().length);
    });

    return unsubscribe;
  }, [budgets]);

  useEffect(() => {
    let cleanupReporting: (() => void) | null = null;
    let statsInterval: NodeJS.Timeout | null = null;

    if (isMonitoring) {
      // Enable network monitoring
      networkPerformanceMonitor.enable();

      // Set up automated reporting if endpoint provided
      if (reportingEndpoint) {
        cleanupReporting = setupPerformanceReporting(
          reportingEndpoint,
          reportingInterval
        );
      }

      // Update stats periodically
      statsInterval = setInterval(async () => {
        // Update network stats
        const networkMetrics = networkPerformanceMonitor.getMetrics();
        setNetworkStats({
          averageResponseTime: networkPerformanceMonitor.getAverageResponseTime(),
          totalRequests: networkMetrics.length,
          failedRequests: networkPerformanceMonitor.getFailedRequests().length,
        });

        // Update memory stats
        const memoryInfo = await memoryMonitor.getMemoryInfo();
        setMemoryStats({
          usedMemory: memoryInfo.usedMemory,
          warningLevel: memoryInfo.memoryWarningLevel,
          trend: memoryMonitor.getMemoryTrend(),
        });

        // Check budgets
        performanceBudget.checkMetric('networkResponseTime',
          networkPerformanceMonitor.getAverageResponseTime());
        performanceBudget.checkMetric('memoryUsage', memoryInfo.usedMemory);
      }, 5000);
    }

    return () => {
      if (cleanupReporting) {
        cleanupReporting();
      }
      if (statsInterval) {
        clearInterval(statsInterval);
      }
      networkPerformanceMonitor.disable();
    };
  }, [isMonitoring, reportingEndpoint, reportingInterval]);

  const startMonitoring = () => setIsMonitoring(true);
  const stopMonitoring = () => setIsMonitoring(false);

  return (
    <PerformanceContext.Provider
      value={{
        isMonitoring,
        networkStats,
        memoryStats,
        budgetViolations,
        startMonitoring,
        stopMonitoring,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextValue => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
};
```

### Using the Performance Provider

```typescript
// App.tsx
import React from 'react';
import { PerformanceProvider } from './providers/PerformanceProvider';
import { MainApp } from './MainApp';

const App: React.FC = () => {
  return (
    <PerformanceProvider
      reportingEndpoint="https://your-api.com/performance"
      reportingInterval={60000}
      budgets={{
        launchTime: 3000,
        screenRenderTime: 500,
        networkResponseTime: 2000,
        memoryUsage: 150 * 1024 * 1024,
        minFPS: 55,
      }}
    >
      <MainApp />
    </PerformanceProvider>
  );
};

export default App;
```

### Performance Dashboard Component

```typescript
// components/PerformanceDashboard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePerformance } from '../providers/PerformanceProvider';

export const PerformanceDashboard: React.FC = () => {
  const {
    isMonitoring,
    networkStats,
    memoryStats,
    budgetViolations,
  } = usePerformance();

  if (!isMonitoring) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Metrics</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network</Text>
        <Text>Avg Response: {networkStats.averageResponseTime.toFixed(0)}ms</Text>
        <Text>Total Requests: {networkStats.totalRequests}</Text>
        <Text>Failed: {networkStats.failedRequests}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memory</Text>
        <Text>Used: {(memoryStats.usedMemory / 1024 / 1024).toFixed(1)} MB</Text>
        <Text>Status: {memoryStats.warningLevel}</Text>
        <Text>Trend: {memoryStats.trend}</Text>
      </View>

      {budgetViolations > 0 && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            {budgetViolations} critical budget violation(s)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  warning: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  warningText: {
    color: '#c62828',
    fontWeight: '600',
  },
});
```

## Best Practices for Performance Monitoring

### 1. Monitor in Production

While development monitoring is important, production monitoring provides real-world insights:

```typescript
// config/performanceConfig.ts
export const performanceConfig = {
  enabled: !__DEV__, // Only enable in production
  sampleRate: 0.1, // Sample 10% of users
  reportingEndpoint: process.env.PERFORMANCE_ENDPOINT,
};
```

### 2. Use Sampling for High-Volume Apps

```typescript
// utils/sampling.ts
export const shouldSample = (sampleRate: number): boolean => {
  return Math.random() < sampleRate;
};

export const sampledReport = (
  sampleRate: number,
  reportFn: () => void
): void => {
  if (shouldSample(sampleRate)) {
    reportFn();
  }
};
```

### 3. Set Up Alerts

Configure alerts for critical performance degradations:

```typescript
// utils/performanceAlerts.ts
interface AlertConfig {
  metric: string;
  threshold: number;
  severity: 'warning' | 'critical';
  notifyChannel: string;
}

const alertConfigs: AlertConfig[] = [
  { metric: 'launchTime', threshold: 5000, severity: 'critical', notifyChannel: 'slack' },
  { metric: 'averageFPS', threshold: 45, severity: 'warning', notifyChannel: 'email' },
  { metric: 'memoryUsage', threshold: 200 * 1024 * 1024, severity: 'critical', notifyChannel: 'pagerduty' },
];
```

### 4. Track Performance Over Time

Store historical data for trend analysis:

```typescript
// utils/performanceHistory.ts
interface PerformanceSnapshot {
  timestamp: number;
  version: string;
  metrics: Record<string, number>;
}

class PerformanceHistory {
  private snapshots: PerformanceSnapshot[] = [];

  addSnapshot(metrics: Record<string, number>, version: string): void {
    this.snapshots.push({
      timestamp: Date.now(),
      version,
      metrics,
    });
  }

  getMetricTrend(metric: string, days: number = 7): number[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.snapshots
      .filter(s => s.timestamp >= cutoff)
      .map(s => s.metrics[metric])
      .filter(v => v !== undefined);
  }
}
```

## Conclusion

Tracking performance metrics in React Native is essential for delivering a great user experience. By implementing the techniques covered in this guide, you can:

1. Measure and optimize app launch times
2. Monitor frame rates to ensure smooth animations
3. Track memory usage to prevent crashes
4. Analyze network performance for responsive data loading
5. Identify slow screens and JavaScript operations
6. Set and enforce performance budgets
7. Set up continuous monitoring for proactive issue detection

Remember that performance monitoring is an ongoing process. Regularly review your metrics, set appropriate budgets, and continuously optimize based on real-world data. The investment in performance monitoring will pay off in improved user satisfaction, better app store ratings, and increased user retention.

Start with the most critical metrics for your app, implement monitoring gradually, and iterate based on the insights you gather. With the tools and techniques provided in this guide, you're well-equipped to build and maintain high-performance React Native applications.
