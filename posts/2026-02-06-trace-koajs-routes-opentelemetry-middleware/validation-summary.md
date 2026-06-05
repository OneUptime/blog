# Validation Summary: How to Trace Koa.js Routes with OpenTelemetry Middleware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Koa.js
- @koa/router
- Node.js
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Koa and HTTP instrumentation
- OTLP HTTP trace exporter
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- @opentelemetry/resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- @opentelemetry/sdk-node package documentation: https://www.npmjs.com/package/@opentelemetry/sdk-node
- @opentelemetry/instrumentation-koa package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-koa
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Koa official documentation: https://koajs.com/
- @koa/router package documentation: https://www.npmjs.com/package/@koa/router

## Issues Found
- The instrumentation example used `new Resource()` and `Resource.default()`, but current `@opentelemetry/resources` exports `resourceFromAttributes()` instead of a constructible `Resource` class. Updated the example to use `resourceFromAttributes()`.
- The resource example used older `SemanticResourceAttributes` constants and the deprecated `deployment.environment` attribute. Updated it to use current `ATTR_*` semantic convention constants and `deployment.environment.name`.
- The OTLP exporter example read `OTEL_EXPORTER_OTLP_ENDPOINT` while passing the value directly as a trace exporter URL. Updated the code and environment snippet to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, which is the signal-specific full trace endpoint.
- The HTTP request hook used older HTTP semantic convention attribute names `http.user_agent` and `http.client_ip`. Updated them to `user_agent.original` and `client.address`.
- The SDK setup configured explicit HTTP and Koa instrumentation while also enabling the auto-instrumentation bundle, which can register the same instrumentation twice. Disabled the explicitly configured HTTP and Koa packages inside `getNodeAutoInstrumentations()`.
- The examples used numeric span status codes. Updated them to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The `app.js` example imported `context` from `@opentelemetry/api` but did not use it. Removed the unused import while adding `SpanStatusCode`.

## Review Notes
The Koa instrumentation package documentation currently marks the package as unmaintained, but it remains published, documents support for Koa `>=2.0.0 <4`, and is included in the Node auto-instrumentation bundle. The JavaScript snippets were checked with `node --check` after edits.
