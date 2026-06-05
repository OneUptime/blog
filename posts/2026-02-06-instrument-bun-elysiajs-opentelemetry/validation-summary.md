# Validation Summary: How to Instrument Bun and ElysiaJS Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript tracing API
- OpenTelemetry JavaScript metrics API
- OpenTelemetry Node SDK
- OpenTelemetry semantic conventions
- Bun
- ElysiaJS
- TypeScript
- HTTP request tracing
- Database and external API span instrumentation

## Sources Consulted
- ElysiaJS OpenTelemetry pattern documentation: https://elysiajs.com/patterns/opentelemetry
- ElysiaJS lifecycle documentation: https://elysiajs.com/essential/life-cycle
- ElysiaJS OpenTelemetry plugin configuration reference: https://elysiajs.com/plugins/opentelemetry
- OpenTelemetry JavaScript manual instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resource documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- Bun `bun init` documentation: https://bun.com/docs/runtime/templating/init
- Bun runtime utility documentation for `Bun.sleep`: https://bun.com/docs/runtime/utils

## Issues Found
- The OpenTelemetry initialization snippet imported `Resource` from `@opentelemetry/resources`, but current OpenTelemetry JS exports `resourceFromAttributes` instead. Updated the snippet to use `resourceFromAttributes`.
- The resource snippet used deprecated semantic convention constants. Updated it to use `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The Node SDK snippet used `spanProcessor`; updated it to `spanProcessors` and imported `BatchSpanProcessor` from `@opentelemetry/sdk-trace-node`.
- The OTLP endpoint handling treated `OTEL_EXPORTER_OTLP_ENDPOINT` as a signal-specific traces URL and derived the metrics URL with string replacement. Updated it to support signal-specific endpoint variables and append `/v1/traces` or `/v1/metrics` to the base OTLP endpoint.
- The request tracing plugins used `onStop` as if it were a per-request cleanup hook. Updated the examples to use Elysia's `onAfterResponse`, which runs after the response is sent.
- The main application snippet used `context.with` without importing `context`, and used numeric span status codes directly. Updated imports and changed status setting to `SpanStatusCode.OK`.
- Several HTTP and database span attributes used older semantic convention names such as `http.method`, `http.status_code`, `db.system`, and `db.statement`. Updated examples to current names such as `http.request.method`, `http.response.status_code`, `db.system.name`, and `db.query.text`.
- HTTP and database spans omitted span kind. Added `SpanKind.SERVER` for inbound request spans and `SpanKind.CLIENT` for database and external HTTP spans.
- The custom metrics example reused OpenTelemetry-style HTTP metric names while defining app-owned metrics. Renamed them with an `app.` prefix to avoid implying exact semantic-convention metric compliance.
- The introductory explanation implied all ElysiaJS OpenTelemetry work requires a different approach from Node.js HTTP instrumentation. Narrowed the claim to manual generic Node.js HTTP instrumentation.

## Review Notes
- ElysiaJS has a first-party `@elysia/opentelemetry` plugin that is the current recommended path for automatic Elysia request tracing. The article remains valid as a manual instrumentation guide, but a future revision could simplify the request tracing section by using the official plugin.
- Bun was not installed in the local review environment, so the Bun commands were verified against the official Bun documentation rather than executed locally.
