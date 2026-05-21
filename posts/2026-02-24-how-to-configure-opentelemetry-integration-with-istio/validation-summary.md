# Validation Summary: How to Configure OpenTelemetry Integration with Istio

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio
- OpenTelemetry Collector
- Kubernetes
- Istio Telemetry API
- Prometheus metrics scraping
- Envoy OpenTelemetry Access Log Service
- OTLP/gRPC

## Sources Consulted
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / extension providers reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The collector example claimed to handle logs but did not define a logs pipeline. Added an OTLP logs pipeline with the debug exporter so the later `envoyOtelAls` example has a collector pipeline that can receive access logs.
- The collector Deployment used `otel/opentelemetry-collector-contrib:0.96.0`, which is substantially outdated. Updated it to `0.151.0`, the current contrib release confirmed during review.
- The metrics section implied Istio directly exports service-mesh metrics through OpenTelemetry. Istio exposes standard metrics in Prometheus format; revised the wording to explain that the OpenTelemetry Collector should scrape those metrics.
- The `prometheus` extension provider used `scrape: true`, which is not a current Istio `PrometheusMetricsProvider` field. Replaced it with `prometheus: {}` and added `defaultProviders.metrics`.
- The OpenTelemetry Collector Prometheus receiver snippet rewrote `__address__` from only the Prometheus port annotation, which would produce an invalid or incomplete scrape target. Changed it to preserve the pod host from `__address__`, set port `15020`, and set `__metrics_path__` to `/stats/prometheus`.
- The metrics scrape snippet added a Prometheus receiver but did not add that receiver to the metrics pipeline. Added `prometheus` to the metrics pipeline receivers.
- The collector manifest used Kubernetes pod discovery without RBAC. Added a service account, cluster role, cluster role binding, and `serviceAccountName` so the collector can list and watch pods, services, and endpoints.

## Review Notes
The post is technically valid after the corrections. The Prometheus receiver is stateful, so production deployments with multiple collector replicas should use sharding or the OpenTelemetry Operator Target Allocator to avoid duplicate scrapes.
