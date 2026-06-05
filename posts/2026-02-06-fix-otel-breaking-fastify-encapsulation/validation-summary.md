# Validation Summary: How to Fix OpenTelemetry Breaking Fastify's Encapsulation and Plugin System

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Fastify
- OpenTelemetry JavaScript
- Node.js
- `@opentelemetry/instrumentation-fastify`
- `@fastify/otel`
- `@opentelemetry/sdk-node`
- `@opentelemetry/sdk-trace-base`

## Sources Consulted
- Fastify Encapsulation documentation: https://fastify.dev/docs/latest/Reference/Encapsulation/
- Fastify Request documentation: https://fastify.dev/docs/latest/Reference/Request/
- Fastify v5 Migration Guide: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript tracing API documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- `@opentelemetry/instrumentation-fastify` README and published package metadata: https://www.npmjs.com/package/@opentelemetry/instrumentation-fastify
- `@fastify/otel` README and published package metadata: https://www.npmjs.com/package/@fastify/otel
- `@opentelemetry/api` published type definitions: https://www.npmjs.com/package/@opentelemetry/api
- `@opentelemetry/sdk-trace-base` published type definitions: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base

## Issues Found
- The post overstated that OpenTelemetry "breaks" Fastify encapsulation. Fastify encapsulation still governs decorators, hooks, plugins, and routes; the observed problem is confusing span parenting and trace structure. Updated the description and introduction to describe trace relationships rather than claiming Fastify's plugin system itself is broken.
- The `requestHook` section claimed that `requestHook` avoids creating nested hook spans. In `@opentelemetry/instrumentation-fastify`, `requestHook` only adds custom data to the Fastify handler span; it does not disable hook spans. Updated the heading, explanation, and follow-up note.
- The `requestHook` snippet used `request.routerPath`, which is deprecated/removed in Fastify v5 guidance. Replaced it with `request.routeOptions?.url` and used `request.routeOptions?.method` where available.
- The HTTP-only instrumentation section claimed it still gives the correct Fastify route information. Without Fastify-specific instrumentation, the HTTP span may not know the matched Fastify route. Updated the wording to say it gives one span per request and route attributes should be added separately if needed.
- The manual plugin example used deprecated `request.routerPath`, imported unused `context`, and referenced `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is a top-level `@opentelemetry/api` export. Replaced the example with the Fastify-maintained `@fastify/otel` plugin registration, which is the current recommended package and supports scoped registration.
- The span-parent test used `span.parentSpanId`, but current `@opentelemetry/sdk-trace-base` `ReadableSpan` exposes `parentSpanContext`. Updated the test to use `span.parentSpanContext?.spanId` and guarded the parent lookup.

## Review Notes
The legacy `@opentelemetry/instrumentation-fastify` package is marked deprecated in favor of `@fastify/otel`. Existing applications may still use it, but new guidance should prefer the Fastify-maintained plugin.
