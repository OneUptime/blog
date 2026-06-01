# Validation Summary: How to Configure Horizontal Pod Autoscaler with Custom Metrics from Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Horizontal Pod Autoscaler autoscaling/v2
- Kubernetes custom metrics API
- Kubernetes external metrics API
- Prometheus
- Prometheus Adapter
- Prometheus Operator ServiceMonitor
- kube-prometheus-stack Helm chart
- prometheus-adapter Helm chart
- Python Flask
- prometheus_client for Python
- Redis

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough for external metrics: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-on-metrics-not-related-to-kubernetes-objects
- Prometheus Adapter README and configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter and https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/

## Issues Found
- The post originally exposed a global Redis queue depth as a Kubernetes Pods metric. That would make each pod report the same global queue depth, so HPA would average duplicated values and calculate the wrong replica count. I changed the queue-depth path to use the external metrics API with an `External` HPA metric and a `queue_name` selector.
- The Prometheus Adapter rule for `app_queue_depth` originally mapped the metric to pods and used `sum` by pod. I changed it to a `rules.external` rule and used `max(... by (queue_name))` so duplicate scrapes from multiple pods do not multiply the queue depth.
- The verification commands originally queried `app_queue_depth` under the custom metrics API for pods. I changed them to query `app_queue_depth` under `external.metrics.k8s.io` and left the custom metrics verification for the per-pod `http_requests_per_second` example.
- The ServiceMonitor comment said it matched pods. A ServiceMonitor selector matches Services, so I corrected the comment.
- The kube-prometheus-stack selector explanation was too broad. I clarified that `serviceMonitorSelectorNilUsesHelmValues=false` makes the chart use the configured selector value, and with the default empty selector and namespace selector it can discover ServiceMonitors across namespaces.
- The troubleshooting section said the adapter queries Prometheus on a default 30-second interval. The adapter's documented default relist interval is 10 minutes, while the HPA controller sync period defaults to 15 seconds. I changed the lag explanation to refer to the HPA sync period, Prometheus scrape interval, and pod startup time.

## Review Notes
Helm was not installed in the local environment, so I could not run `helm template` locally. I verified the chart values and templates directly from the prometheus-community Helm chart repository, and validated the Python snippet syntax with `ast.parse`.
