# Validation Summary: How to Use Context Propagation Between Frontend and Backend Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry fetch and XMLHttpRequest instrumentations
- W3C Trace Context propagation
- CORS for browser telemetry and trace headers
- OpenTelemetry Collector OTLP/HTTP receiver CORS configuration
- Express.js CORS middleware
- React Router route-change tracing
- OpenTelemetry sampling

## Sources Consulted
- OpenTelemetry JavaScript browser getting started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript propagation docs: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript exporters and browser CORS docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript API reference for fetch instrumentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_instrumentation-fetch.FetchInstrumentation.html
- OpenTelemetry Collector HTTP CORS config type docs: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Current npm package metadata and installed types for @opentelemetry/sdk-trace-web, @opentelemetry/sdk-trace-base, @opentelemetry/resources, @opentelemetry/instrumentation-fetch, and @opentelemetry/instrumentation-xml-http-request.

## Issues Found
- The install command omitted packages imported directly by the snippets. Added `@opentelemetry/api`, `@opentelemetry/sdk-trace-base`, and `@opentelemetry/instrumentation`.
- The browser provider setup used `new Resource(...)`, but current `@opentelemetry/resources` exports `resourceFromAttributes(...)` rather than a constructible `Resource` class. Updated the examples to use `resourceFromAttributes`.
- The browser provider setup used `provider.addSpanProcessor(...)`, which is not available on the current `WebTracerProvider` API. Updated the example to configure `spanProcessors` in the `WebTracerProvider` constructor.
- The custom span example used numeric status code `2`. Updated it to import and use `SpanStatusCode.ERROR` for clarity and API correctness.
- The React Router route tracing snippet referenced `useEffect` and `useLocation` without imports. Added the required imports.
- The CORS comment said the browser strips `traceparent` when CORS is not configured. Clarified that CORS preflight requests can fail when trace headers are not allowed.
- The `propagateTraceHeaderCorsUrls` explanation described it as controlling all domains and called third-party propagation a protocol violation. Updated it to describe cross-origin trace-context propagation accurately and focus on metadata leakage risk.

## Review Notes
- Browser-side OpenTelemetry JavaScript instrumentation is still documented by OpenTelemetry as experimental and mostly unspecified, so future package updates may require revisiting these snippets.
- The OpenTelemetry Collector CORS configuration fields in the post match the current Collector HTTP CORS config shape.
- A local import/construction check was run against current OpenTelemetry npm packages with browser globals stubbed; the patched provider, exporter, resource, sampler, and instrumentation setup constructed successfully.
