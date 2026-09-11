# Keep Express Correlation IDs with AsyncLocalStorage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Node.js, Express, JavaScript, Logging

Description: Use AsyncLocalStorage to isolate Express request IDs across promises and callbacks, bridge unusual callback boundaries, and prevent cross-request leaks.

---

An Express application often starts with a request ID stored on `req`. That works until a database helper or asynchronous callback needs to log without receiving the request object. A global variable fails as soon as requests overlap.

Node.js `AsyncLocalStorage` provides a store associated with an asynchronous execution context. Create one store per request, and let logging helpers read it while that request's work runs. Native promises and timers created within the scope retain access to the store.

## Establish one request scope

Save this complete Express 5 example as `server.mjs` after installing `express@5`:

```javascript
import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const requestContext = new AsyncLocalStorage();
const app = express();

function log(event, fields = {}) {
  console.log(JSON.stringify({
    ...fields,
    event,
    correlation_id: requestContext.getStore()?.correlationId ?? null,
  }));
}

app.use((req, res, next) => {
  const store = Object.freeze({ correlationId: randomUUID() });
  res.setHeader('X-Correlation-ID', store.correlationId);
  requestContext.run(store, next);
});

async function loadStock() {
  await delay(Math.floor(Math.random() * 20));
  log('stock.loaded');
}

app.get('/stock', async (req, res) => {
  log('request.started');
  await Promise.all([loadStock(), loadStock()]);
  res.json({ correlation_id: requestContext.getStore().correlationId });
});

app.use((err, req, res, next) => {
  log('request.failed', { error_type: err.name });
  if (res.headersSent) return next(err);
  res.status(500).json({
    error: 'internal_error',
    correlation_id: requestContext.getStore()?.correlationId,
  });
});
app.listen(3000);
```

The immutable store prevents accidental modification of the ID during fan-out. Each request receives a different object, so the two `loadStock` calls share their request's ID without sharing it with another request.

Node's [asynchronous context documentation](https://nodejs.org/api/async_context.html) specifies that asynchronous operations created within `run` can access its store. `run` also restores the previous synchronous context after its callback exits; the asynchronous resources it created keep their own association.

## Prefer run over a process-wide mutation

Do not call `enterWith` at arbitrary application entry points and assume it will be reset when a handler returns. Its context continues through the rest of the synchronous execution and subsequent asynchronous operations. Shared event emitters make that behavior especially easy to misuse.

`run` gives a clear scope boundary and is normally the better fit for request middleware. Likewise, do not call `disable()` at the end of each response. It affects the `AsyncLocalStorage` instance, including other active requests, and is intended for retiring the instance itself.

Keep the store small. Holding the complete request, response, large bodies, or credentials can retain unnecessary data as long as associated asynchronous resources remain alive. An ID and a few deliberately chosen fields are usually enough.

## Bridge a callback registered now but invoked elsewhere

Not every callback API preserves the registration context. A callback invoked by a shared resource created outside the request can run in that resource's context. Capture the intended scope at registration.

On Node.js versions supporting stable `AsyncLocalStorage.snapshot()` (including Node 22.15 and later), the following wrapper restores the captured context when a callback is invoked:

```javascript
function captureCallback(callback) {
  const restore = AsyncLocalStorage.snapshot();
  return (...args) => restore(callback, ...args);
}

// Call this inside the request's run() scope.
const onResult = captureCallback((result) => {
  log('legacy.completed', { result_code: result.code });
});
// Pass onResult to the legacy library's callback registration API.
```

If the callback depends on a receiver through `this`, preserve that receiver explicitly rather than using this arrow-function wrapper unchanged. For more complex integrations, Node documents `AsyncResource` and `runInAsyncScope`.

A persistent event subscription also needs a lifetime policy. Remove request-specific listeners when the operation completes or is canceled. Capturing context correctly does not prevent a memory leak if the callback remains registered forever.

## Separate process context from network propagation

`AsyncLocalStorage` is local to the Node.js process. An outgoing HTTP call, worker thread, or broker message does not automatically receive its values. Read the ID and put it into the approved transport field:

```javascript
const id = requestContext.getStore()?.correlationId;
const headers = id ? { 'X-Correlation-ID': id } : {};
const response = await fetch('http://inventory.internal/stock', { headers });
```

Apply this only to destinations authorized to receive your diagnostic metadata. Let OpenTelemetry instrumentation manage W3C trace context separately. An application correlation ID should not be inserted into a `traceparent` field or used as an authentication token.

For detached jobs, create an explicit work envelope and restore a fresh scope on the consumer. Avoid starting unbounded background work from a request and assuming ambient context also solves cancellation and dependency lifetime.

## Test interleaving, not just one request

Send many concurrent requests to `/stock`. For every response ID, expect one start event and two stock events. Assert that no event attributed to that operation contains another response's ID.

Add cases for a rejected promise, a timeout callback, the legacy callback wrapper, and execution outside any request. Outside a scope, this logger writes `null`; it does not reuse the most recent request's value.

If context disappears, place a temporary diagnostic immediately before and inside the suspect callback. Find the first boundary where `getStore()` changes. Fix that boundary instead of adding a global fallback, which can make missing context become incorrect context.

## Conclusion

Use one `AsyncLocalStorage.run` scope per Express request and keep its store immutable and small. Native asynchronous work retains that context, unusual callbacks need an explicit capture, and process boundaries require serialization. Verify concurrent interleaving so each log follows the right request.

## Official Documentation

- [Node.js AsyncLocalStorage and AsyncResource](https://nodejs.org/api/async_context.html)
- [Express middleware](https://expressjs.com/en/guide/using-middleware/)
- [Express promise error handling](https://expressjs.com/en/guide/error-handling/)
