# Validation Summary: How to Use Prometheus Adapter for Custom Metrics API with HPA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prometheus Adapter
- Prometheus
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Custom Metrics API
- Kubernetes External Metrics API
- Helm
- PrometheusRule alerts

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Prometheus Adapter README: https://github.com/kubernetes-sigs/prometheus-adapter
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter external metrics documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/externalmetrics.md
- Prometheus Adapter sample configuration: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/sample-config.yaml
- Prometheus Community Helm chart values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter

## Issues Found
- The Helm install command used `--namespace monitoring` without creating the namespace. Added `--create-namespace` so the command works on clusters where `monitoring` does not already exist.
- The HTTP request naming regex used `^(.*)_total`, which was looser than the adapter documentation's anchored example. Updated it to `^(.*)_total$` in both occurrences.
- The external metric rule hardcoded `queue="orders"` inside `metricsQuery`, so the HPA metric selector would not drive the query. Changed the query to use `<<.LabelMatchers>>` and added `queue!=""` to discovery.
- The external metric examples used the default namespaced behavior, which can incorrectly add the HPA namespace to shared queue or database metrics. Set `resources.namespaced: false` for those external rules.
- The resource metric queries in the comprehensive values example did not match the current Prometheus Community chart's documented resource-rule query pattern. Updated CPU and memory resource rules to align with the chart's current values example, including `window: 3m`.

## Review Notes
The HPA examples use `autoscaling/v2`, which is the current stable API for custom metrics and multiple metrics. The custom and external metrics APIService examples use `v1beta1`, which matches the current Prometheus Community Helm chart templates for Prometheus Adapter.
