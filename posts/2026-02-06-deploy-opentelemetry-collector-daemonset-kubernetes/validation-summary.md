# Validation Summary: How to Deploy the OpenTelemetry Collector as a DaemonSet in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Kubernetes DaemonSet
- Kubernetes RBAC, ServiceAccount, ClusterRole, and ClusterRoleBinding
- Kubernetes hostPath volumes, probes, services, node selectors, and tolerations
- OpenTelemetry receivers: OTLP, hostmetrics, kubeletstats, filelog
- OpenTelemetry processors: batch, resourcedetection, k8sattributes, memory_limiter, resource
- OpenTelemetry exporters: OTLP HTTP, debug, Prometheus Remote Write
- Grafana Loki OTLP log ingestion
- Prometheus Operator ServiceMonitor
- kubectl commands

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector extensions documentation: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry kubeletstats CPU metric migration notice: https://opentelemetry.io/blog/2025/kubeletstats-receiver-metrics-deprecation/
- OpenTelemetry Collector Contrib kubeletstats receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver
- OpenTelemetry Collector Contrib hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector health_check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/extension/healthcheckextension
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.153.0/exporter/debugexporter
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/prometheusremotewriteexporter
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry Collector Contrib v0.153.0 release page: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0

## Issues Found
- The Collector image used `otel/opentelemetry-collector-contrib:0.95.0`, which is outdated for a current guide. Updated examples to `0.153.0`, the latest official contrib release found during validation.
- The DaemonSet configured liveness and readiness probes on port `13133` but did not configure or expose the `health_check` extension. Added the extension, enabled it under `service.extensions`, and exposed the health port.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current pull-reader Prometheus configuration using `host` and `port`.
- The config used the deprecated `logging` exporter. Replaced it with the current `debug` exporter.
- The hostmetrics receiver was presented as node-level collection but did not mount or use the host filesystem. Added `root_path: /hostfs` and the corresponding `hostfs` hostPath mount.
- The filelog examples used hand-written CRI regex parsing and one incorrect self-log exclude path (`otc-container`). Replaced the parser with the current `container` operator and corrected the collector log exclusion pattern.
- The kubeletstats metrics snippet used deprecated `.cpu.utilization` metrics. Updated examples to `k8s.node.cpu.usage` and `container.cpu.usage`.
- The Prometheus Remote Write example used an HTTP endpoint without disabling TLS. Added `tls.insecure: true` to match the HTTP URL.
- The Loki example used the old Loki exporter configuration. Replaced it with `otlphttp/loki` targeting Loki's OTLP endpoint at `/otlp`, as recommended by Grafana's current Loki documentation.
- The memory limiter example used incorrect `Mi` math. Corrected `limit_mib` to `384` and `spike_limit_mib` to `102` for a 512Mi memory limit.

## Review Notes
- The main Collector ConfigMap snippet and the standalone node-metrics and log-collection snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. Validation used dummy Kubernetes service-account files and Kubernetes environment variables because the examples intentionally use `auth_type: serviceAccount`.
- The main config includes multiple cloud resource detectors. Those are valid in the contrib distribution, but users may still want to tailor the detector list to their cloud provider to avoid unnecessary detection attempts.
