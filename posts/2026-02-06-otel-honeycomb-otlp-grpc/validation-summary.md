# Validation Summary: How to Send OpenTelemetry Traces and Metrics to Honeycomb via OTLP gRPC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Honeycomb
- OTLP gRPC
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK
- OpenTelemetry environment variable configuration

## Sources Consulted
- Honeycomb Docs: Send Data with the OpenTelemetry Collector - https://docs.honeycomb.io/getting-data-in/otel-collector/
- Honeycomb Docs: Send Application Metrics to Honeycomb - https://docs.honeycomb.io/send-data/metrics/application/
- Honeycomb Docs: Get Started with Traces and Wide Events - https://docs.honeycomb.io/quick-start
- OpenTelemetry Docs: OTLP Exporter Configuration - https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Specification: OpenTelemetry Protocol Exporter - https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Semantic Conventions: Deployment attributes - https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Go package docs: otlptracegrpc - https://go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go package docs: otlpmetricgrpc - https://go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- Go package docs: semconv v1.37.0 - https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Python docs: OTLP exporters - https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The prerequisites implied every Honeycomb user needs a dataset header for all telemetry. Updated this to distinguish service name based trace routing from Honeycomb Classic trace dataset routing, and to note that metrics should include a metrics dataset header.
- The Go metrics provider did not attach the service resource, so metrics would not carry the same `service.name`, service version, and deployment attributes as traces. Added a shared `newResource()` helper and configured `sdkmetric.WithResource(res)`.
- The post used the older `deployment.environment` semantic convention attribute. Updated Go and Python examples, plus environment variables, to use `deployment.environment.name`.
- The environment variable example was for an OTLP endpoint but did not explicitly select gRPC. Added `OTEL_EXPORTER_OTLP_PROTOCOL="grpc"`.
- The environment variable example used one shared dataset header for traces and metrics. Added `OTEL_EXPORTER_OTLP_METRICS_HEADERS` so metrics route to a metrics dataset.
- The Honeycomb Environments section said no dataset header is needed at all. Updated it to say trace exporters do not need a trace dataset header in Environments mode, while metrics should still include a metrics dataset header.

## Review Notes
The Go and Python exporter APIs shown are current and valid. The examples use direct-to-Honeycomb OTLP gRPC export; for larger deployments, a Collector is still commonly preferred for batching, retries, filtering, and central configuration.
