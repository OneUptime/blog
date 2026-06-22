# Validation Summary: How to Configure OpenTelemetry Protocol (OTLP)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry SDK environment variables
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP exporters

## Sources Consulted
- OpenTelemetry OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript Resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK for Node.js README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md

## Issues Found
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript examples use `resourceFromAttributes(...)`, so the snippet was updated to import and use `resourceFromAttributes`.
- The Collector configuration referenced the `batch` processor in the traces pipeline without defining it. Added `processors: batch: {}` so the configuration is complete.
- The Collector configuration used the deprecated `otlphttp` exporter component alias. Updated it to the current `otlp_http` component name and changed the pipeline reference accordingly.

## Review Notes
The OTLP transport, default ports, endpoint environment variables, timeout setting, header syntax, Python OTLP HTTP exporter usage, and Collector OTLP receiver settings were consistent with current OpenTelemetry documentation. The OneUptime endpoint examples are plausible vendor-specific endpoints, but vendor-specific authentication behavior was not validated against a dedicated OneUptime OTLP ingestion reference.
