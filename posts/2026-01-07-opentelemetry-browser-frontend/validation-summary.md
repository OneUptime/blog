# Validation Summary: How to Use OpenTelemetry Browser Instrumentation for Frontend Observability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry browser tracing
- OpenTelemetry Collector
- OTLP over HTTP
- JavaScript and TypeScript
- React
- Express / Node.js
- Browser Performance APIs and Core Web Vitals

## Sources Consulted
- OpenTelemetry JavaScript browser getting started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript package type definitions for `@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, and browser instrumentations
- OpenTelemetry semantic conventions package type definitions for current resource attribute constants
- OpenTelemetry Collector OTLP receiver CORS documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The prerequisite listed Node.js 16+, but current OpenTelemetry JS SDK packages require Node.js 18.19+ or 20.6+. Updated the prerequisite.
- The browser and backend setup examples used `new Resource(...)`, which is no longer the current OpenTelemetry JS 2.x API. Updated examples to use `resourceFromAttributes(...)`.
- The setup examples used deprecated `SEMRESATTRS_*` constants. Updated them to current semantic convention constants such as `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The tracer provider examples used `provider.addSpanProcessor(...)`, which was removed in OpenTelemetry JS SDK 2.x. Updated examples to pass `spanProcessors` in the provider constructor.
- The debug span exporter example implemented the `SpanExporter` interface incorrectly by returning a Promise from `export`. Replaced it with the built-in `ConsoleSpanExporter`.
- The article defined a custom `TraceIdRatioBasedSampler` even though the SDK already provides the current implementation. Updated the setup to import and use the SDK sampler.
- The fetch instrumentation callback annotations did not match the current `@opentelemetry/instrumentation-fetch` callback signature. Updated callback usage to handle `Request | RequestInit` and `Response | FetchError` safely.
- The Express middleware accessed `req.user` directly without typing the Express request extension. Updated the example to cast the request shape locally.
- The Collector example used the removed/deprecated `logging` exporter. Updated it to the current `debug` exporter and included the configured `filter` processor in the trace pipeline.
- The browser performance optimization snippet imported `SpanExporter` from `@opentelemetry/api`, where it is not exported. Updated it to import `SpanExporter` from `@opentelemetry/sdk-trace-base`.
- The debounce helper used `NodeJS.Timeout` in browser-oriented code. Updated it to `ReturnType<typeof setTimeout>`.
- The custom `SpanProcessor` example had an outdated `onStart` method signature. Updated it to accept the active span and parent context.

## Review Notes
The article remains a broad tutorial with illustrative snippets rather than a single copy-paste application. Some examples, such as custom web-vitals collection and worker-based exporting, are simplified and would still need production hardening, but the reviewed APIs and configuration patterns now match current OpenTelemetry JavaScript and Collector behavior.
