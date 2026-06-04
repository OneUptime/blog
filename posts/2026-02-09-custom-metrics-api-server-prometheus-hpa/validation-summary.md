# Validation Summary: How to Set Up Custom Metrics API Server with Prometheus for HPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes Custom Metrics API
- Prometheus
- Prometheus Adapter
- prometheus-community Helm charts
- kube-prometheus-stack
- Prometheus Operator ServiceMonitor
- Python Flask
- prometheus-client for Python

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- prometheus-community prometheus-adapter Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/values.yaml
- prometheus-community kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query function documentation for rate and histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client instrumentation documentation: https://prometheus.github.io/client_python/instrumenting/

## Issues Found
- The opening stated that Kubernetes HPA supports only three metric types. Updated it to reflect the autoscaling/v2 API's current metric sources, while keeping the article focused on Pods and Object custom metrics.
- The Service example exposed two Service ports with the same numeric port and protocol. Updated the `http` Service port to `80` with `targetPort: 8080`, and added `targetPort: 8080` to the `metrics` port.
- The adapter configuration was shown as a raw ConfigMap but then passed to `helm upgrade --values`, which expects a Helm values file. Changed the snippet to use the chart's `rules.custom` values structure.
- The Prometheus Adapter `metricsQuery` examples returned unaggregated Prometheus series, which can produce multiple values for the same Kubernetes object. Updated request-rate, queue-depth, and Ingress request-rate queries to aggregate by `<<.GroupBy>>`.
- The latency percentile query did not aggregate classic histogram buckets correctly. Updated it to use `sum(rate(...)) by (<<.GroupBy>>, le)` before `histogram_quantile`.
- The Ingress adapter rule did not specify the Kubernetes API group for Ingress. Added `group: "networking.k8s.io"` to the resource override.

## Review Notes
The examples assume the scraped application metrics have `namespace` and `pod` labels, which is typical with Kubernetes scrape discovery through Prometheus Operator. The exact Prometheus service DNS name can vary if the Helm release name or chart fullname overrides differ.
