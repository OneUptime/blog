# Validation Summary: Keep Express Correlation IDs with AsyncLocalStorage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js AsyncLocalStorage, AsyncResource, promises, timers, and worker threads
- Express 5 middleware and asynchronous error handling
- JavaScript ES modules and Object.freeze
- HTTP correlation headers and structured JSON logging
- OpenTelemetry and W3C Trace Context

## Sources Consulted
- Node.js asynchronous context tracking: https://nodejs.org/api/async_context.html
- Node.js crypto.randomUUID: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Node.js timers promises API: https://nodejs.org/api/timers.html#timerspromisessettimeoutdelay-value-options
- Node.js global fetch: https://nodejs.org/api/globals.html#fetch
- Node.js worker threads: https://nodejs.org/api/worker_threads.html
- Express middleware: https://expressjs.com/en/guide/using-middleware/
- Express error handling: https://expressjs.com/en/guide/error-handling/
- Express installation: https://expressjs.com/en/starter/installing/
- ECMAScript Object.freeze specification: https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze
- OpenTelemetry JavaScript propagation: https://opentelemetry.io/docs/languages/js/propagation/
- W3C Trace Context: https://www.w3.org/TR/trace-context/

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. All three JavaScript examples were reviewed; there are no configuration snippets or standalone shell commands to correct.
- Confirmed request-scoped propagation, synchronous context restoration by run(), instance-wide effects of disable(), enterWith() behavior, and getStore() returning undefined outside a scope for the instance shown.
- Confirmed snapshot() became stable in Node 22.15.0 and 23.11.0. Older releases can expose the API experimentally. The callback wrapper correctly captures context; the post correctly cautions that it does not preserve a dynamic receiver.
- Object.freeze is shallow, but it protects the sole string-valued correlationId property in this example. The guidance about retaining callbacks and keeping stores small is appropriate.
- Executed the extracted server example with Node.js v24.1.0 and Express 5.2.1 installed in an isolated temporary directory. The test copy exported the app and used an ephemeral loopback port instead of port 3000.
- All 100 concurrent requests succeeded with distinct response IDs matching their response headers. Each ID had exactly one request.started event and two stock.loaded events, for 300 events total.
- Additional runtime checks passed for a timeout callback, the extracted snapshot wrapper invoked through an AsyncResource created outside the request, and null logging outside any scope.
- A separate test copy made loadStock reject after its delay. Express returned HTTP 500, and the error response, response header, and request.failed event retained the same correlation ID.
- The outgoing fetch example was checked against documentation; inventory.internal is an illustrative private service address and was not contacted. Transport propagation requires explicit serialization; worker threads do not inherit the request store. W3C traceparent has a prescribed format and is distinct from the custom correlation header.
- The three official documentation links resolve to the intended resources. The author link is a plausible GitHub profile URL and is not used as technical evidence.
