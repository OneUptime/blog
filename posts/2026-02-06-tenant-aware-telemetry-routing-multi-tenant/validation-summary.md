# Validation Summary: How to Implement Tenant-Aware Telemetry Routing in Multi-Tenant SaaS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK for Python
- OpenTelemetry API for JavaScript
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector count connector
- OpenTelemetry baggage and context propagation

## Sources Consulted
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry JavaScript PropagationAPI documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.PropagationAPI.html
- OpenTelemetry baggage documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md

## Issues Found
- The Python resource attribute example used `os.getenv()` without importing `os`, and it created a `TracerProvider` without installing it as the global provider. Added `import os`, imported `trace`, and called `trace.set_tracer_provider(provider)` so the resource applies to emitted telemetry.
- The JavaScript baggage example imported an unused `baggage` binding from `@opentelemetry/api`. The current documented baggage operations are exposed through `propagation`, so the unused import was removed. The receiving-side JavaScript example also called `trace.getActiveSpan()` without importing `trace`, so the import was added there.
- The routing connector configuration used `statement: route() where ...` and a catch-all `route()` entry. Current routing connector documentation uses `condition` entries and `default_pipelines` for unmatched telemetry. Updated the snippet to use `default_pipelines`, `condition`, and explicit `resource` and `span` contexts so it covers both resource attributes from single-tenant deployments and span attributes from shared services.

## Review Notes
- The tail sampling configuration matches the documented `status_code`, `and`, `string_attribute`, and `probabilistic` policies. In a production deployment, all spans for a trace must reach the same collector instance for tail sampling decisions to be correct.
- The count connector example matches the documented custom count structure. Attribute cardinality should be controlled in production because per-tenant metrics can create one time series per tenant and tier combination.
- Baggage is appropriate for propagating tenant context, but it is transmitted in headers and should not contain sensitive tenant secrets.
