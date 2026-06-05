# Validation Summary: How to Understand the OpenTelemetry Data Model for Beginners

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry data model
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry semantic conventions
- W3C Trace Context
- OpenTelemetry Collector tail sampling
- OTLP

## Sources Consulted
- OpenTelemetry Specification: Overview and SpanContext: https://opentelemetry.io/docs/specs/otel/overview/
- OpenTelemetry Tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript `@opentelemetry/resources` API: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry JavaScript semantic conventions package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry Resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry Database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The resource example used the deprecated `SemanticResourceAttributes` namespace object and `new Resource(...)` constructor style. Updated it to `resourceFromAttributes(...)` with current semantic attribute names.
- The first span example referenced `trace.SpanKind.INTERNAL`, but `SpanKind` is exported directly from `@opentelemetry/api`. Updated the import and usage.
- Several HTTP semantic convention examples used older attribute names such as `http.method`, `http.status_code`, `http.url`, `http.target`, `http.host`, `http.scheme`, and `http.user_agent`. Updated them to current stable names such as `http.request.method`, `http.response.status_code`, `url.full`, `url.path`, `server.address`, `url.scheme`, and `user_agent.original`.
- The database semantic convention example used older attributes such as `db.system`, `db.statement`, `db.name`, `db.user`, `db.connection_string`, and `net.peer.*`. Updated the example to current database attributes including `db.system.name`, `db.operation.name`, `db.namespace`, `db.collection.name`, `db.query.summary`, `server.address`, and `server.port`.
- The messaging examples used deprecated `messaging.destination` and `messaging.source`. Updated them to `messaging.destination.name` and added current operation attributes.
- The HTTP propagation example implied headers are always added automatically. Clarified that this depends on HTTP instrumentation being enabled.
- The Service B Express snippet used `await` inside a non-async callback. Updated the route handler callback to `async`.
- The sampling snippet instantiated `NodeSDK` without importing it. Added the `NodeSDK` import.
- The sampling propagation explanation was too absolute. Qualified it for parent-based head sampling, where child spans follow the parent sampled decision.
- The final example summary claimed bounded-cardinality attributes even though the example includes identifiers. Reworded it to say the example uses meaningful attributes while being mindful of cardinality.

## Review Notes
Some snippets remain illustrative and omit surrounding application setup, SDK initialization, and real implementations of placeholder functions such as `validatePaymentInfo`, `database.query`, and `saveOrder`. That is acceptable for a beginner data-model guide, but a runnable tutorial would need complete setup code.
