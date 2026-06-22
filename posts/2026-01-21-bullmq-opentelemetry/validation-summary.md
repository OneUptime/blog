# Validation Summary: How to Instrument BullMQ with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BullMQ
- Node.js
- TypeScript
- Redis / ioredis
- OpenTelemetry JavaScript SDK and API
- OTLP HTTP exporters
- Jaeger
- Docker Compose

## Sources Consulted
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Node SDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry semantic conventions resource documentation: https://opentelemetry.io/docs/specs/semconv/resource/
- BullMQ connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ flows documentation: https://docs.bullmq.io/guide/flows
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Current npm package metadata and type declarations for @opentelemetry/api, @opentelemetry/resources, @opentelemetry/semantic-conventions, @opentelemetry/sdk-trace-base, bullmq, ioredis, and express.

## Issues Found
- The setup commands omitted packages used by the examples, including `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `express`, and `@types/express`. Added the missing packages and replaced `@opentelemetry/sdk-trace-node` with `@opentelemetry/sdk-trace-base` where the custom span processor types are used.
- The tracing setup used `new Resource(...)` and `SemanticResourceAttributes`, which are outdated for current OpenTelemetry JS packages. Replaced them with `resourceFromAttributes` and current `ATTR_*` semantic convention constants, including `deployment.environment.name`.
- The OTLP exporter examples used `OTEL_EXPORTER_OTLP_ENDPOINT` directly as the programmatic `url`, which would omit `/v1/traces` or `/v1/metrics` when set to a base endpoint. Updated the examples to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`.
- The complete app imported `SpanKind` but used `SpanStatusCode` without importing it. Corrected the import.
- The Docker Compose example set `REDIS_HOST=redis`, but the app snippet hard-coded `localhost`. Updated the Redis connection to use `REDIS_HOST` and `REDIS_PORT` environment variables.
- The metrics snippet imported unused `ValueType`. Removed the unused import.
- The custom span processor imported types from `@opentelemetry/sdk-trace-node` and used the old `onStart(span)` signature. Updated it to import from `@opentelemetry/sdk-trace-base` and use `onStart(span, _parentContext)`.
- The baggage example imported a non-existent `baggage` export from `@opentelemetry/api` and called non-existent `baggage.setEntries(...)`. Updated it to use `propagation.createBaggage()`, `propagation.getBaggage()`, `bag.setEntry(...)`, and `propagation.setBaggage(...)`.
- The worker examples created plain object copies of BullMQ `Job` instances when removing internal trace or baggage fields. Updated them to preserve the original job prototype so job methods remain available to processors.

## Review Notes
- Jaeger is appropriate as the tracing backend through its OTLP receiver. Metrics should be exported to an OpenTelemetry Collector or another metrics backend when `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is configured.
