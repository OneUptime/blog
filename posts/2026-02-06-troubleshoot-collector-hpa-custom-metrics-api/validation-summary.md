# Validation Summary: How to Troubleshoot Collector HPA Not Scaling Because the Custom Metrics API

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Custom Metrics API and API aggregation
- Prometheus Adapter
- Prometheus Operator ServiceMonitor
- OpenTelemetry Collector internal telemetry
- Helm
- kubectl
- jq

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Custom Metrics API v1beta2 reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart values and APIService template: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Collector telemetry snippet used `service.telemetry.metrics.address`, which current OpenTelemetry Collector documentation says is ignored as of Collector v0.123.0. Changed it to the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The APIService example said the Prometheus Adapter Helm chart should register both `v1beta1.custom.metrics.k8s.io` and `v1beta2.custom.metrics.k8s.io`. The chart currently registers `v1beta1.custom.metrics.k8s.io`, which also matches the later `kubectl get --raw` examples. Removed the misleading `v1beta2` expected output line.
- The Prometheus Adapter rate query returned raw `rate(...)` series without aggregating by the requested Kubernetes object. The adapter documentation expects one value per requested object, so changed it to `sum(rate(...[2m])) by (<<.GroupBy>>)`.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so command validation used official documentation and chart sources rather than local CLI help.
- The YAML snippets were parsed locally with PyYAML and are syntactically valid.
