# Validation Summary: How to Use Instrumentation Scope to Organize Telemetry by Library Version

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Instrumentation Scope
- OpenTelemetry tracing, metrics, and logs APIs
- OpenTelemetry Python API and SDK
- OpenTelemetry Java API
- OpenTelemetry JavaScript API
- OTLP data model
- OpenTelemetry Collector filter and transform processors
- OpenTelemetry Transformation Language (OTTL)

## Sources Consulted
- OpenTelemetry Specification: Instrumentation Scope: https://opentelemetry.io/docs/specs/otel/common/instrumentation-scope/
- OpenTelemetry Concepts: Instrumentation Scope: https://opentelemetry.io/docs/concepts/instrumentation-scope/
- OpenTelemetry Trace API Specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics API Specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python API reference for tracing: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python API reference for metrics: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Java API Javadocs for OpenTelemetry, TracerBuilder, and MeterBuilder: https://javadoc.io/doc/io.opentelemetry/opentelemetry-api
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL scope and span context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts
- OpenTelemetry OTTL functions reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md

## Issues Found
- The post said Instrumentation Scope has three fields. Current OpenTelemetry defines it as a tuple of name, version, schema URL, and attributes, with version, schema URL, and attributes optional. Updated the field list to include attributes.
- The Java example used `openTelemetry.getMeter(name, version)`, but the current Java `OpenTelemetry` API exposes `getMeter(name)` and `meterBuilder(name).setInstrumentationVersion(version).build()` for versioned meters. Updated the Java snippet accordingly.
- The Collector filter processor example used the legacy `traces.span` configuration shape. Current filter processor docs use `trace_conditions`, `metric_conditions`, and `log_conditions`, with the old signal-specific fields documented as deprecated. Updated the example to `trace_conditions`.
- The Collector transform example used `startswith` syntax, which is not valid OTTL. Updated it to the documented `HasPrefix(...)` converter.

## Review Notes
- The post's pseudo backend queries are illustrative rather than tied to a specific backend query language, so they were reviewed as conceptual examples.
- The Collector filter processor still supports the older configuration shape at the time of review, but the updated example now matches current documented usage.
