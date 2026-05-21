# Validation Summary: How to Set Up Telemetry Pipeline with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API and MeshConfig extension providers
- Envoy access logging and tracing
- OpenTelemetry Collector
- Prometheus and Prometheus remote write
- Grafana Tempo
- Grafana Loki
- Kubernetes manifests, RBAC, and port-forwarding
- Helm

## Sources Consulted
- Istio Telemetry API reference and task documentation: https://istio.io/latest/docs/reference/config/telemetry/ and https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access logging task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio 1.24 sample Prometheus and Grafana manifests: https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml and https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/

## Issues Found
- The Istio sample Prometheus and Grafana manifests deploy into `istio-system`, but the post used `observability` for Prometheus and Grafana endpoints and port-forward commands. Updated the text, data source URL, validation commands, and Prometheus ConfigMap namespace to use `istio-system`.
- The Collector sent metrics to Prometheus remote write without enabling Prometheus remote write ingestion. Added a `kubectl patch` command to enable `--web.enable-remote-write-receiver` on the Istio sample Prometheus deployment.
- The Collector's Prometheus receiver kept only annotated pods but did not apply the annotated metrics path and port, which would cause incorrect scraping for Istio proxy metrics. Added relabel rules for `prometheus.io/path` and `prometheus.io/port`.
- The OpenTelemetry filter processor examples used old shorthand attribute access. Updated the span filter conditions to use `span.attributes[...]`, matching current OTTL span-context examples.
- The Loki exporter configuration used the older Loki push API exporter path. Updated the logs pipeline to use `otlphttp/loki` with Loki's native OTLP endpoint at `/otlp`, matching current Grafana Loki guidance.
- The Collector deployment referenced `otel/opentelemetry-collector-contrib:0.92.0`, an old image tag. Updated it to the current Collector contrib release image path and tag.
- The Collector deployment referenced a ServiceAccount but did not define the ServiceAccount or Kubernetes RBAC needed for `kubernetes_sd_configs`. Added the missing ServiceAccount, ClusterRole, and ClusterRoleBinding.
- The Tempo validation command port-forwarded `3200:3200` while the Tempo URL used port `3100`. Updated the command to `3100:3100`.

## Review Notes
The post is technically valid after these corrections. For a future revision, consider clarifying whether Prometheus should scrape Istio metrics directly or whether metrics should flow only through the Collector to avoid duplicated metrics in mixed setups.
