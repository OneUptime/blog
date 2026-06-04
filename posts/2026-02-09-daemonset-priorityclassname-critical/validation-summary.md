# Validation Summary: How to Implement DaemonSet with priorityClassName for Critical System Components

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes PriorityClass and pod priority/preemption
- Kubernetes node-pressure eviction and kubelet eviction configuration
- kube-proxy, CNI DaemonSets, and CSI node drivers
- kube-state-metrics and Prometheus alert expressions
- Kubernetes validating admission webhooks
- Go Kubernetes API types

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Guaranteed Scheduling For Critical Add-On Pods - https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core-resources/pod-v1/
- Kubernetes kubelet config API reference v1beta1 - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes blog: k8s.gcr.io Image Registry Will Be Frozen From the 3rd of April 2023 - https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The original eviction explanation said lower-priority pods are killed first. Kubernetes kubelet eviction ranking first considers whether pod usage exceeds requests, then pod priority, then usage relative to requests. Updated the explanation to match the official eviction order.
- The kube-proxy and CSI sidecar examples used the legacy `k8s.gcr.io` image registry. Updated them to `registry.k8s.io`, which is the current Kubernetes community image registry.
- The Prometheus examples used `kube_pod_container_status_terminated_reason{reason="Evicted"}` and assumed it had a `priority_class` label. kube-state-metrics exposes pod eviction reason through `kube_pod_status_reason`, while `priority_class` is on `kube_pod_info`. Updated the queries to join those metrics on `namespace`, `pod`, and `uid`.
- The DaemonSet missing-priority alert used `kube_daemonset_labels{priority_class=""}`, but DaemonSet labels metrics do not expose pod template priority class. Updated it to detect DaemonSet-owned pods with an empty `priority_class` via `kube_pod_info`.
- The Go admission-control example imported `corev1` without using it and called `strings.HasPrefix` without importing `strings`. Removed the unused import and added the required `strings` import.

## Review Notes
- YAML snippets parse successfully with PyYAML in this workspace.
- Local `kubectl`, Go tooling, and Prometheus validation tools were not installed, so those examples were checked against official documentation and static inspection rather than local CLI execution.
- The examples remain simplified and would still require cluster-specific RBAC, ConfigMaps, service accounts, webhook serving code, TLS/certificate setup, and vendor-specific CNI/CSI configuration before production use.
