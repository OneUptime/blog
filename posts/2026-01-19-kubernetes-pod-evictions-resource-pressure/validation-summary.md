# Validation Summary: How to Handle Kubernetes Pod Evictions and Resource Pressure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubelet node-pressure eviction
- Pod QoS classes
- Pod PriorityClass
- LimitRange and ResourceQuota
- KubeletConfiguration
- kubectl
- Prometheus and PromQL
- crictl

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Process ID Limits and Reservations documentation: https://kubernetes.io/docs/concepts/policy/pid-limiting/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- OneUptime Metrics page and related blog links referenced by the post: https://oneuptime.com/product/metrics

## Issues Found
- The eviction diagram and QoS section overstated QoS as the direct eviction ordering mechanism. Updated the diagram and text to match kubelet behavior: usage exceeding requests, pod priority, and usage relative to requests are used for memory pressure; PID and inode pressure use priority because there are no pod requests.
- The PID pressure command labeled `.status.allocatable.pods` as PID allocation, but that field is pod capacity, not PID capacity. Removed that command and kept node-level PID checks using process count and `pid_max`.
- The default soft eviction thresholds were listed as if Kubernetes has default soft thresholds. Corrected this to state that soft eviction thresholds default to none and require matching grace periods when configured.
- The default hard eviction threshold list omitted `imagefs.inodesFree < 5%` for Linux. Added the missing hard threshold and clarified that the shown defaults are Linux defaults.
- The `systemReserved` example included `ephemeral-storage`, but the KubeletConfiguration reference states `systemReserved` currently supports CPU and memory. Removed `ephemeral-storage` from `systemReserved`; kept it under `kubeReserved`, where local root filesystem storage is supported.
- The Prometheus alert named `PodMemoryOvercommit` claimed to detect pods using more memory than requested, but the expression compared usage to memory limits. Renamed the alert/comment to indicate pods approaching their memory limit.
- The Grafana query comments said "available percentage" while the formulas computed used percentage. Updated the comments to match the formulas.
- The kubelet eviction metric example used `allocatableMemory.available` as an eviction signal. Updated it to the documented `memory.available` eviction signal.
- The best-practice and conclusion bullets implied Guaranteed QoS alone makes critical workloads last to evict. Updated them to include pod priority and request-relative eviction behavior.
- The emergency response step said deleting evicted pods frees resources. Evicted pods are already terminated, so the command cleans up API objects rather than node memory. Updated the wording accordingly.

## Review Notes
The examples are generally Linux-oriented. Some eviction defaults and signals differ for Windows nodes, so a future version could call that out explicitly if the guide is intended to cover Windows clusters.
