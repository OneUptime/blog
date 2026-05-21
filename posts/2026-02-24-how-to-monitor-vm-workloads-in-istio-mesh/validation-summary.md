# Validation Summary: How to Monitor VM Workloads in Istio Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio virtual machine workloads and WorkloadEntry
- Istio Telemetry API
- Prometheus scraping, service discovery, PromQL, and alerting rules
- OpenTelemetry Collector and Prometheus Remote Write
- Envoy tracing and access logs
- Grafana Alloy and Loki log forwarding
- Grafana dashboards
- Kiali service graph

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio secure metrics scraping: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio virtual machine diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OpenTelemetry Collector Prometheus Remote Write exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana Alloy loki.source.journal reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.journal/
- Grafana Alloy loki.process reference: https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Grafana Loki Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Kiali virtual machine workloads documentation: https://kiali.io/docs/configuration/vm/
- Envoy tracing documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html

## Issues Found
- The post used port `15090` as the main Istio sidecar metrics endpoint. Istio documents workload metrics on the sidecar telemetry port `15020`, with `15090` used for Envoy-only metrics. Updated the curl commands, Prometheus targets, file service discovery targets, Consul relabeling, and OpenTelemetry Collector scrape target to use `15020`, while noting the Envoy-only use of `15090`.
- The tracing section configured an extension provider but did not enable the provider with the Telemetry API. Added a `telemetry.istio.io/v1` `Telemetry` resource selecting the provider.
- The access logging example used `telemetry.istio.io/v1alpha1`. Updated it to the current `telemetry.istio.io/v1` API.
- The journal command filtered for `[accesslog]`, which is not part of Istio's default Envoy access log format. Removed the inaccurate grep filter.
- The log shipping example used Promtail, which is end of life as of March 2, 2026. Replaced it with a Grafana Alloy journal-to-Loki example using `loki.source.journal`, `loki.process`, and `loki.write`.
- The VM sidecar alert used `absent(up{job="istio-vm-proxies"} == 1)`, which only detects that no matching scrape targets exist and does not identify a disconnected target. Replaced it with `up{job="istio-vm-proxies"} == 0` and included the instance label in the annotation.
- The Kiali section claimed VM nodes are shown with a VM icon and implied WorkloadEntry registration alone is sufficient. Kiali documentation states that VM telemetry must be scraped by Prometheus and that Kiali does not currently distinguish VM-based workloads from pod-based workloads. Updated the wording accordingly.

## Review Notes
The remaining examples are intentionally generic and may need environment-specific additions such as TLS, authentication, network policy, or secure mTLS scraping before production use.
