# Validation Summary: How to Understand OpenTelemetry Contrib Packages and When to Use Them

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript SDK
- OpenTelemetry JavaScript contrib instrumentations
- Node.js
- Express.js
- PostgreSQL `pg`
- OTLP HTTP trace exporter
- OpenTelemetry sampling

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries guide: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript sampling guide: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry HTTP instrumentation API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry HTTP instrumentation config API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry JavaScript contrib repository: https://github.com/open-telemetry/opentelemetry-js-contrib
- OpenTelemetry Express instrumentation README on npm: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
- OpenTelemetry PostgreSQL instrumentation README via package contents: https://app.unpkg.com/@opentelemetry/instrumentation-pg@0.54.0/files/README.md
- Linked OneUptime Collector article: https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view

## Issues Found
- The opening description implied a single core repository provides APIs and SDKs. Updated it to distinguish the OpenTelemetry specification, language SDK repositories, and contrib packages.
- The post said contrib packages generate spans, metrics, and logs automatically. Updated this to "telemetry such as spans and metrics where supported" because support varies by instrumentation and signal.
- The Express explanation overstated what `@opentelemetry/instrumentation-express` does by itself. Updated it to explain that Express instrumentation creates spans for middleware, routers, and route handlers, and is typically used with HTTP instrumentation for incoming server spans.
- The HTTP instrumentation configuration used non-current option names and shape: `ignoreIncomingPaths` is not a current `HttpInstrumentationConfig` option, and `headersToSpanAttributes` now uses `client` and `server` groups. Updated the snippet to use `ignoreIncomingRequestHook` and `headersToSpanAttributes.server`.
- The HTTP configuration text claimed request and response bodies can be captured as a configuration feature. Updated it to describe selected header capture and custom attributes via hooks.
- The custom instrumentation example used `startSpan`, which would not make automatically instrumented async work a child of the custom business span unless context was manually activated. Updated it to use `tracer.startActiveSpan`.
- The custom instrumentation example used numeric span status codes. Updated it to import and use `SpanStatusCode.OK` and `SpanStatusCode.ERROR`.
- The custom instrumentation example treated a PostgreSQL query result as a user object and used the older Stripe Charges-style call. Updated it to read `result.rows[0]` and use a PaymentIntent-style example.
- The sampling example imported `TraceIdRatioBasedSampler` from `@opentelemetry/sdk-trace-base`, while the official Node.js sampling guide imports it from `@opentelemetry/sdk-trace-node`. Updated the import to match the official Node.js documentation.
- The production environment example used `OTEL_EXPORTER_OTLP_ENDPOINT` directly as the trace exporter URL. Updated it to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, which is appropriate when explicitly configuring the trace exporter URL.
- The production sampler fallback used `parseFloat(value) || 1.0`, which would incorrectly turn a valid `0` sampling argument into `1.0`. Updated it to preserve finite numeric values, including `0`.

## Review Notes
The post remains a general guide rather than a version-pinned tutorial. Current OpenTelemetry JavaScript packages continue to evolve, so package README compatibility ranges should be checked before adopting specific instrumentations in production.
