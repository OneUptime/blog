# Validation Summary: How to Configure DaemonSet Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes container resource requests and limits
- Kubernetes QoS classes and node-pressure eviction
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Vertical Pod Autoscaler
- Kubernetes kubelet reserved resources
- kubectl and Metrics Server
- Prometheus / PromQL alerting
- kube-state-metrics
- Go runtime memory limit configuration

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes registry migration announcement: https://kubernetes.io/blog/2022/11/28/registry-k8s-io-faster-cheaper-ga/
- Kubernetes 1.28 release status: https://kubernetes.io/releases/1.28/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histogram and summary practices: https://prometheus.io/docs/practices/histograms/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics
- Go runtime GOMEMLIMIT documentation: https://pkg.go.dev/runtime

## Issues Found
- Corrected broad DaemonSet wording from "every node" to "every eligible node" because DaemonSets run on all or some nodes depending on selectors, affinity, taints, and eligibility.
- Changed the resource multiplication example from decimal MB/GB wording to Kubernetes-style Mi/Gi units for consistency with Kubernetes resource quantities.
- Clarified that QoS class is determined by the presence and equality of CPU and memory requests and limits, not by a general request-to-limit ratio.
- Updated the kube-proxy image from the old `k8s.gcr.io` registry and EOL Kubernetes `v1.28.0` tag to `registry.k8s.io/kube-proxy:v1.35.0`.
- Adjusted the Guaranteed QoS explanation to avoid implying that all Guaranteed pods receive exclusive CPU allocation. Exclusive CPUs require the static CPU manager policy and integer CPU requests.
- Replaced Prometheus DaemonSet pod matching by `pod=~".*daemonset.*"` with a join against `kube_pod_owner{owner_kind="DaemonSet"}` because DaemonSet-managed pods are not guaranteed to include "daemonset" in their names.
- Changed the memory percentile PromQL example from `histogram_quantile(rate(container_memory_working_set_bytes...))` to `quantile_over_time(...)` because `container_memory_working_set_bytes` is a gauge, not a histogram bucket metric.
- Changed the PromQL sizing snippet fence from `yaml` to `promql` because the content is Prometheus query language, not Kubernetes YAML.
- Corrected the Metrics API command description from "over time" to "current metrics" because the metrics.k8s.io pod endpoint returns current resource usage rather than historical data.
- Updated the kubectl/awk comment from "Calculate percentile" to "Sort current CPU usage" because the command sorted current values but did not compute a percentile.
- Changed the OOM alert from `rate(...)` with a pod-name regex to `increase(...)` joined with `kube_pod_owner{owner_kind="DaemonSet"}`, which better matches event-style counter/gauge series and DaemonSet ownership.

## Review Notes
- Local `kubectl` was not installed in the review environment, so CLI behavior was verified against official Kubernetes CLI documentation rather than local `kubectl --help` output.
- The Prometheus alert examples assume kube-state-metrics is deployed and exporting `kube_pod_owner`.
- The VPA example is valid for clusters where the VPA CRD/controller is installed; VPA is not part of the core Kubernetes API server by default.
