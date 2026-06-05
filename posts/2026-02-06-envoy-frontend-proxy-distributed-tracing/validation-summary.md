# Validation Summary: How to Set Up Envoy as a Front-End Proxy with Full Distributed Tracing via

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Envoy front-end proxy / HTTP connection manager
- Envoy OpenTelemetry tracer
- OpenTelemetry Collector OTLP gRPC receiver/export path
- OpenTelemetry Go SDK and `otelhttp` instrumentation
- W3C Trace Context propagation
- Docker Compose

## Sources Consulted
- Envoy OpenTelemetry tracer API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy HTTP connection manager tracing API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy OpenTelemetry tracing sandbox: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/opentelemetry.html
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go `otlptracegrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go `sdktrace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go `resource` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Go `propagation` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry SDK general environment configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The Go example configured `OTEL_SERVICE_NAME` in Docker Compose but did not attach an environment-derived resource to the `TracerProvider`. Added `resource.WithFromEnv()` and `sdktrace.WithResource(res)` so the exported spans use the configured service name.
- The Go OTLP gRPC exporter endpoint was set to `otel-collector:4317` without a URL scheme. Updated the Compose environment to `http://otel-collector:4317`, which current OpenTelemetry Go exporter documentation accepts for plaintext OTLP/gRPC to a local Collector.
- The Go example ignored exporter creation errors. Added explicit error handling so misconfigured OTLP exporter setup fails clearly.
- Envoy's OpenTelemetry tracer extension is documented as work-in-progress and not intended for production use. Updated the sampling comment to remind readers to reduce sampling and review tracer support status before production use.

## Review Notes
The Envoy HCM tracing provider, OpenTelemetry tracer type URL, `grpc_service`, `service_name`, route decorators, and HTTP/2 cluster protocol option match Envoy's documented API shape. The Compose `version: "3.8"` field remains valid for older Compose files, but modern Docker Compose v2/v5 treats the top-level version as optional/informative.
