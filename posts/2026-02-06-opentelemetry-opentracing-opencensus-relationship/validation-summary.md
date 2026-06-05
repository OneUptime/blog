# Validation Summary: How to Understand the Relationship Between OpenTelemetry, OpenTracing,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTracing
- OpenCensus
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Java OpenTracing API
- Python OpenCensus API and OpenTelemetry OpenCensus shim
- Node.js OpenTelemetry API
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry documentation: Migrating from OpenTracing, https://opentelemetry.io/docs/migration/opentracing/
- OpenTelemetry specification: OpenTracing compatibility, https://opentelemetry.io/docs/specs/otel/compatibility/opentracing/
- OpenTelemetry specification: OpenCensus compatibility, https://opentelemetry.io/docs/specs/otel/compatibility/opencensus/
- OpenTelemetry Python documentation: OpenCensus Shim for OpenTelemetry, https://opentelemetry-python.readthedocs.io/en/latest/shim/opencensus_shim/opencensus_shim.html
- OpenTelemetry Python documentation: OpenCensus shim example, https://opentelemetry-python.readthedocs.io/en/latest/examples/opencensus-shim/README.html
- OpenTelemetry Java repository: OpenTracingShim source, https://github.com/open-telemetry/opentelemetry-java/blob/main/opentracing-shim/src/main/java/io/opentelemetry/opentracingshim/OpenTracingShim.java
- OpenTelemetry Java documentation: Java ecosystem overview, https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry documentation: Collector overview, https://opentelemetry.io/docs/collector/
- OpenTelemetry documentation: Collector configuration, https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry specification: OTLP exporter configuration, https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry semantic conventions: Database client spans, https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry semantic conventions: SQL database client operations, https://opentelemetry.io/docs/specs/semconv/database/sql/
- OpenTelemetry blog: Sunsetting OpenCensus, https://opentelemetry.io/blog/2023/sunsetting-opencensus/
- OpenTracing project site, https://opentracing.io/
- Google Open Source Blog: OpenTelemetry merger announcement, https://opensource.googleblog.com/2019/05/opentelemetry-merger-of-opencensus-and.html

## Issues Found
- The Java OpenTracing example used `ImmutableMap` without importing it or declaring a Guava dependency. Replaced it with standard-library `HashMap` and `Map` imports so the snippet is syntactically self-contained.
- The Node.js OpenTelemetry example used `SpanStatusCode` without importing it from `@opentelemetry/api`. Added the missing import.
- The OpenTelemetry tracer version text described the second `getTracer` argument as a service version. Corrected it to instrumentation scope version; service version belongs in resource metadata, not the tracer identity.
- The Java OpenTracing shim example referenced `OpenTelemetry` and `Span` without imports. Added the missing imports.
- The native OpenTelemetry database example used older database semantic convention attribute names, `db.statement` and `db.system`. Updated the OpenTelemetry side to current stable names, `db.query.text` and `db.system.name`.

## Review Notes
OpenTracing and most OpenCensus repositories are archived, and the post's migration guidance is consistent with OpenTelemetry's shim and bridge documentation. OpenTelemetry deprecated OpenTracing compatibility specification requirements in 2026, so the shim should continue to be treated as a temporary migration aid rather than a long-term instrumentation strategy.
