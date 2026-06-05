# Validation Summary: How to Trace Remix Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- Remix
- React
- Node.js
- Express
- TypeScript
- OTLP/HTTP exporters

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript semantic conventions API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Remix Express adapter documentation: https://v2.remix.run/docs/other-api/adapter/
- Remix quickstart Express server documentation: https://remix.run/docs/en/main/start/quickstart

## Issues Found
- The instrumentation example used `Resource.default()` and `new Resource(...)`, but current `@opentelemetry/resources` does not export `Resource` as a constructor. Changed the example to use `defaultResource().merge(resourceFromAttributes(...))`.
- The instrumentation example used deprecated `SemanticResourceAttributes` constants. Changed it to current constants such as `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The deployment environment resource attribute used deprecated `deployment.environment`. Changed it to `deployment.environment.name`.
- The OTLP trace exporter example read `OTEL_EXPORTER_OTLP_ENDPOINT` as a full `/v1/traces` URL. Changed it to `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, which the OTLP spec says is used as-is for trace exports.
- The custom span examples used numeric status codes (`1` and `2`). Changed them to the current `SpanStatusCode.OK` and `SpanStatusCode.ERROR` enum names.
- The loader example claimed to fetch user data and activity in parallel but awaited them sequentially. Changed the example to use `Promise.all`.
- The introduction and dependency section overstated client-side and Remix-specific instrumentation. Adjusted the wording to accurately describe server-side tracing for an Express-based Remix server.
- Removed an unused `context` import from the loader example.

## Review Notes
The examples are written for an Express-based Remix server. Remix apps deployed on other adapters, serverless platforms, or edge runtimes require adapter-specific initialization and may not use the same Node.js auto-instrumentation path.
