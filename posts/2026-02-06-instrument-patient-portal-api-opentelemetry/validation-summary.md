# Validation Summary: How to Instrument Patient Portal and Health App API Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript
- Node.js
- Express
- OpenTelemetry OTLP exporters
- OpenTelemetry HTTP, Express, and PostgreSQL instrumentations
- Browser performance metrics
- FHIR Observation search

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Node SDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript NodeSDK class documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- HL7 FHIR Observation search parameter documentation: https://fhir.hl7.org/fhir/observation-search.html

## Issues Found
- Manual spans were created with `tracer.startSpan`, which starts spans without making them active in context. Changed the request and child spans to use `tracer.startActiveSpan` so nested spans inherit context as recommended by OpenTelemetry JavaScript documentation.
- Error span status used the numeric value `2`. Changed it to `SpanStatusCode.ERROR` from `@opentelemetry/api` so the examples use the current public API rather than relying on enum internals.
- Error handlers set span status but did not record the exception. Added `span.recordException(error)` before setting error status in catch blocks.
- Child spans could remain open if the awaited operation threw before `end()` was called. Wrapped child span bodies in `try`/`finally` so spans are ended reliably.
- The browser metrics example imported only `@opentelemetry/api`, which would be no-op without a registered `MeterProvider`. Added `@opentelemetry/sdk-metrics` with an OTLP HTTP metrics exporter and registered the provider before creating the meter.

## Review Notes
The FHIR Observation query uses valid `patient`, `category`, `date` sort, and `_count` search parameters. The browser metrics exporter URL is intentionally shown as an example gateway endpoint; in production it must be replaced with a collector or gateway reachable from browsers and configured for CORS.
