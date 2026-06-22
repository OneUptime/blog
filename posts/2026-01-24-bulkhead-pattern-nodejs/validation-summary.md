# Validation Summary: How to Implement Bulkhead Pattern in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- TypeScript
- Bulkhead pattern
- Semaphores
- Express
- Node.js worker_threads
- Prometheus metrics with prom-client

## Sources Consulted
- Node.js worker_threads documentation: https://nodejs.org/api/worker_threads.html
- Node.js HTTP documentation for response events and writable state: https://nodejs.org/api/http.html
- Node.js guide on the event loop and worker pool: https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- TypeScript decorators documentation: https://www.typescriptlang.org/docs/handbook/decorators.html
- Express 5.x API reference: https://expressjs.com/en/api/
- prom-client README: https://github.com/siimon/prom-client

## Issues Found
- The failure scenario described Node.js request handling as "all threads" being consumed. Updated the wording to "request handlers" and "concurrency capacity" to better match Node.js's event loop and worker pool model.
- The `bulkhead.ts` snippet defined classes that later snippets imported, but did not export them. Added exports for `Bulkhead`, `BulkheadOptions`, `BulkheadRejectedException`, and `BulkheadTimeoutException`.
- The bulkhead rejection error reported `this.permits` as the maximum concurrency, which would be `0` when the bulkhead was full. Added a `maxConcurrent` field and used it in the error message.
- The registry snippet referenced `Bulkhead` without importing it. Added the missing import from `./bulkhead`.
- The payment decorator comment said the external API bulkhead allowed 5 concurrent calls, but the default `externalApi` config allows 10. Updated the comment to match the configuration.
- The worker thread snippet imported core modules without the current `node:` specifier and included unused `workerData` and `vm` imports. Updated the imports and removed the unused worker code imports.
- The worker image-processing example typed the worker result as `Buffer`, but worker messages use structured cloning and binary results are safely handled as `Uint8Array` across the boundary. Updated the snippet to receive `Uint8Array` and convert it back with `Buffer.from`.
- The Prometheus metrics snippet declared `Counter` metrics for rejections and timeouts but never incremented them. Added delta tracking so the counters are updated before metrics are exported.
- The Prometheus gauge snippet updated point-in-time values with `setInterval`. Updated it to use `collect()` callbacks, matching prom-client guidance for scrape-time point-in-time values.

## Review Notes
- The decorator example uses TypeScript's legacy decorator signature with `target`, `propertyKey`, and `descriptor`; this remains valid when using the legacy `experimentalDecorators` compiler behavior.
- The worker pool example is intentionally simplified for a blog post. Production worker pools should also handle worker `error` and unexpected `exit` events, and may use `AsyncResource` for better async diagnostics.
