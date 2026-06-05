# Validation Summary: How to Add OpenTelemetry Middleware to an Express.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- Express.js
- Node.js
- TypeScript
- HTTP tracing and middleware
- OTLP HTTP trace exporter

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry JS HTTP instrumentation API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry JS semantic conventions package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- Express error handling guide: https://expressjs.com/en/guide/error-handling.html
- npm package metadata for current package versions: `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/api`, and `express`

## Issues Found
- The tracing setup used `new Resource()` and `SemanticResourceAttributes`, which are no longer the current OpenTelemetry JS examples and semantic-convention exports. Changed the snippet to use `resourceFromAttributes()` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The OTLP exporter example used `OTEL_EXPORTER_OTLP_ENDPOINT` directly as the trace exporter `url`. Changed it to `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, because the exporter `url` expects the trace endpoint path such as `/v1/traces`.
- Several Express examples used static `import express from 'express'` after calling `initializeTracing()`. In ESM, static imports load before module body execution, so Express could be loaded before instrumentation starts. Changed those examples to dynamically import Express after tracing initialization.
- The complete middleware example used `trace.getActiveSpan()` without importing `trace`. Added the missing import through the same post-initialization dynamic import pattern.
- The custom tracing middleware used `kind: 1` instead of the `SpanKind.SERVER` enum. Replaced the magic number with the OpenTelemetry API enum.
- The custom tracing middleware used deprecated HTTP semantic attributes including `http.method`, `http.url`, `http.target`, `http.host`, `http.scheme`, `http.user_agent`, and `http.status_code`. Updated these to stable semantic convention attributes such as `http.request.method`, `url.full`, `url.path`, `url.scheme`, `server.address`, `user_agent.original`, and `http.response.status_code`.
- The response and performance middleware monkey-patched `res.end`, which is brittle and can conflict with Express/Node response behavior. Changed the examples to listen for the response `finish` event.
- The context enrichment example referenced `req.user` directly, which is not part of Express's base `Request` type. Added a local request type refinement before reading user properties.
- The selective tracing middleware did not actually prevent the custom tracing middleware from creating a span. Added a `skipTracing` request flag and corresponding check in the custom tracing middleware, and configured HTTP auto-instrumentation with `ignoreIncomingRequestHook` for the same excluded paths.
- TypeScript route middleware examples had implicit `any` parameters. Added `Request`, `Response`, and `NextFunction` typings.
- The test example imported Express and tracing middleware statically before tracing initialization. Changed it to initialize tracing first and then dynamically import Express and the middleware.

## Review Notes
- The article now aligns with the current OpenTelemetry JS setup style and stable HTTP semantic conventions. The examples still show custom middleware spans alongside official HTTP and Express auto-instrumentation; in a production application, teams should decide whether they want both layers or only enrichment of the auto-created spans to avoid duplicate server spans.
