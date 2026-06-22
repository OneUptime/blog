# Validation Summary: How to Set Up Horizontal Pod Autoscaler (HPA) with Custom Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- Kubernetes custom.metrics.k8s.io and external.metrics.k8s.io APIs
- Prometheus
- Prometheus Adapter
- Helm
- Flask
- prometheus_client for Python

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes Custom Metrics v1beta2 API reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter external metrics documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/externalmetrics.md
- Prometheus Community Helm chart values for prometheus-adapter: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/values.yaml
- Prometheus Community Helm chart templates for prometheus-adapter labels and ConfigMap mounting: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter/templates
- Prometheus Python client documentation: https://prometheus.github.io/client_python/
- Prometheus client libraries documentation: https://prometheus.io/docs/instrumenting/clientlibs/

## Issues Found
- The introduction said HPA scales on CPU and memory "out of the box." Kubernetes supports resource metrics, but Metrics Server or another provider for the resource metrics API must be installed. I clarified the wording and added Metrics Server to the prerequisites for CPU and memory examples.
- The raw custom metrics API examples used `custom.metrics.k8s.io/v1beta1`. The current Kubernetes Custom Metrics API reference documents `custom.metrics.k8s.io/v1beta2`, so I updated all custom metrics raw API paths.
- The Prometheus Adapter log command selected pods with `app=prometheus-adapter`, but the current Helm chart uses `app.kubernetes.io/name` and `app.kubernetes.io/instance` selector labels. I updated the selector.
- The Flask metrics endpoint returned `generate_latest()` without the Prometheus exposition content type. I updated the example to return a Flask `Response` with `CONTENT_TYPE_LATEST`.
- The external metrics section could imply an external metric works with only the custom metrics rules shown earlier. I clarified that Prometheus Adapter external rules or another `external.metrics.k8s.io` adapter are required.

## Review Notes
The HPA manifests, Prometheus Adapter custom rule format, Helm values keys, PromQL rule templates, Kubernetes Deployment manifest, and Python metric definitions are otherwise consistent with current official documentation. Local `helm` and `kubectl` binaries were not installed in the review environment, so CLI behavior was checked against official chart templates and Kubernetes documentation rather than by executing commands against a cluster.
