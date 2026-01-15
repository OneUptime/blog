# How to Track Web Vitals (LCP, FID, CLS) in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Web Vitals, Performance, LCP, FID, CLS, Core Web Vitals

Description: A comprehensive guide to measuring, tracking, and optimizing Core Web Vitals (LCP, FID, CLS) in React applications using the web-vitals library and real-user monitoring strategies.

---

Your React app loads. Users wait. Some leave. Google notices.

Core Web Vitals aren't just metrics anymore - they're ranking signals, user experience indicators, and the difference between a page that converts and one that frustrates. If you're building React applications and not tracking these metrics, you're flying blind.

This guide walks you through everything: what these metrics actually measure, how to implement tracking with the `web-vitals` library, optimization strategies specific to React, and how to tie it all into a comprehensive observability strategy.

---

## What Are Core Web Vitals?

Core Web Vitals are a set of user-centric metrics that Google uses to measure real-world user experience. They focus on three critical aspects of page experience:

1. **LCP (Largest Contentful Paint)** - Loading performance
2. **FID (First Input Delay)** - Interactivity (being replaced by INP)
3. **CLS (Cumulative Layout Shift)** - Visual stability

These aren't synthetic benchmarks from a lab. They're field data collected from actual users visiting your site. That distinction matters because your local development machine with fiber internet and 64GB of RAM doesn't represent the median user on a 4G connection with a mid-range Android device.

### LCP: Largest Contentful Paint

LCP measures how long it takes for the largest content element in the viewport to become visible. This could be:

- An `<img>` element
- A `<video>` element with a poster image
- An element with a background image loaded via CSS
- A block-level text element (`<h1>`, `<p>`, etc.)

**Good:** Less than 2.5 seconds
**Needs Improvement:** Between 2.5 and 4 seconds
**Poor:** Greater than 4 seconds

Why it matters: LCP correlates strongly with perceived load speed. Users don't care about DOMContentLoaded or window.onload events - they care about when they can see the content they came for.

### FID: First Input Delay

FID measures the time from when a user first interacts with your page (clicks a link, taps a button, uses a custom JavaScript control) to when the browser can respond to that interaction.

**Good:** Less than 100 milliseconds
**Needs Improvement:** Between 100 and 300 milliseconds
**Poor:** Greater than 300 milliseconds

Why it matters: Long JavaScript tasks block the main thread. If a user clicks a button while your bundle is parsing or a heavy computation is running, their interaction feels sluggish or unresponsive.

**Note:** FID is being replaced by INP (Interaction to Next Paint) as of March 2024. INP measures all interactions throughout the page lifecycle, not just the first one. The `web-vitals` library supports both.

### CLS: Cumulative Layout Shift

CLS measures the sum of all unexpected layout shifts that occur during the page's entire lifespan. A layout shift happens when a visible element changes its position from one rendered frame to the next.

**Good:** Less than 0.1
**Needs Improvement:** Between 0.1 and 0.25
**Poor:** Greater than 0.25

Why it matters: Nothing frustrates users more than clicking a button only to have the page shift and clicking something else instead. Late-loading ads, images without dimensions, and dynamically injected content are common culprits.

---

## Setting Up the web-vitals Library

The `web-vitals` library is the official Google library for measuring Core Web Vitals. It's lightweight (~2KB gzipped), tree-shakeable, and provides accurate field measurements.

### Installation

```bash
npm install web-vitals
```

Or with yarn:

```bash
yarn add web-vitals
```

### Basic Usage

The simplest implementation logs metrics to the console:

```javascript
// src/reportWebVitals.js
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
    onFCP(onPerfEntry);
    onTTFB(onPerfEntry);
    onINP(onPerfEntry);
  }
};

export default reportWebVitals;
```

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log to console
reportWebVitals(console.log);
```

This outputs objects like:

```javascript
{
  name: 'LCP',
  value: 2456.78,
  rating: 'good',
  delta: 2456.78,
  entries: [PerformanceEntry],
  id: 'v3-1234567890',
  navigationType: 'navigate'
}
```

---

## Sending Web Vitals to an Analytics Endpoint

Console logging is fine for development, but production requires sending data to your observability platform. Here's a comprehensive implementation:

```javascript
// src/reportWebVitals.js
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

const ANALYTICS_ENDPOINT = '/api/analytics/web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    // Add context
    url: window.location.href,
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    // Connection info if available
    connectionType: navigator.connection?.effectiveType || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
  });

  // Use sendBeacon for reliability (survives page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
  } else {
    // Fallback to fetch with keepalive
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}

export default reportWebVitals;
```

### Why sendBeacon?

The `sendBeacon` API is designed specifically for analytics data. It:

- Guarantees data is sent even if the user navigates away
- Doesn't block page unload
- Has a simpler API than fetch for this use case

---

## Advanced Configuration Options

### Attribution Data

The `web-vitals` library can provide detailed attribution data explaining why a metric has a particular value. This is invaluable for debugging:

```javascript
import { onLCP, onCLS, onINP } from 'web-vitals/attribution';

function sendToAnalytics(metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    // Attribution data varies by metric type
    attribution: metric.attribution,
  };

  // For LCP, attribution includes:
  // - element: The LCP element selector
  // - url: Resource URL if applicable
  // - timeToFirstByte: TTFB contribution
  // - resourceLoadDelay: Time waiting for resource
  // - resourceLoadTime: Time to load resource
  // - elementRenderDelay: Time from load to render

  // For CLS, attribution includes:
  // - largestShiftTarget: Element causing largest shift
  // - largestShiftValue: Value of largest shift
  // - largestShiftTime: When it occurred
  // - loadState: Page load state when shift occurred

  console.log(body);
  navigator.sendBeacon('/api/analytics', JSON.stringify(body));
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

### Report All Changes vs Final Values

By default, the library reports the final value. For LCP, you might want to track all candidate elements:

```javascript
import { onLCP } from 'web-vitals';

// Report every LCP candidate (useful for debugging)
onLCP(sendToAnalytics, { reportAllChanges: true });
```

This reports each time a new largest element is painted, not just the final one.

---

## React-Specific Integration Patterns

### Using a Custom Hook

Create a reusable hook for components that need access to Web Vitals:

```javascript
// src/hooks/useWebVitals.js
import { useState, useEffect, useCallback } from 'react';
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

export function useWebVitals() {
  const [metrics, setMetrics] = useState({
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null,
    INP: null,
  });

  const handleMetric = useCallback((metric) => {
    setMetrics((prev) => ({
      ...prev,
      [metric.name]: {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      },
    }));
  }, []);

  useEffect(() => {
    onLCP(handleMetric);
    onFID(handleMetric);
    onCLS(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  }, [handleMetric]);

  return metrics;
}
```

Usage in a component:

```javascript
// src/components/PerformanceDashboard.jsx
import React from 'react';
import { useWebVitals } from '../hooks/useWebVitals';

function getRatingColor(rating) {
  switch (rating) {
    case 'good':
      return 'green';
    case 'needs-improvement':
      return 'orange';
    case 'poor':
      return 'red';
    default:
      return 'gray';
  }
}

export function PerformanceDashboard() {
  const metrics = useWebVitals();

  return (
    <div className="performance-dashboard">
      <h2>Core Web Vitals</h2>
      <div className="metrics-grid">
        {Object.entries(metrics).map(([name, data]) => (
          <div key={name} className="metric-card">
            <h3>{name}</h3>
            {data ? (
              <>
                <span
                  className="value"
                  style={{ color: getRatingColor(data.rating) }}
                >
                  {name === 'CLS' ? data.value.toFixed(3) : `${Math.round(data.value)}ms`}
                </span>
                <span className="rating">{data.rating}</span>
              </>
            ) : (
              <span className="pending">Measuring...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Context Provider Pattern

For larger applications, use a context provider:

```javascript
// src/context/WebVitalsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

const WebVitalsContext = createContext(null);

export function WebVitalsProvider({ children, onReport }) {
  const [metrics, setMetrics] = useState({});

  const handleMetric = useCallback(
    (metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name]: metric,
      }));

      // Forward to parent callback if provided
      if (onReport) {
        onReport(metric);
      }
    },
    [onReport]
  );

  useEffect(() => {
    onLCP(handleMetric);
    onFID(handleMetric);
    onCLS(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  }, [handleMetric]);

  return (
    <WebVitalsContext.Provider value={metrics}>
      {children}
    </WebVitalsContext.Provider>
  );
}

export function useWebVitalsContext() {
  const context = useContext(WebVitalsContext);
  if (!context) {
    throw new Error('useWebVitalsContext must be used within WebVitalsProvider');
  }
  return context;
}
```

Usage:

```javascript
// src/App.jsx
import React from 'react';
import { WebVitalsProvider } from './context/WebVitalsContext';

function sendToAnalytics(metric) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  });
}

function App() {
  return (
    <WebVitalsProvider onReport={sendToAnalytics}>
      <Router>
        {/* Your app components */}
      </Router>
    </WebVitalsProvider>
  );
}
```

---

## Tracking Web Vitals in Single Page Applications

SPAs present unique challenges for Web Vitals tracking. Traditional metrics assume a page load, but SPAs use client-side navigation.

### Handling Route Changes

```javascript
// src/hooks/useRouteWebVitals.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { onCLS, onINP } from 'web-vitals';

export function useRouteWebVitals(onReport) {
  const location = useLocation();
  const clsValueRef = useRef(0);

  useEffect(() => {
    // Track CLS for each route
    const handleCLS = (metric) => {
      onReport({
        ...metric,
        pathname: location.pathname,
      });
    };

    onCLS(handleCLS, { reportAllChanges: true });
  }, [location.pathname, onReport]);

  useEffect(() => {
    // Reset tracking on route change
    clsValueRef.current = 0;

    // Report route change as a custom metric
    const navigationStart = performance.now();

    // Use requestIdleCallback to measure after rendering settles
    const idleCallback = requestIdleCallback(() => {
      const loadTime = performance.now() - navigationStart;
      onReport({
        name: 'Route-Change',
        value: loadTime,
        pathname: location.pathname,
      });
    });

    return () => cancelIdleCallback(idleCallback);
  }, [location.pathname, onReport]);
}
```

### Soft Navigation API (Experimental)

For SPAs, the experimental Soft Navigation API provides more accurate measurements:

```javascript
import { onLCP, onCLS, onINP } from 'web-vitals';

// Enable soft navigation tracking (Chrome 117+)
onLCP(sendToAnalytics, { reportSoftNavs: true });
onCLS(sendToAnalytics, { reportSoftNavs: true });
onINP(sendToAnalytics, { reportSoftNavs: true });
```

---

## Optimization Strategies for Each Metric

### Optimizing LCP

**1. Preload critical resources:**

```javascript
// In your index.html or via react-helmet
<link rel="preload" href="/hero-image.webp" as="image" />
<link rel="preload" href="/critical-font.woff2" as="font" crossOrigin="anonymous" />
```

**2. Use priority hints:**

```javascript
// React 18.3+ supports fetchPriority
<img
  src="/hero-image.webp"
  alt="Hero"
  fetchPriority="high"
  loading="eager"
/>
```

**3. Optimize server response time:**

```javascript
// Use streaming SSR in Next.js or React 18
import { renderToPipeableStream } from 'react-dom/server';

function handler(req, res) {
  const { pipe } = renderToPipeableStream(<App />, {
    onShellReady() {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      pipe(res);
    },
  });
}
```

**4. Implement proper image optimization:**

```javascript
// Use next/image or similar optimization
import Image from 'next/image';

function HeroSection() {
  return (
    <Image
      src="/hero.webp"
      alt="Hero"
      width={1200}
      height={600}
      priority // Preloads the image
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  );
}
```

### Optimizing FID/INP

**1. Break up long tasks:**

```javascript
// Bad: One long task
function processData(items) {
  items.forEach(item => heavyComputation(item));
}

// Good: Yield to main thread
async function processDataAsync(items) {
  for (const item of items) {
    heavyComputation(item);
    // Yield every 50ms to allow input processing
    await yieldToMain();
  }
}

function yieldToMain() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
```

**2. Use Web Workers for heavy computation:**

```javascript
// worker.js
self.onmessage = function(e) {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};

// Component
import { useEffect, useState } from 'react';

function DataProcessor({ data }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const worker = new Worker('/worker.js');
    worker.postMessage(data);
    worker.onmessage = (e) => setResult(e.data);
    return () => worker.terminate();
  }, [data]);

  return <div>{result}</div>;
}
```

**3. Defer non-critical JavaScript:**

```javascript
// Use dynamic imports for non-critical components
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <div>
      <CriticalContent />
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>
    </div>
  );
}
```

**4. Optimize event handlers:**

```javascript
// Use useCallback and debounce expensive operations
import { useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';

function SearchInput({ onSearch }) {
  const debouncedSearch = useMemo(
    () => debounce(onSearch, 300),
    [onSearch]
  );

  const handleChange = useCallback(
    (e) => debouncedSearch(e.target.value),
    [debouncedSearch]
  );

  return <input onChange={handleChange} />;
}
```

### Optimizing CLS

**1. Always specify dimensions for media:**

```javascript
// Bad: No dimensions
<img src="/image.webp" alt="Content" />

// Good: Explicit dimensions
<img
  src="/image.webp"
  alt="Content"
  width={800}
  height={600}
/>

// Better: Use aspect-ratio CSS
<img
  src="/image.webp"
  alt="Content"
  style={{ aspectRatio: '4/3', width: '100%', height: 'auto' }}
/>
```

**2. Reserve space for dynamic content:**

```javascript
// Reserve space for ads or embeds
function AdSlot() {
  return (
    <div
      className="ad-slot"
      style={{
        minHeight: '250px',
        backgroundColor: '#f0f0f0',
      }}
    >
      <AdComponent />
    </div>
  );
}
```

**3. Avoid inserting content above existing content:**

```javascript
// Bad: Inserting banner at top
function App() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    checkBannerEligibility().then(setShowBanner);
  }, []);

  return (
    <div>
      {showBanner && <Banner />} {/* Causes layout shift */}
      <Header />
      <Content />
    </div>
  );
}

// Good: Reserve space or use fixed positioning
function App() {
  const [showBanner, setShowBanner] = useState(false);

  return (
    <div>
      <div style={{ minHeight: showBanner ? 'auto' : '60px' }}>
        {showBanner && <Banner />}
      </div>
      <Header />
      <Content />
    </div>
  );
}
```

**4. Use CSS transforms instead of layout properties:**

```javascript
// Bad: Animating layout properties
.element {
  transition: width 0.3s, height 0.3s;
}

// Good: Use transforms
.element {
  transition: transform 0.3s;
}
.element:hover {
  transform: scale(1.1);
}
```

**5. Handle font loading properly:**

```javascript
// Preload critical fonts
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>

// Use font-display: swap with fallback size matching
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 20%;
}
```

---

## Integrating with Observability Platforms

### Sending to OneUptime

```javascript
// src/analytics/webVitals.js
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals/attribution';

const ONEUPTIME_ENDPOINT = process.env.REACT_APP_ONEUPTIME_TELEMETRY_URL;
const SERVICE_NAME = process.env.REACT_APP_SERVICE_NAME || 'react-app';

function createSpan(metric) {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    name: `web-vital.${metric.name.toLowerCase()}`,
    kind: 'INTERNAL',
    startTimeUnixNano: Date.now() * 1000000,
    endTimeUnixNano: Date.now() * 1000000,
    attributes: [
      { key: 'service.name', value: { stringValue: SERVICE_NAME } },
      { key: 'web_vital.name', value: { stringValue: metric.name } },
      { key: 'web_vital.value', value: { doubleValue: metric.value } },
      { key: 'web_vital.rating', value: { stringValue: metric.rating } },
      { key: 'web_vital.delta', value: { doubleValue: metric.delta } },
      { key: 'page.url', value: { stringValue: window.location.href } },
      { key: 'page.pathname', value: { stringValue: window.location.pathname } },
      { key: 'user_agent.original', value: { stringValue: navigator.userAgent } },
    ],
  };
}

function sendToOneUptime(metric) {
  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: SERVICE_NAME } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'web-vitals' },
            spans: [createSpan(metric)],
          },
        ],
      },
    ],
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${ONEUPTIME_ENDPOINT}/v1/traces`,
      JSON.stringify(payload)
    );
  }
}

export function initWebVitalsTracking() {
  onLCP(sendToOneUptime);
  onFID(sendToOneUptime);
  onCLS(sendToOneUptime);
  onFCP(sendToOneUptime);
  onTTFB(sendToOneUptime);
  onINP(sendToOneUptime);
}

// Utility functions
function generateTraceId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSpanId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Creating Custom Metrics

```javascript
// Track custom performance metrics alongside Web Vitals
function trackCustomMetric(name, value, attributes = {}) {
  const metric = {
    name,
    value,
    timestamp: Date.now(),
    attributes: {
      ...attributes,
      url: window.location.href,
      pathname: window.location.pathname,
    },
  };

  sendToAnalytics(metric);
}

// Example: Track React component render time
function useRenderTracking(componentName) {
  const renderStart = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    trackCustomMetric('component.render.time', renderTime, {
      'component.name': componentName,
    });
  });
}
```

---

## Testing and Debugging Web Vitals

### Local Development Tools

**Chrome DevTools Performance Panel:**

1. Open DevTools (F12)
2. Go to Performance tab
3. Click "Record"
4. Interact with your page
5. Stop recording
6. Look for "Web Vitals" track

**Lighthouse:**

```bash
# CLI
npx lighthouse https://your-app.com --view

# Or use Chrome DevTools > Lighthouse tab
```

**Web Vitals Extension:**

Install the [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma) for real-time metrics in any tab.

### Debugging Poor Scores

```javascript
// Add detailed logging for debugging
import { onLCP, onCLS, onINP } from 'web-vitals/attribution';

function debugWebVitals() {
  onLCP((metric) => {
    console.group('LCP Debug');
    console.log('Value:', metric.value);
    console.log('Rating:', metric.rating);
    console.log('Element:', metric.attribution.element);
    console.log('URL:', metric.attribution.url);
    console.log('Time to First Byte:', metric.attribution.timeToFirstByte);
    console.log('Resource Load Delay:', metric.attribution.resourceLoadDelay);
    console.log('Resource Load Time:', metric.attribution.resourceLoadTime);
    console.log('Element Render Delay:', metric.attribution.elementRenderDelay);
    console.groupEnd();
  });

  onCLS((metric) => {
    console.group('CLS Debug');
    console.log('Value:', metric.value);
    console.log('Rating:', metric.rating);
    console.log('Entries:', metric.entries);
    metric.entries.forEach((entry, i) => {
      console.log(`Shift ${i}:`, {
        value: entry.value,
        sources: entry.sources?.map(s => s.node),
      });
    });
    console.groupEnd();
  });

  onINP((metric) => {
    console.group('INP Debug');
    console.log('Value:', metric.value);
    console.log('Rating:', metric.rating);
    console.log('Event Type:', metric.attribution.eventType);
    console.log('Event Target:', metric.attribution.eventTarget);
    console.log('Event Time:', metric.attribution.eventTime);
    console.log('Load State:', metric.attribution.loadState);
    console.groupEnd();
  });
}

// Enable in development only
if (process.env.NODE_ENV === 'development') {
  debugWebVitals();
}
```

---

## Summary: Web Vitals Quick Reference

| Metric | Full Name | Measures | Good | Needs Work | Poor |
|--------|-----------|----------|------|------------|------|
| **LCP** | Largest Contentful Paint | Loading performance | < 2.5s | 2.5s - 4s | > 4s |
| **FID** | First Input Delay | Initial interactivity | < 100ms | 100ms - 300ms | > 300ms |
| **INP** | Interaction to Next Paint | Overall interactivity | < 200ms | 200ms - 500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | Visual stability | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** | First Contentful Paint | Initial render | < 1.8s | 1.8s - 3s | > 3s |
| **TTFB** | Time to First Byte | Server response | < 800ms | 800ms - 1800ms | > 1800ms |

### Optimization Checklist

**LCP Optimization:**
- [ ] Preload LCP image/resource
- [ ] Use priority hints (`fetchPriority="high"`)
- [ ] Implement server-side rendering or streaming
- [ ] Optimize images (WebP, proper sizing, lazy loading for below-fold)
- [ ] Reduce server response time (TTFB)
- [ ] Remove render-blocking resources

**FID/INP Optimization:**
- [ ] Break up long JavaScript tasks
- [ ] Use Web Workers for heavy computation
- [ ] Implement code splitting and lazy loading
- [ ] Debounce/throttle expensive event handlers
- [ ] Reduce JavaScript bundle size
- [ ] Defer non-critical third-party scripts

**CLS Optimization:**
- [ ] Set explicit dimensions on images and videos
- [ ] Reserve space for dynamic content (ads, embeds)
- [ ] Avoid inserting content above existing content
- [ ] Use CSS transforms instead of layout properties
- [ ] Preload fonts and use `font-display: swap`
- [ ] Avoid late-loading CSS that changes layout

### Common Pitfalls to Avoid

| Pitfall | Impact | Solution |
|---------|--------|----------|
| Missing image dimensions | High CLS | Always specify width/height or use aspect-ratio |
| Unoptimized hero image | Poor LCP | Preload, compress, use modern formats |
| Massive JS bundle | Poor FID/INP | Code split, tree shake, lazy load |
| Synchronous third-party scripts | Poor FID, LCP | Defer or async load non-critical scripts |
| Web font flash (FOUT/FOIT) | CLS, Poor UX | Preload fonts, match fallback sizes |
| Infinite scroll without virtualization | Poor INP | Use react-window or react-virtualized |
| Unthrottled scroll/resize handlers | Poor INP | Debounce and use passive listeners |
| Layout animations | CLS | Use transform and opacity only |

---

## Conclusion

Tracking Core Web Vitals isn't optional anymore. Users expect fast, responsive, stable experiences. Search engines reward them. And the tooling has never been better.

The `web-vitals` library gives you accurate field measurements with minimal overhead. Combined with proper React patterns - context providers, custom hooks, code splitting - you can build applications that score well on all three metrics.

But measurement is just the beginning. The real work is:

1. **Establishing baselines** - Know where you stand today
2. **Setting targets** - Define what "good" means for your users
3. **Continuous monitoring** - Track metrics over time, not just one-off audits
4. **Actionable alerts** - Get notified when metrics degrade
5. **Systematic optimization** - Address issues methodically, verify improvements

Your observability platform should tie Web Vitals data to the rest of your telemetry - traces, logs, error tracking. When LCP regresses, you want to know which deployment caused it. When CLS spikes, you want to see which component changed.

That's where real-user monitoring meets site reliability engineering. Not just "is the site up?" but "is the site fast, responsive, and stable for real users?"

Start measuring today. Your users - and your search rankings - will thank you.

---

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, and Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
- [Monitoring vs Observability](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
