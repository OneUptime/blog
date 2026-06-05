# Validation Summary: How to Use Resource Attributes Consistently Across Traces, Metrics, and Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry resources and semantic conventions
- OpenTelemetry SDK declarative configuration
- OpenTelemetry Collector resource and transform processors
- OTTL
- Prometheus/PromQL
- TraceQL
- LogQL
- Python/YAML validation scripting

## Sources Consulted
- OpenTelemetry Resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry declarative configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry declarative configuration schema docs: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus guide for OpenTelemetry ingestion: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The SDK declarative configuration used `file_format: "0.3"`, map-style `resource.attributes`, and an `otlp` exporter with a `protocol` field. Updated the example to `file_format: "1.0"`, list-style `resource.attributes` entries with `name` and `value`, and `otlp_grpc` exporters, matching the current OpenTelemetry declarative configuration schema.
- The shared resource examples used map-style resource attributes, which no longer match the current SDK declarative configuration schema. Updated those snippets to list-style `name`/`value` entries.
- The Collector example referenced `otlp`, `otlp/backend`, and `batch` pipeline components without declaring them. Added minimal `receivers`, `batch`, and `exporters` sections so the Collector configuration is structurally complete.
- The resource detector example used `resource.detectors` and an `env` detector. Updated it to use `attributes_list` for `OTEL_RESOURCE_ATTRIBUTES` and `detection/development.detectors` for SDK resource detection, matching the current declarative schema.
- The CI validation script assumed `resource.attributes` was always a mapping. Updated it to support the current list-style declarative configuration while preserving support for older map-style examples.
- The query section claimed the same attribute names work across all query languages. Clarified that the same attribute concepts and values are used, while some backends normalize names, such as converting dots to underscores for label names.

## Review Notes
The article is technically relevant and salvageable. OpenTelemetry declarative configuration support is still implementation-dependent and includes experimental `/development` fields for resource detection, so future reviews should re-check the schema and language support matrix.
