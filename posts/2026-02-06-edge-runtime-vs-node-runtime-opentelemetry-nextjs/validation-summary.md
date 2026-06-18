# Validation Summary: How to Handle Edge Runtime vs Node Runtime for OpenTelemetry in Next.js

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Next.js App Router route handlers
- Next.js Edge Runtime and Node.js Runtime
- Next.js middleware / proxy runtime behavior
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry NodeSDK, WebTracerProvider, span processors, resources, and semantic conventions
- TypeScript

## Sources Consulted
- Next.js instrumentation guide: https://nextjs.org/docs/app/guides/instrumentation
- Next.js Edge Runtime API reference: https://nextjs.org/docs/app/api-reference/edge
- Next.js Route Segment Config reference: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- Next.js middleware / proxy file convention reference: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- Next.js Edge Runtime Node.js module error reference: https://nextjs.org/docs/messages/node-module-in-edge-runtime
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries guide: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JS resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS semantic conventions API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JS WebTracerProvider API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html

## Issues Found
- The Edge runtime install command omitted `@opentelemetry/sdk-trace-base`, even though the example imports `BatchSpanProcessor` from that package. Added the missing package.
- The Edge tracer provider example used older OpenTelemetry resource and semantic convention APIs: `new Resource(...)` and `SEMRESATTRS_SERVICE_NAME`. Updated it to `resourceFromAttributes(...)` and `ATTR_SERVICE_NAME`, matching current OpenTelemetry JS guidance.
- The Edge tracer provider example used `provider.addSpanProcessor(...)`, which is no longer exposed on the current `WebTracerProvider` / `BasicTracerProvider` API. Updated the example to pass `spanProcessors` in the provider constructor.
- The Edge tracer provider example did not call `provider.register()`, so shared code using `trace.getTracer(...)` could still receive a no-op global provider. Added `provider.register()`.
- Several Edge manual span examples ended spans only on successful execution. Wrapped span bodies in `try/finally` so spans are ended if awaited work throws.
- The trace propagation middleware example created the span outside the extracted context and injected trace headers into the response rather than forwarding them to the next handler. Updated it to create an active span inside the extracted context and inject trace context into request headers passed to `NextResponse.next(...)`.
- The middleware example used `export const runtime = 'edge'`, which is route segment syntax, not the middleware runtime configuration style. Removed it and clarified default Edge middleware behavior with the current Node-runtime caveat.
- The post claimed middleware always runs in Edge runtime. Updated this to note that middleware defaults to Edge, while current Next.js versions can opt into Node.js runtime with `config.runtime`.
- The performance section made overly specific cold-start claims. Replaced those with less absolute wording that is accurate across deployment platforms.
- A few TypeScript snippets contained unused imports or variables, duplicate route handlers in one code block, or missing imports. Cleaned those up while preserving the original examples.
- The test example used `provider.addSpanProcessor(...)`; updated it to construct `WebTracerProvider` with `spanProcessors`.

## Review Notes
Next.js 16 documentation has renamed middleware to proxy and marks the middleware convention as deprecated. The post still uses middleware terminology, which is common in existing applications, but a future refresh should consider adding a short version-specific note about proxy naming and runtime defaults.
