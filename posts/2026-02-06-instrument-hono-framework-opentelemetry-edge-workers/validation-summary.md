# Validation Summary: How to Instrument Hono Framework with OpenTelemetry for Edge Workers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Hono
- OpenTelemetry JavaScript
- Cloudflare Workers
- Wrangler
- Workers KV
- TypeScript
- OTLP/HTTP trace export

## Sources Consulted
- OpenTelemetry JavaScript `@opentelemetry/sdk-trace-base` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-base.html
- Current npm package type declarations for `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/exporter-trace-otlp-http`, and `@opentelemetry/context-async-hooks`
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers `waitUntil()` context API: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers Node.js compatibility and AsyncLocalStorage: https://developers.cloudflare.com/workers/runtime-apis/nodejs/ and https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/
- Cloudflare Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Workers OpenTelemetry export docs: https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/
- Hono Cloudflare Workers guide: https://hono.dev/docs/getting-started/cloudflare-workers
- Hono context API, including Cloudflare `executionCtx`: https://hono.dev/docs/api/context

## Issues Found
- The original OpenTelemetry provider setup used APIs removed or changed in current OpenTelemetry JS 2.x (`new Resource`, `provider.addSpanProcessor()`, and `provider.register()` on `BasicTracerProvider`). Updated the provider to use `resourceFromAttributes`, constructor `spanProcessors`, and explicit global tracer/context/propagator registration.
- The original semantic convention constants `SEMRESATTRS_SERVICE_NAME` and `SEMRESATTRS_SERVICE_VERSION` are deprecated. Replaced them with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The original custom OTLP exporter hand-built an incomplete OTLP JSON payload and used `span.parentSpanId`, which is not the current `ReadableSpan` shape. Replaced it with the official `@opentelemetry/exporter-trace-otlp-http` exporter.
- The original examples did not register an async context manager, so child spans created with `startActiveSpan()` could be disconnected in Cloudflare Workers. Added `@opentelemetry/context-async-hooks`, `AsyncLocalStorageContextManager`, and the required `nodejs_als` Wrangler compatibility flag.
- The original middleware used deprecated HTTP semantic attributes such as `http.method`, `http.url`, and `http.status_code`. Updated request/client examples to current stable semantic attributes such as `http.request.method`, `url.full`, `url.path`, and `http.response.status_code`.
- The original edge constraints said requests typically need to complete under 50ms CPU time. Updated this to Cloudflare's current documented CPU limits: 10ms on Free plans and configurable up to 5 minutes on paid Workers.
- The original background-task wording implied no background work was possible. Updated it to explain that background threads are unavailable, but platform APIs such as `waitUntil()` can extend work after the response within documented limits.
- The original snippets did not ensure span export before Workers request teardown. Added `flushTracing()` and scheduled it with Hono's Cloudflare `c.executionCtx.waitUntil()`.
- The original Wrangler example used an older compatibility date and omitted the compatibility flag needed for AsyncLocalStorage. Updated the snippet to `compatibility_date = "2024-09-23"` and `compatibility_flags = ["nodejs_als"]`.
- The original setup omitted Cloudflare Workers TypeScript types while using `KVNamespace`. Added `npm install --save-dev @cloudflare/workers-types`.
- Removed an unused `getTracer` import from the main application snippet and an unused `context` import from the custom span example.

## Review Notes
Cloudflare also provides first-party OpenTelemetry export for Workers telemetry via Wrangler observability configuration. The post remains valid as an application-level manual instrumentation guide, especially for custom Hono spans, but a future revision could compare manual SDK instrumentation with Cloudflare's managed export path.
