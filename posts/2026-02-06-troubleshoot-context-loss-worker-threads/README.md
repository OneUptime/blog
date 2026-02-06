# How to Troubleshoot Context Loss in Node.js Worker Threads When Using OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Worker Threads, Context Propagation

Description: Fix the problem where OpenTelemetry trace context is lost when work is dispatched to Node.js worker threads.

Node.js worker threads run in their own V8 isolate with their own event loop. The OpenTelemetry context, which tracks the current span and trace, does not automatically cross the worker thread boundary. This means work dispatched to a worker thread loses all trace context, and any spans created in the worker are orphaned from the parent trace.

## The Problem

```javascript
// main.js
const { Worker } = require('worker_threads');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('main');

function processInWorker(data) {
  return tracer.startActiveSpan('process_data', (span) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./worker.js', {
        workerData: data,
      });

      worker.on('message', (result) => {
        span.end();
        resolve(result);
      });
    });
  });
}
```

```javascript
// worker.js
const { workerData, parentPort } = require('worker_threads');
const { trace } = require('@opentelemetry/api');

// This tracer has no context - spans will be root spans
const tracer = trace.getTracer('worker');

tracer.startActiveSpan('worker_process', (span) => {
  const result = heavyComputation(workerData);
  span.end();
  parentPort.postMessage(result);
});
```

The `worker_process` span has no parent. It starts a new trace instead of being a child of `process_data`.

## The Solution: Manual Context Propagation

You need to serialize the trace context in the main thread and deserialize it in the worker thread.

### Step 1: Extract Context in the Main Thread

```javascript
// main.js
const { Worker } = require('worker_threads');
const { trace, context, propagation } = require('@opentelemetry/api');

const tracer = trace.getTracer('main');

function processInWorker(data) {
  return tracer.startActiveSpan('process_data', (span) => {
    // Extract the current context into a carrier object
    const carrier = {};
    propagation.inject(context.active(), carrier);

    return new Promise((resolve, reject) => {
      const worker = new Worker('./worker.js', {
        workerData: {
          payload: data,
          traceContext: carrier,  // Pass context to worker
        },
      });

      worker.on('message', (result) => {
        span.end();
        resolve(result);
      });

      worker.on('error', (error) => {
        span.setStatus({ code: trace.SpanStatusCode.ERROR });
        span.recordException(error);
        span.end();
        reject(error);
      });
    });
  });
}
```

### Step 2: Restore Context in the Worker Thread

```javascript
// worker.js
const { workerData, parentPort } = require('worker_threads');
const { trace, context, propagation } = require('@opentelemetry/api');

// Initialize OpenTelemetry in the worker too
require('./tracing');

const tracer = trace.getTracer('worker');

// Restore the context from the carrier
const parentContext = propagation.extract(context.active(), workerData.traceContext);

// Create span within the restored context
context.with(parentContext, () => {
  tracer.startActiveSpan('worker_process', (span) => {
    try {
      const result = heavyComputation(workerData.payload);
      span.end();
      parentPort.postMessage(result);
    } catch (error) {
      span.setStatus({ code: trace.SpanStatusCode.ERROR });
      span.recordException(error);
      span.end();
      parentPort.postMessage({ error: error.message });
    }
  });
});
```

### Step 3: Initialize OpenTelemetry in the Worker

Each worker thread needs its own SDK initialization:

```javascript
// tracing.js (used by both main thread and workers)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { isMainThread, threadId } = require('worker_threads');

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'my-service',
    'thread.id': threadId,
    'thread.type': isMainThread ? 'main' : 'worker',
  }),
  traceExporter: new OTLPTraceExporter(),
});
sdk.start();
```

## Using a Worker Pool with Context Propagation

If you use a worker pool library like `workerpool` or `piscina`, wrap the dispatch function:

```javascript
const Piscina = require('piscina');
const { context, propagation } = require('@opentelemetry/api');

const pool = new Piscina({ filename: './worker.js' });

async function runInPool(taskData) {
  // Inject current context
  const carrier = {};
  propagation.inject(context.active(), carrier);

  return pool.run({
    payload: taskData,
    traceContext: carrier,
  });
}
```

## The Resulting Trace

After implementing context propagation, your trace looks like:

```
process_data       [========================] 500ms  (main thread)
  worker_process     [====================]   480ms  (worker thread)
```

The `worker_process` span is now a child of `process_data`, connected in the same trace.

## Important Caveats

1. **Each worker needs its own SDK**: Workers have separate V8 isolates, so the SDK must be initialized in each one.
2. **Exporter connections multiply**: Each worker creates its own exporter connection. With 10 workers, that is 10 connections to your Collector.
3. **Shutdown must be coordinated**: When the main thread shuts down, it should signal workers to flush their span processors before exiting.

```javascript
// Graceful shutdown with workers
process.on('SIGTERM', async () => {
  // Signal workers to shut down
  workers.forEach(w => w.postMessage('shutdown'));
  // Wait for workers to finish
  await Promise.all(workerShutdownPromises);
  // Then shut down the main thread SDK
  await sdk.shutdown();
  process.exit(0);
});
```

Worker threads are a great way to offload CPU-intensive work, but they require explicit context propagation for OpenTelemetry. Serialize the context in the main thread and restore it in the worker, and your traces will stay connected across thread boundaries.
