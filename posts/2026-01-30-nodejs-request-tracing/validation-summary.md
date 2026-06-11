# Validation Summary: How to Build Request Tracing in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- Express
- AsyncLocalStorage
- Node.js crypto module
- Fetch API
- Axios interceptors
- Structured logging
- OpenTelemetry JavaScript SDK
- OTLP trace exporter
- Jaeger
- Docker Compose

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js global objects / Fetch API documentation: https://nodejs.org/api/globals.html
- Node.js Fetch with Undici guide: https://nodejs.org/learn/getting-started/fetch
- OpenTelemetry JavaScript Node.js getting started guide: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources guide: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters guide: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- npm package metadata for @opentelemetry/resources, @opentelemetry/semantic-conventions, @opentelemetry/exporter-trace-otlp-http, and @opentelemetry/auto-instrumentations-node

## Issues Found
- The OpenTelemetry setup used stale resource APIs: `new Resource(...)` and `SEMRESATTRS_SERVICE_NAME` / `SEMRESATTRS_SERVICE_VERSION`. Updated the example to use `resourceFromAttributes(...)` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, matching current OpenTelemetry JavaScript documentation.
- The OTLP exporter URL used `OTEL_EXPORTER_OTLP_ENDPOINT` directly. That can be a base endpoint such as `http://localhost:4318`, while the explicit trace exporter URL needs the trace path. Updated the code to prefer `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and append `/v1/traces` when using the base endpoint.
- The custom nested span examples ended spans only after successful awaited work. Updated the nested `validate-payment` and `gateway-request` spans to end in `finally` blocks so errors do not leave spans open.
- The multi-service examples required Express before initializing OpenTelemetry while the text said tracing should be initialized first. Reordered the examples so `initializeTracing(...)` runs before importing Express and application modules that should be instrumented.

## Review Notes
- The custom `x-trace-id`, `x-span-id`, and `x-parent-span-id` headers are acceptable for the from-scratch portion of the tutorial, but production OpenTelemetry deployments normally use W3C Trace Context propagation through headers such as `traceparent`.
- The examples assume a modern Node.js version where global `fetch` is available. On older Node.js versions, readers would need a fetch implementation or should use Axios.
