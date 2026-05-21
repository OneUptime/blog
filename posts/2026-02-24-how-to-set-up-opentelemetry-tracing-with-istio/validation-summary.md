# Validation Summary: How to Set Up OpenTelemetry Tracing with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Istio Telemetry API
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- Kubernetes manifests and kubectl commands
- Jaeger, Grafana Tempo, and Datadog trace export

## Sources Consulted
- Istio distributed tracing with OpenTelemetry: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio trace sampling configuration: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / OpenTelemetryTracingProvider reference: https://preliminary.istio.io/latest/docs/reference/config/istio.mesh.v1alpha1.html
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Datadog OpenTelemetry Collector setup documentation: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- The Collector image used an old `0.96.0` tag. Updated examples to `0.152.1`, the current OpenTelemetry Collector release available at review time.
- The Collector metrics verification command port-forwarded service port `8888`, but the Service and Deployment did not expose that port. Added the current Collector internal telemetry Prometheus reader configuration and exposed the `metrics` port.
- The debug exporter verification command searched for `TracesExported`, which does not match the current debug exporter output. Changed it to search for `Traces`.
- The Datadog multi-backend example used a generic OTLP/HTTP exporter pointed at `trace.agent.datadoghq.com`. Replaced it with the documented Datadog Collector exporter using `DD_API_KEY` and `site`.
- The filter processor example used the legacy `traces.span` configuration shape. Updated it to the current `trace_conditions` OTTL form with `span.attributes[...]` and `error_mode: ignore`.
- The resource attribute section described Telemetry API `customTags` as resource attributes. Corrected the text to distinguish OpenTelemetry resource detector attributes from Istio custom span tags.
- The troubleshooting command attempted to `curl` the OTLP/gRPC port from the `istio-proxy` container. Replaced it with a temporary curl pod that checks the Collector's OTLP/HTTP endpoint.
- The scaled Deployment snippet lacked template labels matching the selector. Added the missing template labels.

## Review Notes
The Istio `opentelemetry.resourceDetectors` examples in official documentation are inconsistent between task pages and API reference casing. The post now follows the API reference form used for `OpenTelemetryTracingProvider`. Tail sampling remains correct, but production deployments should ensure trace affinity so all spans for a trace reach the same Collector instance.
