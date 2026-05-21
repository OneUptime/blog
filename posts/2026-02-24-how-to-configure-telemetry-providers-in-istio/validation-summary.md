# Validation Summary: How to Configure Telemetry Providers in Istio

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio Telemetry API
- IstioOperator and MeshConfig
- Prometheus metrics
- Zipkin tracing
- Jaeger tracing
- OpenTelemetry Collector
- Envoy access logging
- Kubernetes manifests and kubectl

## Sources Consulted
- Istio Telemetry API overview: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio Zipkin integration docs: https://istio.io/latest/docs/ops/integrations/zipkin/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Jaeger integration docs: https://istio.io/latest/docs/ops/integrations/jaeger/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access logging task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector logging-to-debug exporter migration issue: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- Updated Telemetry resources from `telemetry.istio.io/v1alpha1` to the current `telemetry.istio.io/v1` API used in Istio documentation.
- Corrected the provider overview. Current Istio docs show Prometheus as the built-in metrics provider, `stackdriver` as legacy/limited tracing, and OpenTelemetry access logging through Envoy ALS rather than the tracing provider.
- Added `enableTracing: true` and `defaultConfig.tracing: {}` to tracing-oriented IstioOperator examples to match current Istio tracing task guidance.
- Updated Zipkin and Jaeger sample addon URLs from `release-1.20` to the current `release-1.30` branch shown in Istio 1.30 docs.
- Corrected the Jaeger provider example from a Zipkin provider on port 9411 to an OpenTelemetry provider on OTLP gRPC port 4317, matching current Istio Jaeger documentation.
- Added the missing Jaeger Telemetry resource so the configured Jaeger extension provider is actually selected.
- Corrected the OpenTelemetry access logging provider from `opentelemetry` with `logging: {}` to `envoyOtelAls`, which is the MeshConfig extension provider type Istio documents for OpenTelemetry access logs.
- Replaced the removed OpenTelemetry Collector `jaeger` exporter with `otlp/jaeger` and the removed `logging` exporter with `debug`.
- Added a logs pipeline to the OpenTelemetry Collector sample so the configured OpenTelemetry access logging provider has a corresponding OTLP logs pipeline.
- Moved `disabled: true` in the workload access logging example from inside the provider reference to the `accessLogging` item where the Telemetry schema defines it.

## Review Notes
- The OpenTelemetry Collector image still uses `latest`, which is acceptable for a short example but should be pinned in production.
- The Istio sample addons are suitable for demos and quick starts; production deployments should use hardened, capacity-planned installations.
- YAML snippets were parsed successfully after the corrections.
