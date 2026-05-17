# Validation Summary: How to Configure Custom Metrics for Autoscaling on Talos

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux
- Kubernetes (Horizontal Pod Autoscaler, custom metrics API, external metrics API)
- Prometheus (kube-prometheus-stack)
- Prometheus Adapter
- Helm
- PromQL (rate, sum, avg, histogram_quantile)
- kubectl

## Sources Consulted
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes HPA Walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- autoscaling/v2 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Prometheus Adapter walkthrough and config docs: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/walkthrough.md and https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- kube-prometheus-stack Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus ServiceMonitor CRD reference: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.ServiceMonitor
- Prometheus histogram_quantile docs: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
No technical issues found.

Specific items verified:
- `helm install` flags and `serviceMonitorSelectorNilUsesHelmValues=false` are valid kube-prometheus-stack values.
- Prometheus Adapter Helm chart name (`prometheus-community/prometheus-adapter`) and the `prometheus.url` / `prometheus.port` value keys are correct.
- The default Prometheus service name created by kube-prometheus-stack with release name `prometheus` (`prometheus-kube-prometheus-prometheus.monitoring.svc`) is correct.
- Adapter rule structure (`seriesQuery`, `resources.overrides`, `name.matches` / `name.as`, `metricsQuery`) matches the upstream config schema.
- The histogram_quantile PromQL correctly groups by `<<.GroupBy>>, le` as required by the function.
- `autoscaling/v2` is GA since Kubernetes 1.23, and the `metrics`, `behavior.scaleUp`, `behavior.scaleDown`, `Pods` / `Resource` / `External` metric source types and target shapes match the API schema.
- The custom metrics API path `/apis/custom.metrics.k8s.io/v1beta1` is the path served by prometheus-adapter.
- Adapter pod label selector `app.kubernetes.io/name=prometheus-adapter` matches the chart's default labels.
- ServiceMonitor manifest uses the correct `monitoring.coreos.com/v1` API and fields.

## Review Notes
- The `name.matches: "^(.*)"` with `as: "${1}"` blocks (for `http_active_connections` and `request_queue_length`) are essentially no-op renames; they could be omitted but are not incorrect.
- The custom metrics API also exposes `v1beta2`; `v1beta1` is what prometheus-adapter currently serves and what the post uses, so this is accurate today, but readers should be aware the API group may eventually graduate.
- The post does not include any Talos-specific configuration because none is required — the custom metrics pipeline works the same on Talos as on any conformant Kubernetes distribution. The framing is appropriate.
- `image: webapp:latest` is an illustrative placeholder; clearly intended as such.
