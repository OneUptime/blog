# Validation Summary: How to Monitor Istio Service Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Prometheus and PromQL
- Kubernetes liveness and readiness probes
- Istio DestinationRule outlier detection
- Kiali health configuration
- Envoy metrics
- Jaeger tracing
- Grafana dashboards
- Bash, curl, and jq

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus histogram practices: https://prometheus.io/docs/practices/histograms/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Kiali Health feature documentation: https://kiali.io/docs/features/health/
- Kiali Traffic Health configuration: https://kiali.io/docs/configuration/health/
- Kiali CR reference for health_config: https://kiali.io/docs/configuration/kialis.kiali.io/
- Envoy upstream cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post described Istio outlier detection as active health checking. Istio outlier detection is passive ejection based on observed upstream failures, so the wording was changed to say Istio reacts to observed service health.
- The outlier detection explanation said Istio "checks every 30 seconds." The `interval` field is the time between ejection sweep analysis, so the wording was made precise.
- The Kiali health indicator list included "Envoy proxy health." Current Kiali documentation describes health as combining pod status and request traffic, with mesh infrastructure health surfaced separately in the masthead and overview. The bullets were updated accordingly.
- The Kiali `health_config` snippet used an object form for `namespace` and code values like `5XX` / `4XX`. Current Kiali CR documentation expects regex strings, so the snippet now uses `namespace: "production"` and HTTP status regexes such as `^5\\d\\d$`.

## Review Notes
The PromQL examples use standard Istio Prometheus metric names and histogram query patterns. The `host: order-service` DestinationRule example is valid because the rule is in the same namespace, though Istio recommends fully qualified service names to avoid namespace-resolution surprises.
