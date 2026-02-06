# How to Fix the Node.js OpenTelemetry instrumentation-http Memory Leak on Node 20+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Memory Leak, HTTP Instrumentation

Description: Diagnose and fix the known memory leak in OpenTelemetry HTTP instrumentation that affects Node.js 20 and later versions.

There is a known issue with `@opentelemetry/instrumentation-http` on Node.js 20+ where the instrumentation holds references to request and response objects longer than necessary, preventing garbage collection. Over time, this causes steadily growing memory usage that can lead to out-of-memory crashes in long-running applications.

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

The issue stems from how `instrumentation-http` wraps the `http.request` and `http.Server` functions in Node.js 20+. Node.js 20 changed the internal handling of the `close` event on HTTP connections, and the instrumentation's event listeners that were supposed to clean up span references do not fire in all cases.

Specifically, when HTTP keep-alive connections are reused, the `close` event on the socket may not fire between requests, but the instrumentation creates a new span reference for each request that is tied to the socket's lifecycle.

## Fix 1: Update the Instrumentation Package

The OpenTelemetry maintainers have addressed this issue in newer versions. Update to the latest version:

```bash
npm install @opentelemetry/instrumentation-http@latest
npm install @opentelemetry/auto-instrumentations-node@latest
```

Check the CHANGELOG for the fix:

```bash
npm info @opentelemetry/instrumentation-http version
```

## Fix 2: Disable Keep-Alive in the Instrumentation

If updating is not immediately possible, disable the keep-alive behavior that triggers the leak:

```javascript
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  // Disable server-side keep-alive header tracking
  serverName: undefined,
  requireParentforOutgoingSpans: false,
  requireParentforIncomingSpans: false,
});
```

## Fix 3: Configure Request and Response Hooks

Use hooks to prevent large objects from being retained:

```javascript
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const httpInstrumentation = new HttpInstrumentation({
  requestHook: (span, request) => {
    // Only set lightweight attributes
    span.setAttribute('http.request.id', request.headers['x-request-id'] || 'unknown');
    // Do NOT store the request object itself on the span
  },
  responseHook: (span, response) => {
    span.setAttribute('http.response.content_length', response.getHeader('content-length') || 0);
  },
});
```

Avoid storing references to request or response objects in span attributes, as this prevents garbage collection.

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

A smaller queue means spans (and their references to request objects) are exported and released sooner.

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
const fs = require('fs');

app.get('/debug/heapdump', (req, res) => {
  const snapshotPath = `/tmp/heap-${Date.now()}.heapsnapshot`;
  const stream = v8.writeHeapSnapshot(snapshotPath);
  res.json({ path: snapshotPath });
});
```

Load the snapshot in Chrome DevTools (Memory tab) and look for retained objects related to `http.IncomingMessage` or `http.ServerResponse`.

## Summary

The HTTP instrumentation memory leak on Node.js 20+ is caused by event listener lifecycle changes in Node's HTTP module. Update to the latest OpenTelemetry packages first. If the issue persists, constrain your batch processor queue and avoid storing large objects in span attributes. Always monitor heap usage in production to catch leaks early.
