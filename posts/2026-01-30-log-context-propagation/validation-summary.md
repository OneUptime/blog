# Validation Summary: How to Implement Log Context Propagation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- TypeScript
- Express
- AsyncLocalStorage
- W3C Trace Context
- HTTP headers
- Structured JSON logging

## Sources Consulted
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js HTTP documentation for incoming header behavior: https://nodejs.org/api/http.html
- Node.js crypto.randomBytes documentation: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- Node.js global fetch documentation: https://nodejs.org/api/globals.html#fetch
- Express 5 API reference: https://expressjs.com/en/api/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry context propagation documentation: https://opentelemetry.io/docs/concepts/context-propagation/

## Issues Found
- The trace and span ID generation used `Math.random()` and could theoretically generate all-zero IDs, which W3C Trace Context treats as invalid. Changed the examples to use `node:crypto` `randomBytes()` and retry if the generated value is all zeros.
- The `traceparent` parser only split on hyphens and accepted malformed IDs, invalid lengths, non-hex characters, and all-zero trace or parent IDs. Replaced it with validation for the W3C `00-trace-id-parent-id-flags` format.
- The Express middleware cast incoming headers directly to `string`, but Node request headers can be `string`, `string[]`, or `undefined`. Added a helper to safely use the first header value.
- The context-aware logger did not automatically include `parentSpanId` or `tenantId`, even though the propagated context and later sample logs used those fields. Added both fields to the logger output.
- The sample correlated logs used abbreviated trace IDs and an invalid span ID containing non-hex characters. Replaced them with valid W3C-shaped trace and span IDs.
- The HTTP client wrapper only serialized truthy bodies, so valid values such as `0`, `false`, or an empty string would be dropped. Changed the check to serialize any body that is not `undefined`.

## Review Notes
- The examples are accurate as manual propagation examples. In production OpenTelemetry-instrumented services, the official propagators and instrumentation libraries should usually handle trace context injection and extraction automatically.
- The snippets use global `fetch`, which is stable in current Node.js releases and available without the experimental flag in Node.js 18 and newer.
