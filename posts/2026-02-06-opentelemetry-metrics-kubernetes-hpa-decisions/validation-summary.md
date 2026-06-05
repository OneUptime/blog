# Validation Summary: Use OpenTelemetry Metrics for Kubernetes Horizontal Pod Autoscaler Decisions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Collector
- Prometheus Remote Write
- Prometheus Adapter for Kubernetes custom metrics
- Kubernetes Horizontal Pod Autoscaler
- kube-state-metrics
- Helm

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python metric exporter SDK API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics v2.0 announcement: https://kubernetes.io/blog/2021/04/13/kube-state-metrics-v-2-0
- Helm install documentation: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The Python middleware snippet used `time.time()` without importing `time`. Added `import time` so the example runs as shown.
- The Python snippet used older HTTP semantic attribute names (`http.method` and `http.status_code`). Updated them to current OpenTelemetry semantic convention names (`http.request.method` and `http.response.status_code`).
- The Prometheus Adapter rules queried histogram series names without the Prometheus unit suffix. Updated `http_server_request_duration_count` and `http_server_request_duration_bucket` to `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`, matching OpenTelemetry-to-Prometheus translation rules.
- The Prometheus Adapter rules mapped Kubernetes resources using `namespace` and `pod` labels, but the Collector configuration adds `k8s.namespace.name` and `k8s.pod.name` as resource attributes. With `resource_to_telemetry_conversion`, those become Prometheus labels `k8s_namespace_name` and `k8s_pod_name`, so the rules were updated accordingly.
- The collector section did not mention that a vanilla Prometheus server must enable the remote-write receiver before accepting samples at `/api/v1/write`. Added the required `--web.enable-remote-write-receiver` note.
- The monitoring section referenced old kube-state-metrics HPA metric names with the `kube_hpa_*` prefix. Updated them to current `kube_horizontalpodautoscaler_*` metric names.
- The introduction implied that HPA defaults to CPU and memory scaling. Rephrased it to say basic HPA configurations often use CPU or memory, which is more accurate.
- The pitfalls section referenced Prometheus scrape interval even though the main pipeline uses remote write. Rephrased it to cover application export interval, Collector batch timeout, and scrape interval only for scrape-based pipelines.

## Review Notes
The tutorial is technically valid after the corrections. In a production deployment, the Prometheus remote-write path is best kept to low-volume or backend-specific use cases; many Kubernetes setups instead expose Collector metrics with the Prometheus exporter and scrape them, or send OTLP metrics directly to a backend that supports OTLP ingestion.
