# Validation Summary: How to Implement Retry Logic with Exponential Backoff in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- JavaScript async/await
- Fetch API
- AbortController
- HTTP status codes and Retry-After header
- Exponential backoff and jitter
- Circuit breaker pattern
- Idempotency keys
- Prometheus metrics with prom-client

## Sources Consulted
- Node.js global objects documentation for fetch, AbortController, AbortSignal, and Headers: https://nodejs.org/api/globals.html
- Node.js timers documentation for setTimeout and clearTimeout: https://nodejs.org/api/timers.html
- Node.js crypto documentation for createHash, hash.update, and hash.digest: https://nodejs.org/api/crypto.html
- MDN Fetch API documentation for fetch resolution behavior and Response.ok/status handling: https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
- MDN Headers.get documentation for reading response headers from Fetch Response objects: https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
- RFC 9110, HTTP Semantics, Retry-After header format: https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.3
- AWS Architecture Blog on exponential backoff and jitter strategies: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Google Cloud retry strategy documentation for exponential backoff with jitter and idempotency criteria: https://docs.cloud.google.com/storage/docs/retry-strategy
- prom-client project documentation for Counter and Histogram usage: https://github.com/siimon/prom-client
- Prometheus metric types documentation for counters and histograms: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The basic Fetch retry example returned `fetch()` directly while `retryIf` checked `error.status`. Fetch resolves normally for HTTP error responses such as 503, so that example would not retry HTTP 503 responses as written. I changed the example to check `response.ok`, create an error with `error.status`, and throw it before returning the response.
- The production retry class read `Retry-After` with `error.response?.headers?.['retry-after']`. That works for plain header objects but not for Fetch `Response.headers`, which is a `Headers` object. I added a small `getHeader()` helper that supports both `Headers.get()` and plain object access, then used it in `isRetryable()` and `getRetryAfter()`.
- The `Retry-After` delay parser used `parseInt()`, which can accept partially numeric strings. RFC 9110 defines delay-seconds as a non-negative decimal integer. I changed the parser to use `Number()` with an integer and non-negative check before treating the value as seconds.

## Review Notes
- All JavaScript code blocks were syntax-checked after the edits.
- The deadline retry example bounds the returned promise with `Promise.race()`, but it does not cancel the underlying operation unless that operation implements its own cancellation. This is acceptable for a compact example, but a production version should pass an `AbortSignal` through the retried function.
- The idempotency example correctly notes that the in-memory `Map` should be replaced with Redis in production. A distributed store also needs atomic claim/update operations to avoid races across processes.
