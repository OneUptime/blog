# Validation Summary: How to Configure OpenTelemetry Collector for Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Prometheus receiver and exporter
- Kubernetes Deployments, DaemonSets, Services, and HPAs

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector quick start documentation: https://opentelemetry.io/docs/collector/quick-start/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio OpenTelemetry access logging task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/

## Issues Found
- The Prometheus relabel replacement values used `${1}`, which the OpenTelemetry Collector interprets as configuration substitution and rejects because `1` is not a valid environment variable name. Replaced the brittle address rewrites with Istio's documented Kubernetes service discovery relabeling patterns for `istiod` and Envoy metrics ports.
- The article claimed the complete configuration collected all Istio telemetry, including logs, but the sample only configured trace and metric pipelines. Updated the wording to state that the sample covers traces and metrics, and that access logs require an Istio access log provider and collector logs pipeline.
- The OTLP receiver description said it handled trace and metric data pushed from Istio proxies. Istio's documented OpenTelemetry tracing provider pushes OTLP traces; Istio metrics are normally scraped from Prometheus endpoints. Updated the wording to refer to trace data.
- The Service omitted port 8888 even though the monitoring example scrapes the Collector's own metrics at `otel-collector.istio-system:8888`. Added the `collector-metrics` service port.
- The Service omitted port 55679 even though the troubleshooting command port-forwards `svc/otel-collector 55679:55679` for zPages. Added the `zpages` service port.
- The Collector image tag was pinned to `0.96.0`, which is outdated relative to the current official quick start image. Updated the examples to `otel/opentelemetry-collector-contrib:0.151.0` and validated the main configuration against that image.
- The gateway Deployment used three replicas while also configuring a Prometheus receiver. Multiple identical Prometheus receiver replicas scrape the same targets unless scraping is sharded. Changed the example to one scraping replica and added guidance to use the OpenTelemetry Target Allocator when scaling Prometheus scraping.
- The Kubernetes manifests did not include service account/RBAC permissions for the Prometheus receiver's Kubernetes service discovery. Added a ServiceAccount, ClusterRole, ClusterRoleBinding, and `serviceAccountName` references.

## Review Notes
The main collector configuration was validated with `otel/opentelemetry-collector-contrib:0.151.0 validate --config=/config.yaml` after the fixes. No additional observations.
