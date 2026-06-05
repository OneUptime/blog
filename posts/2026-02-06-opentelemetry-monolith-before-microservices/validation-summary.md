# Validation Summary: How to Set Up OpenTelemetry for a Simple Monolith Before Moving to Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry traces, metrics, resources, semantic conventions, and context propagation
- Express.js
- Node.js CommonJS
- PostgreSQL / node-postgres
- Pino structured logging
- Axios HTTP client
- EventEmitter-based domain events

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry resources package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- npm package metadata for current OpenTelemetry JavaScript packages.

## Issues Found
- The install command omitted packages that the tracing setup imports directly. Added `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`.
- The tracing setup used older `Resource` and `SemanticResourceAttributes` APIs. Updated it to use `resourceFromAttributes` and stable semantic convention constants such as `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The resource examples used deprecated `deployment.environment`. Updated them to `deployment.environment.name`.
- Several manual tracing examples used `startSpan` without making the new span active, so nested auto-instrumented work would not reliably be parented under the custom span. Updated these snippets to use `startActiveSpan`.
- Several examples used numeric span status code values. Updated them to `SpanStatusCode.ERROR` for correctness and readability.
- The extracted service example created a span without showing span termination. Updated it to end the span in a `finally` block.
- The database wrapper used deprecated database semantic attributes such as `db.statement`, `db.system`, and `db.operation`. Updated them to current stable names: `db.query.text`, `db.system.name`, and `db.operation.name`.
- The payment success example referenced `orderId` without accepting it as a parameter. Updated the function signature to include `orderId`.
- The request context example used high-cardinality `user.id` and `request.id` as span attributes despite the later warning against unbounded attributes. Updated the span attributes to use bounded `user.tier` and added `userTier` to the request context.
- Removed an unused `repository` import from the public interface example.

## Review Notes
The updated OpenTelemetry imports and SDK construction were verified in a temporary Node.js project with current package versions. The post remains a conceptual tutorial rather than a complete runnable application, so placeholder functions such as `saveOrder`, `chargeCard`, and `getUserTier` are still assumed to exist in the surrounding application.
