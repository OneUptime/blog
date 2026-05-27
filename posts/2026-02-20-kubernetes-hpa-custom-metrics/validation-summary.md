# Validation Summary: How to Use Custom Metrics with Kubernetes HPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes custom metrics API
- Prometheus
- Prometheus Adapter
- Prometheus Operator ServiceMonitor
- kube-prometheus-stack Helm chart
- prometheus-community/prometheus-adapter Helm chart
- Python Flask
- prometheus_client for Python
- Helm and kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Prometheus Operator API reference for ServiceMonitor endpoints: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Adapter documentation and configuration reference: https://github.com/kubernetes-sigs/prometheus-adapter
- Prometheus Adapter configuration guide: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- prometheus-community/prometheus-adapter Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/values.yaml
- prometheus-community/kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/

## Issues Found
- The ServiceMonitor used `port: "80"`, but the Prometheus Operator ServiceMonitor `endpoints[].port` field expects the name of a Service port, not the numeric port. I added the Service port name `http-metrics` and updated the ServiceMonitor to use `port: http-metrics`.
- The ServiceMonitor label comment said the `release: prometheus` label must match the Helm release label. Because the Prometheus install command sets `serviceMonitorSelectorNilUsesHelmValues=false`, that label is not strictly required in the shown setup. I changed the comment to say it is useful when Prometheus selects ServiceMonitors by release label.

## Review Notes
The HPA `autoscaling/v2` examples, `Pods` metric with `AverageValue`, multiple-metric behavior, Prometheus Adapter rule structure, Helm repository commands, and Python `Gauge` usage are consistent with the consulted documentation. Helm and kubectl were not installed in this review environment, so CLI syntax was checked against official chart values and Kubernetes documentation rather than local `--help` output.
