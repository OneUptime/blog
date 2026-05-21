# Validation Summary: How to Migrate from Jaeger/Zipkin to OpenTelemetry in Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio distributed tracing
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Jaeger
- Zipkin
- Grafana Tempo
- Kubernetes and kubectl
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK

## Sources Consulted
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Zipkin tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Jaeger API documentation: https://www.jaegertracing.io/docs/latest/architecture/apis/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Go OTLP gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

## Issues Found
- The post claimed that both Jaeger and Zipkin accept OTLP directly. Jaeger supports OTLP natively, but Zipkin should be treated as a Zipkin-compatible backend unless a specific OTLP bridge/module is installed. Updated the wording to say the OpenTelemetry Collector can translate OTLP to Zipkin.
- The collector example used an OTLP exporter to send to `jaeger-collector.observability:4317`, even though the existing setup described Jaeger/Zipkin ingestion on port 9411. Changed this to a `zipkin/existing` exporter using the Zipkin v2 endpoint.
- The vendor-flexibility statement said OTLP works with any backend. Changed it to "any OTLP-compatible backend."
- The Istio OpenTelemetry example said to propagate both B3 and W3C headers but did not show the required mesh trace context setting. Added `defaultConfig.tracing.context` with `B3` and `W3C_TRACE_CONTEXT`.
- The Go Jaeger snippet referenced `jaegercfg` without importing the config package. Added the correct import.
- The Go OpenTelemetry snippet used `ctx` without defining it or importing `context`. Added both.
- The Python propagation snippet imported `TraceContextTextMapPropagator` from the wrong module path. Updated it to `opentelemetry.trace.propagation.tracecontext`.
- The cleanup phase referred to removing a Jaeger exporter after the collector example was corrected to use Zipkin-compatible export. Updated the heading and timeline wording.

## Review Notes
The post uses legacy `meshConfig.defaultConfig.tracing.zipkin.address` examples for the current-state and rollback sections. These remain technically recognizable for older Istio installations, but current Istio documentation prefers extension providers plus the Telemetry API for new configurations.
