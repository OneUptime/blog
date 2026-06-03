# Validation Summary: How to Right-Size Pod Resource Requests and Limits

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- LimitRange and ResourceQuota
- Metrics Server and Metrics API
- Prometheus and PromQL
- kube-state-metrics
- cAdvisor metrics
- Vertical Pod Autoscaler

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- Corrected the explanation of requests as hard runtime guarantees. Kubernetes uses requests for scheduling; CPU requests influence share under contention, and memory requests are mainly used for scheduling and eviction decisions.
- Corrected memory and CPU limit wording to clarify that CPU is throttled and memory limit enforcement is reactive through OOM handling.
- Changed the initial measurement recommendation from "generous limits and no requests" to conservative initial requests plus generous limits. Kubernetes copies a limit into the request when a request is omitted and no admission default applies.
- Changed the Metrics API command comment from historical usage to current usage, because Metrics Server and the Metrics API provide current resource metrics rather than long-term history.
- Fixed the CPU throttling PromQL example to use `container_cpu_cfs_throttled_periods_total` divided by `container_cpu_cfs_periods_total` for a throttled-period percentage.
- Corrected statements that requests equal limits fully "guarantee resources" or prevent all interference. Guaranteed QoS is least likely to be evicted, but not immune to all node-stability scenarios or limit breaches.
- Updated QoS class descriptions for current Kubernetes behavior, including limits without requests and pod-level CPU/memory resources.
- Fixed the low memory utilization PromQL example to compare memory working set against memory requests rather than limits, with explicit vector matching against `kube_pod_container_resource_requests`.
- Corrected the "limits without requests" example. Such pods are not BestEffort; Kubernetes copies omitted requests from limits when no admission default request applies.
- Fixed the VPA manifest by nesting `updateMode` under `spec.updatePolicy`.
- Corrected the VPA recommendation wording to requests rather than requests and limits by default.

## Review Notes
The post is technically relevant and now aligns with current Kubernetes documentation. Some Prometheus metric names and labels vary by scrape setup and Kubernetes distribution, so the monitoring examples should still be adapted to the reader's deployed metrics pipeline.
