# Fix the Node.js OpenTelemetry instrumentation-http Memory Leak on Node 20+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Memory Leak, HTTP Instrumentation

Description: Diagnose and fix the known memory leak in OpenTelemetry HTTP instrumentation that affects Node.js 20 and later versions.

Some Node.js applications using `@opentelemetry/instrumentation-http` on Node.js 20+ have seen request-volume-related memory growth when older instrumentation versions, custom hooks, or exporter backlogs keep request and response data alive longer than expected. Over time, this can lead to steadily growing memory usage and out-of-memory crashes in long-running applications.

## Identifying the Leak

The symptoms are:
- Memory usage grows steadily over hours or days
- Heap snapshots show retained `IncomingMessage` and `ServerResponse` objects
- The leak is proportional to request volume
- Restarting the application temporarily fixes the memory usage

To confirm this is the issue:

```javascript
// Monitor heap usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    rssMB: Math.round(usage.rss / 1024 / 1024),
  }));
}, 30000);
```

If `heapUsedMB` increases continuously without leveling off, you likely have a leak.

## Root Cause

The issue usually stems from how `instrumentation-http` wraps Node's `http` and `https` modules and how spans, hooks, and exporters interact with request lifecycles. The instrumentation creates spans around incoming and outgoing HTTP activity, and custom hooks receive Node HTTP request and response objects so they can add attributes.

Specifically, heap snapshots often show retained `IncomingMessage` or `ServerResponse` objects when application code stores request or response objects outside the hook, attaches them to other long-lived objects, or allows span/export queues to grow under load. Keep-alive can make this harder to diagnose because sockets are intentionally reused across multiple requests.

## Fix 1: Update the Instrumentation Package

OpenTelemetry HTTP instrumentation is actively maintained. Update to the latest version before applying workarounds:

```bash
npm install @opentelemetry/instrumentation-http@latest
npm install @opentelemetry/auto-instrumentations-node@latest
```

Check the installed version:

```bash
npm info @opentelemetry/instrumentation-http version
```

## Fix 2: Disable the Affected HTTP Instrumentation Path

If updating is not immediately possible, temporarily disable the affected incoming or outgoing HTTP spans while you confirm the leak source:

```javascript
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  // Set only the side that is leaking in your heap snapshots.
  disableIncomingRequestInstrumentation: true,
  // disableOutgoingRequestInstrumentation: true,
});
```

## Fix 3: Configure Request and Response Hooks

Use hooks to prevent large objects from being retained:

```javascript
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  requestHook: (span, request) => {
    const requestId =
      request.headers?.['x-request-id'] || request.getHeader?.('x-request-id') || 'unknown';

    // Only set lightweight attributes.
    span.setAttribute('http.request.id', Array.isArray(requestId) ? requestId[0] : requestId);
    // Do NOT store the request object itself on the span
  },
  responseHook: (span, response) => {
    const contentLength =
      response.getHeader?.('content-length') || response.headers?.['content-length'] || 0;

    span.setAttribute(
      'http.response.content_length',
      Array.isArray(contentLength) ? contentLength[0] : contentLength
    );
  },
});
```

Avoid storing references to request or response objects in closures, global variables, span attributes, or other long-lived objects, as this prevents garbage collection. Span attributes should be strings, numbers, booleans, or arrays of those primitive values.

## Fix 4: Limit the Batch Processor Queue

Even if the leak exists, you can limit its impact by constraining the batch processor:

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 1024,        // Limit pending spans
  maxExportBatchSize: 256,
  scheduledDelayMillis: 3000, // Export more frequently
});
```

A smaller queue limits how many ended spans can wait in memory before export. It is not a root-cause fix for retained request objects, but it can reduce memory pressure while you upgrade or isolate the leak.

## Monitoring the Fix

After applying the fix, monitor memory usage to confirm it stabilizes:

```javascript
// Quick memory check endpoint
app.get('/debug/memory', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    rssMB: Math.round(usage.rss / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  });
});
```

Healthy memory usage should reach a plateau and stay there. If it continues growing after your fix, take a heap snapshot to identify what is being retained:

```javascript
// Trigger a heap snapshot
const v8 = require('v8');

app.get('/debug/heapdump', (req, res) => {
  const snapshotPath = `/tmp/heap-${Date.now()}.heapsnapshot`;
  v8.writeHeapSnapshot(snapshotPath);
  res.json({ path: snapshotPath });
});
```

Load the snapshot in Chrome DevTools (Memory tab) and look for retained objects related to `http.IncomingMessage` or `http.ServerResponse`.

## Summary

HTTP instrumentation-related memory growth on Node.js 20+ is usually caused by older instrumentation versions, custom hooks, exporter backlogs, or application code retaining HTTP request and response objects. Update to the latest OpenTelemetry packages first. If the issue persists, temporarily disable the affected HTTP instrumentation path, constrain your batch processor queue, and avoid storing large objects in span attributes or long-lived closures. Always monitor heap usage in production to catch leaks early.
