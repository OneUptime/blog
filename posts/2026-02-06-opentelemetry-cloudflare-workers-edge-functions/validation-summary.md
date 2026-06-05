# Validation Summary: How to Set Up OpenTelemetry for Cloudflare Workers Edge Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Cloudflare Workers
- OpenTelemetry JavaScript
- OTLP HTTP/JSON trace export
- JavaScript Fetch API
- Wrangler configuration
- Distributed tracing and W3C trace context propagation

## Sources Consulted
- Cloudflare Workers Node.js compatibility docs: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Cloudflare Workers AsyncLocalStorage docs: https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/
- Cloudflare Workers limits docs: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers `ctx.waitUntil()` docs: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers OpenTelemetry export docs: https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporter docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry JS package metadata and type exports checked with current npm packages.

## Issues Found
- The post described Workers as having no Node.js built-ins. Cloudflare now supports a subset of Node.js APIs behind `nodejs_compat`, so the text was updated to explain the compatibility flag and the remaining runtime limitations.
- The post listed paid Worker execution time as typically 30 seconds. Cloudflare documents 30 seconds as the default paid CPU limit, configurable up to 5 minutes, so the limit description was corrected.
- The OpenTelemetry setup used `new Resource(...)`, which is not exported as a runtime constructor in current `@opentelemetry/resources`. The code now uses `resourceFromAttributes(...)`.
- The `BasicTracerProvider` snippet called `provider.register()`, which is not available on current `@opentelemetry/sdk-trace-base`. The code now uses `trace.setGlobalTracerProvider(...)`.
- The original setup used `propagation.extract()` and `propagation.inject()` without installing a real propagator, so distributed trace context would not be propagated. The post now installs `@opentelemetry/core` and registers `W3CTraceContextPropagator`.
- The original snippets relied on active context without installing a context manager, so child spans could fail to attach correctly across async work. The post now installs and registers `AsyncLocalStorageContextManager` and adds the required `nodejs_compat` Wrangler flag.
- The original provider factory registered a fresh global provider on every request. The code now caches the provider per isolate and flushes per request.
- The description mentioned metrics collection, but the post only implements tracing and Cloudflare's OpenTelemetry export docs currently note that metrics export is not supported. The description was narrowed to distributed tracing.
- The sampling example created a sampler but did not show it being attached to the provider. The snippet now shows the sampler passed into `BasicTracerProvider`.

## Review Notes
The examples still use some older HTTP semantic attribute names such as `http.method` and `http.url`. They remain understandable for a practical tutorial, but a future update could migrate the examples to the latest stable semantic convention names.
