# Validation Summary: How to Use OpenTelemetry to Track User Journey Analytics Across Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry browser auto-instrumentation
- W3C Trace Context
- JavaScript and React
- Node.js and Express
- OpenTelemetry Collector
- Distributed tracing and context propagation

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript Web SDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry JavaScript resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript instrumentation API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Published package declarations and README files for current npm packages: @opentelemetry/sdk-trace-web 2.7.1, @opentelemetry/resources 2.7.1, @opentelemetry/auto-instrumentations-web 0.63.0, and @opentelemetry/instrumentation-fetch 0.218.0.

## Issues Found
- The browser setup used `new Resource(...)`, but current `@opentelemetry/resources` exposes `resourceFromAttributes()` as the public way to create resources. Updated the import and provider resource initialization.
- The browser setup called `provider.addSpanProcessor(...)`, which is no longer the current WebTracerProvider setup pattern. Updated the example to pass `spanProcessors` in the `WebTracerProvider` constructor.
- The fetch custom attribute hook assumed the request argument always contained a URL. In current fetch instrumentation, common `fetch(url, options)` calls pass the options object to the hook, so the original code could throw. Updated the hook to read the URL from a `Request` object or the fetch result.
- The React example used `SpanStatusCode` without importing it. Added the import from `@opentelemetry/api`.
- The React example created a payment step span but did not make that span active while calling `fetch`, so the fetch/client span might not be parented under the payment step. Wrapped the fetch call in `context.with(trace.setSpan(...))`.
- The React example did not handle the `null` return path from `journeyTracker.trackStep()`. Added a guard before using the span.
- The backend example used `tracer.startSpan()` around awaited service calls. That creates spans but does not make them active for nested auto-instrumented work. Updated the inventory and payment examples to use `startActiveSpan()`.
- The backend explanation implied automatic extraction without mentioning that HTTP/Express instrumentation must be configured. Clarified the comment in the example.
- Added a short CORS caveat that cross-origin browser propagation requires the backend to allow the `traceparent` header.

## Review Notes
The post is technically relevant and accurate after the corrections. Browser instrumentation packages remain partly experimental in the OpenTelemetry JavaScript ecosystem, so future updates should re-check package APIs before publication.
