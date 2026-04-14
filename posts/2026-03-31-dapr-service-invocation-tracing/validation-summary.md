# Validation Summary: How to Trace Service Invocation Calls Across Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- OpenTelemetry (tracing SDK and collector)
- Zipkin (trace backend)
- Jaeger (trace backend)
- W3C TraceContext (trace propagation standard)
- Python (OpenTelemetry SDK example)
- Kubernetes (deployment annotations, kubectl commands)
- Docker (Zipkin container)

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Zipkin tracing how-to: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr W3C trace context overview: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr distributed tracing overview: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- OpenTelemetry Python SDK documentation: https://opentelemetry.io/docs/languages/python/

## Issues Found
1. **Incorrect claim about Zipkin B3 header support**: The "Trace Headers Dapr Uses" table listed `X-B3-TraceId` and `X-B3-SpanId` as headers supported by Dapr. According to official Dapr documentation, Dapr exclusively uses W3C TraceContext (`traceparent` and `tracestate`) for trace propagation. While Dapr can export traces to Zipkin as a backend, it does not propagate B3 headers between sidecars. Removed the two B3 header rows from the table.

## Review Notes
- The Jaeger deployment section uses the Jaeger Operator CRD approach. Jaeger v2 has shifted toward OpenTelemetry Collector-based architecture, so this approach may need updating in the future as the Jaeger Operator evolves.
- All Dapr Configuration resource fields (`apiVersion`, `kind`, `spec.tracing.samplingRate`, `spec.tracing.zipkin.endpointAddress`, `spec.tracing.otel.*`) are correct per current Dapr documentation.
- The `dapr run` CLI flags (`--app-id`, `--app-port`, `--config`) are all verified correct.
- The service invocation URL format (`/v1.0/invoke/{app-id}/method/{method-name}`) and default HTTP port (3500) are correct.
- The Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/config`) are all correct.
- The Python OpenTelemetry SDK code example uses correct API calls (`extract`, `start_as_current_span`, `set_attribute`).
- The `samplingRate` being a string value (e.g., `"1"`) is correct per Dapr's configuration spec.
