# Validation Summary: How to Configure KEDA Auto-Scaling Based on OpenTelemetry Custom Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- KEDA
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- Prometheus and PromQL
- Helm

## Sources Consulted
- KEDA Prometheus scaler documentation: https://keda.sh/docs/latest/scalers/prometheus/
- KEDA Prometheus integration metrics documentation: https://keda.sh/docs/latest/integrations/prometheus/
- KEDA Helm chart values: https://github.com/kedacore/charts/blob/main/keda/values.yaml
- Kubernetes HorizontalPodAutoscaler API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Collector Prometheus remote write exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/prometheusremotewriteexporter
- OpenTelemetry Kubernetes attributes processor documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver

## Issues Found
- The KEDA install command enabled only metrics-server Prometheus metrics, but the monitoring example scrapes the operator service where the listed scaler metrics are exposed. Added `--set prometheus.operator.enabled=true`.
- The OpenTelemetry Collector remote-write example omitted the Prometheus requirement to enable the remote write receiver before writing to `/api/v1/write`. Added a sentence calling out `--web.enable-remote-write-receiver`.
- The authentication example showed a bearer token in `TriggerAuthentication` but did not mention the required `authModes: "bearer"` trigger metadata for the Prometheus scaler. Added that note.
- The pending-jobs example used `activationThreshold: "1"` while the text said the first job should activate scaling. Changed it to `activationThreshold: "0"` and updated the explanation.
- The KEDA scaler error metric was listed as `keda_scaler_errors_total`, but current KEDA documentation lists `keda_scaler_detail_errors_total`. Updated the metric name.

## Review Notes
The Python OpenTelemetry metrics instruments, Collector processor/exporter fields, Prometheus scaler fields, PromQL shapes, and ScaledObject structure are consistent with current official documentation. The statement that standard HPA cannot scale to zero is directionally correct for default Kubernetes behavior, but Kubernetes documents an alpha `HPAScaleToZero` feature gate for object or external metrics.
