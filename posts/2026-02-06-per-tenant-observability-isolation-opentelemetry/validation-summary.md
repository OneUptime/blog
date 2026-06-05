# Validation Summary: How to Use Per-Tenant Observability Isolation in Multi-Tenant SaaS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- FastAPI middleware
- Python context variables
- OTLP exporters

## Sources Consulted
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Python SDK resources API: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SpanProcessor API: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor

## Issues Found
- The post originally implied request-scoped tenant identity should be attached as OpenTelemetry resource attributes. Resource attributes are associated with a provider at initialization and describe the telemetry-producing entity, so I changed the wording to explain that tenant identity in a shared process is better represented as span attributes.
- The custom `ResourceDetector` example used `Resource.create()` inside `detect()`. OpenTelemetry Python documents that resource detectors should instantiate `Resource` directly to avoid recursive detector calls, so I changed it to `Resource(...)`.
- The `TenantSpanProcessor` snippet referenced `current_tenant` without importing it. I added the import from the tenant context module.
- The `TenantSpanProcessor.force_flush()` method returned `None`. The OpenTelemetry Python `SpanProcessor` API returns a boolean from `force_flush()`, so I changed it to return `True`.
- The tracing setup imported and used `BatchSpanExporter`, which is not the correct OpenTelemetry Python SDK processor class. I changed it to `BatchSpanProcessor`.
- The Collector filter example filtered on `resource_attributes`, but the tenant enrichment code writes span attributes. I updated the Collector configuration to use the current filter processor OTTL-style `trace_conditions` against `span.attributes`.
- The metrics dashboard paragraph implied the span processor would automatically add tenant attributes to metrics. I clarified that metrics need the tenant attribute recorded on metric measurements.

## Review Notes
The corrected Collector filter example uses the current documented OTTL-style filter processor configuration. Because the filter processor drops matching telemetry, each tenant pipeline drops spans that do not match the target tenant plan.
