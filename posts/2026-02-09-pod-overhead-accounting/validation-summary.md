# Validation Summary: How to Configure Pod Overhead for Accurate Resource Accounting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Overhead
- Kubernetes RuntimeClass
- Kubernetes scheduling and kubelet pod cgroups
- kubectl
- Prometheus and PromQL
- kube-state-metrics
- jq
- gVisor, Kata Containers, and Firecracker runtime examples

## Sources Consulted
- Kubernetes Pod Overhead documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes KubeletConfiguration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The post said pod overhead affects scheduling but not cgroup limits. Kubernetes documentation says kubelet includes pod overhead when sizing the pod cgroup and, when pod resource limits apply, bases pod cgroup limits on container limits plus overhead. Updated the section title and explanation to distinguish pod cgroup sizing from individual container limits.
- The post used `kube_pod_overhead{resource="memory"}` in PromQL examples. Current kube-state-metrics documents the overhead metrics as `kube_pod_overhead_memory_bytes` and `kube_pod_overhead_cpu_cores`. Updated the alert expressions accordingly.
- The node-level overhead alert grouped `kube_pod_overhead` by `node`, but kube-state-metrics pod overhead metrics do not carry a `node` label. Updated the query to join `kube_pod_overhead_memory_bytes` with `kube_pod_info` to attach the node label.
- The Prometheus examples called `promtool query instant` without a Prometheus server URL. Updated the commands to include `http://localhost:9090` when executing inside the Prometheus pod.
- The post claimed `container_memory_working_set_bytes{container=""}` represents pod sandbox overhead. Kubernetes documents `container_memory_working_set_bytes` as container working set and also exposes `pod_memory_working_set_bytes`; the empty container label is not a reliable official pod-overhead signal. Updated the examples to compare pod working set with the sum of named container working sets.
- The capacity-planning `jq` example only handled CPU values ending in `m` and memory values ending in `Mi`. Updated it to handle whole CPU cores and common Kubernetes binary memory units (`Ki`, `Mi`, `Gi`) more accurately.
- The Default RuntimeClass section showed a non-existent `KubeletConfiguration.runtimeClass.default` field. Kubernetes RuntimeClass documentation says pods without `runtimeClassName` use the default runtime handler. Replaced the invalid kubelet config with guidance to set `runtimeClassName` explicitly or use admission-time mutation.

## Review Notes
- Runtime overhead values in the examples are illustrative and must be measured for each cluster, runtime configuration, and workload profile.
- The `kubectl debug node/...` process-inspection example may vary by runtime and host image; Prometheus or runtime-native tooling is usually more repeatable for ongoing validation.
