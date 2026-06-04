# Validation Summary: How to Monitor Pod Resource Usage vs Requests with Metrics Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Metrics Server
- Metrics API
- kubectl
- Horizontal Pod Autoscaler
- Prometheus
- Prometheus Operator ServiceMonitor
- Bash, awk, and jq

## Sources Consulted
- Kubernetes Resource Metrics Pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Metrics Server official repository and installation manifest: https://github.com/kubernetes-sigs/metrics-server
- Metrics Server options source for `--metric-resolution`: https://github.com/kubernetes-sigs/metrics-server/blob/master/cmd/metrics-server/app/options/options.go
- Kubernetes Metrics API types: https://github.com/kubernetes/metrics/blob/master/pkg/apis/metrics/v1beta1/types.go
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl generated reference for `top` and `set resources`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/ and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Observability and system metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/observability/ and https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Prometheus Operator API reference for ServiceMonitor TLS config: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the under-provisioning explanation. The original text implied exceeding requests directly causes CPU throttling or OOMKills. Kubernetes enforces CPU throttling through CPU limits, and OOMKills are tied to memory limits or node memory pressure, not simply exceeding requests.
- Corrected the recommendation that pods exceeding requests need higher limits. The request should be reviewed first; limits are a separate control.
- Corrected the Metrics API output description. Usage values are Kubernetes Quantity values, not always raw nanocores and bytes.
- Corrected the Metrics API `window` explanation so it does not imply a fixed typical value.
- Corrected the "Calculating Utilization Percentage" section title and introduction because the script lists usage and requests but does not calculate percentages.
- Corrected the Prometheus section. Container metrics such as `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes` come from kubelet/cAdvisor or a Kubernetes monitoring stack, not from scraping Metrics Server itself.
- Updated the PromQL CPU example to use `rate()` and aggregate by pod, because `container_cpu_usage_seconds_total` is a cumulative counter.
- Clarified Metrics Server metric resolution. The binary default is 60s, but the current official release manifest sets `--metric-resolution=15s`.
- Fixed the real-world `awk` example to use `--no-headers` and format the average CPU value with an `m` suffix.

## Review Notes
The post is technically relevant and current overall. Some examples remain intentionally simple and manual; for production-grade right-sizing, historical Prometheus data or VPA recommendations would be more reliable than one-time `kubectl top` snapshots.
