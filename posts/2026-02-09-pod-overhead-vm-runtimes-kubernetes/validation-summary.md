# Validation Summary: How to Use Pod Overhead for Virtual Machine-Based Runtimes in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Overhead
- Kubernetes RuntimeClass
- Kubernetes ResourceQuota
- kubectl
- kube-state-metrics
- PrometheusRule / PromQL
- Kata Containers
- gVisor
- Firecracker
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler

## Sources Consulted
- Kubernetes Pod Overhead documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes node metrics documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- gVisor documentation: https://gvisor.dev/docs/
- Kata Containers documentation: https://katacontainers.io/

## Issues Found
- The post described gVisor as a VM-based runtime. Updated the wording to distinguish VM-based runtimes such as Kata Containers from sandboxed runtimes such as gVisor, which uses a userspace application kernel rather than a conventional VM.
- The `kubectl get pod secure-pod -o jsonpath='{.spec.overhead}'` output was shown as JSON. Updated it to the map-style output Kubernetes documents for that JSONPath expression.
- The node-specific measurement example used `nodeName`, which bypasses normal scheduling and is not recommended as a way to express node preference. Replaced it with a `nodeSelector` example.
- The overhead measurement guidance subtracted container requests from node usage. Changed this to subtract measured container usage, because requests are scheduling declarations rather than actual usage.
- The Prometheus alert used a non-existent `kube_pod_overhead{resource="memory"}` metric and grouped directly by `node`. Replaced it with `kube_pod_overhead_memory_bytes` joined to `kube_pod_info` for node labels.
- The autoscaling section overstated VPA and HPA behavior. Updated it to clarify that VPA adjusts container requests separately from RuntimeClass overhead, and that HPA resource metrics are based on pod metrics and container requests rather than treating Pod Overhead as a direct scaling input.
- The VPA example used `updateMode: "Auto"`, which current VPA documentation marks as deprecated. Changed it to the explicit `Recreate` update mode.
- The conclusion and related wording referred only to VM-based runtimes. Updated those references to "sandboxed and VM-based runtimes" for consistency and technical accuracy.

## Review Notes
The RuntimeClass `handler` values and overhead quantities are deployment-specific examples. Kubernetes accepts these fields, but the exact handler names and resource overhead values must match the CRI/runtime configuration installed on each cluster.
