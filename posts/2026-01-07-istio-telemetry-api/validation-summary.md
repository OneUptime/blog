# Validation Summary: How to Configure Istio Telemetry API for Custom Metrics

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig and extension providers
- Envoy proxy metrics and access logging
- Prometheus
- Jaeger / Zipkin tracing
- OpenTelemetry Collector
- Kubernetes and kubectl
- istioctl
- CEL expressions

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / ExtensionProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio custom metrics task documentation: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio metrics customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Envoy statistics overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/statistics

## Issues Found
- The post said the Telemetry API was stable from Istio 1.12 and used `telemetry.istio.io/v1alpha1` for Telemetry resources. Updated the prerequisite and examples to Istio 1.22+ with `telemetry.istio.io/v1`, matching current Istio documentation.
- Several metric tag override examples used the old Mixer-style `|` default operator for header fallback. Replaced these with CEL expressions using header existence checks, because Telemetry metric tag values are CEL expressions.
- Several tracing examples specified both Jaeger and OpenTelemetry Collector in the same tracing rule. Updated these to use a single provider per tracing rule and described using the OpenTelemetry Collector as the fan-out point, matching the current Telemetry API constraint.
- Metrics examples attempted to send Istio metrics to an OpenTelemetry tracing provider. Removed `otel-collector` from metrics provider lists and kept Prometheus for metrics.
- The histogram section implied the Telemetry API configures histogram buckets. Reworded it as latency classification tags and clarified that histogram bucket configuration is outside the Telemetry API.
- The custom access log section said custom log formats require an EnvoyFilter. Updated it to use MeshConfig extension provider `logFormat`, which is supported by the current Istio MeshConfig API.
- The troubleshooting section used `istioctl experimental telemetry workload`, which is not present in the official command reference. Replaced it with the documented `istioctl experimental envoy-stats` command.
- Adjusted header-based tracing wording because `randomSamplingPercentage` is not conditional on a request header in the Telemetry API.

## Review Notes
The examples remain environment-dependent: service names, namespaces, collector ports, and Jaeger Zipkin receiver support must match the reader's deployment. The IstioOperator API remains `install.istio.io/v1alpha1`, which is expected in Istio installation examples.
