# Validation Summary: How to Build a Self-Service Observability Platform Using OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector processors, receivers, exporters, and pipelines
- Backstage software catalog descriptors
- Python dataclasses and type hints
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector filter processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- OpenTelemetry Collector memory limiter processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- Backstage catalog descriptor format documentation: https://github.com/backstage/backstage/blob/master/docs/features/software-catalog/descriptor-format.md

## Issues Found
- The Collector metrics filter comment said it enforced metric cardinality limits. The configured `filter` processor with `metrics.include.metric_names` whitelists metric names and drops non-matching metrics; it does not enforce series cardinality. Updated the comment to describe approved metric name filtering and clarify that quotas handle cardinality limits.
- The gateway Collector config comment claimed rate limiting per team based on headers, but the snippet only configured `batch` and `resource` processors. Updated the comment to describe batching instead of rate limiting.
- The Python configuration API snippet raised `QuotaExceededError` without defining it. Added a minimal custom exception class so the example is internally consistent.
- The Python dataclass used `List[str] = None` and `float = None` for optional fields. Updated those annotations to `Optional[List[str]]` and `Optional[float]` to match the actual default values.

## Review Notes
The `otel-platform` CLI commands are examples for a hypothetical internal self-service CLI, not commands from an official OpenTelemetry CLI. The Collector YAML snippets parse successfully, and the Python snippets compile successfully after the fixes.
