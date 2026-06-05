# Validation Summary: How to Instrument Astro Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Astro
- OpenTelemetry JavaScript
- Node.js
- TypeScript
- JavaScript
- React
- W3C Trace Context
- OTLP/HTTP trace export

## Sources Consulted
- Astro configuration reference: https://docs.astro.build/en/reference/configuration-reference/
- Astro v5 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v5/
- Astro on-demand rendering guide: https://docs.astro.build/en/guides/on-demand-rendering/
- Astro middleware API reference: https://docs.astro.build/en/reference/modules/astro-middleware/
- Astro component syntax reference: https://docs.astro.build/en/reference/astro-syntax/
- Astro endpoints guide: https://docs.astro.build/en/guides/endpoints/
- Astro content collections reference: https://docs.astro.build/en/reference/modules/astro-content/
- OpenTelemetry JavaScript Node.js getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript browser getting started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript propagation guide: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry semantic conventions package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/

## Issues Found
- The OpenTelemetry setup used deprecated `Resource` and `SemanticResourceAttributes` APIs. Updated the example to use `resourceFromAttributes()` and current semantic convention constants.
- The dependency list omitted packages used by the examples, including `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, browser tracing packages, and the ESM instrumentation hook package. Added the missing installs.
- The Astro configuration used `output: 'hybrid'`, which was merged into `output: 'static'` in Astro v5. Updated the config to use `output: 'static'` and noted `server` for full SSR by default.
- The instrumentation import in `astro.config.mjs` would initialize tracing during config/build loading rather than reliably before the runtime server entrypoint. Replaced it with a runtime `node --import` command including the OpenTelemetry ESM loader hook.
- The API route example copied `traceparent` into a span attribute instead of extracting context. Updated it to use `propagation.extract()` and parent manual spans correctly.
- The SSR fetch example manually constructed a `traceparent` header. Updated it to use `propagation.inject()` and a relative URL built from `Astro.url`.
- The `.astro` SSR example contained a second frontmatter block after HTML, which is invalid Astro component syntax. Reworked the snippet into a single frontmatter block and added `export const prerender = false`.
- Several manual span attributes used deprecated HTTP and database semantic convention names such as `http.method`, `http.status_code`, `http.url`, `db.system`, and `db.operation`. Updated them to current names such as `http.request.method`, `http.response.status_code`, `url.full`, `db.system.name`, and `db.operation.name`.
- Some child spans could remain open if an awaited operation threw. Added `try`/`catch`/`finally` handling for database and SSR data-fetch spans.
- The reusable tracing utilities imported `Span` as a runtime value. Changed it to a type-only import for TypeScript compatibility.
- The build tracing example imported an unused `context` symbol and used numeric status code `2`. Replaced it with `SpanStatusCode.ERROR`.
- The content collection helper accepted a plain `string`, which is not type-safe for `getCollection()`. Changed it to use `CollectionKey`.
- The client-side React example created spans without initializing a browser tracer provider, so it would be a no-op. Added a browser tracing initialization snippet.
- The hydration duration calculation subtracted `performance.timeOrigin` from `performance.now()`, producing an invalid value. Replaced it with `performance.now()` as time since navigation start.

## Review Notes
The examples are now aligned with current Astro and OpenTelemetry JavaScript documentation. Browser instrumentation remains experimental in OpenTelemetry JavaScript; the post now uses a console exporter for a minimal working browser example, but production deployments should choose an exporter and sampling strategy appropriate for their backend and CORS policy.
