# Validation Summary: How to Build an Internal OpenTelemetry FAQ and Troubleshooting Knowledge Base

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry SDK configuration
- OpenTelemetry OTLP exporters
- OpenTelemetry Collector processors
- OpenTelemetry Python instrumentation
- OpenTelemetry Java tracing API
- otel-cli
- Jaeger trace search
- Grafana Tempo TraceQL

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python Resource API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Java tracing API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector memory limiter processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- otel-cli README: https://github.com/equinix-labs/otel-cli
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The troubleshooting command used `curl -v http://otel-collector.observability:4317` to verify the default OTLP/gRPC endpoint. Port 4317 is the default OTLP/gRPC port, not an OTLP/HTTP endpoint, so a plain HTTP curl can produce misleading results. Changed it to `nc -vz otel-collector.observability 4317` to validate TCP reachability for the gRPC endpoint.
- The SDK startup log example implied a portable, exact log line. OpenTelemetry SDK startup and internal debug output vary by language implementation, so the comment now tells readers to look for language-specific startup or debug logs mentioning the configured OTLP exporter.
- The Python service-name code created a `Resource` but did not attach it to a provider. OpenTelemetry resources are applied by passing them to a `TracerProvider` or other provider during initialization, so the snippet now registers a `TracerProvider(resource=resource)`.

## Review Notes
The remaining examples are intentionally concise FAQ snippets rather than complete applications. The Java span lifecycle pattern, Python requests instrumentation, context injection example, `OTEL_SERVICE_NAME`, collector batch processor keys, memory limiter processor keys, `otel-cli exec --service --name`, and TraceQL selector shape align with current documentation.
