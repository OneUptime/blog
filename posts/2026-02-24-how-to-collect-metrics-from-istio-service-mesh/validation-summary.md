# Validation Summary: How to Collect Metrics from Istio Service Mesh

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Envoy sidecars
- Prometheus
- Prometheus Operator ServiceMonitor and PodMonitor resources
- Kubernetes
- PromQL
- Istio Telemetry API

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration reference for Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post described port 15020 as the only sidecar metrics endpoint and used scrape examples that did not match Istio's documented customized Envoy scrape job. Updated the wording to distinguish merged metrics on port 15020 from Envoy-only metrics on the `http-envoy-prom` port, and changed the PodMonitor and plain Prometheus examples to keep targets by the `*-envoy-prom` container port name.
- The PodMonitor example selected pods using `security.istio.io/tlsMode`, which is not the documented way to discover Envoy metrics targets. Changed it to select pods broadly and let the endpoint port and relabeling restrict scraping to Envoy metrics ports.
- The "Reducing Metric Volume" section included an IstioOperator snippet with `proxyStatsMatcher: {}` and `enablePrometheusMerge: true`, which does not reduce standard metric labels. Removed that misleading snippet and kept the Telemetry API example, which is the correct mechanism for suppressing Istio metric dimensions.
- The `pilot_xds_pushes` description was too broad. Updated it to match the Istio reference description for XDS push results for LDS, RDS, CDS, and EDS.

## Review Notes
The remaining examples are general-purpose snippets and may need namespace or selector labels adjusted for a specific Prometheus Operator installation, since Prometheus instances usually select ServiceMonitor and PodMonitor resources by labels.
