# Validation Summary: How to Implement Overcommit Strategies for Kubernetes Dev and Test Environments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes resource requests and limits
- Kubelet configuration and node-pressure eviction
- PriorityClass
- LimitRange and ResourceQuota
- Cluster Autoscaler
- Vertical Pod Autoscaler
- PrometheusRule and kube-state-metrics
- HorizontalPodAutoscaler and PodDisruptionBudget

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Reserve Compute Resources for System Daemons / Node Allocatable: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Kubelet Configuration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Autoscaler / Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Autoscaler releases: https://github.com/kubernetes/autoscaler/releases
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post incorrectly defined overcommitment as scheduling more resource requests than physical node capacity. Updated the explanation to state that the default scheduler does not over-subscribe node allocatable and reframed overcommit as limits and admitted burst demand exceeding steady-state capacity while requests remain right-sized.
- The kubelet section implied system reserves and eviction thresholds enable oversubscription. Updated the language to describe these as node-stability guardrails and removed unsupported `ephemeral-storage` from `systemReserved`.
- The EKS kubelet configuration JSON omitted `apiVersion` and `kind`. Added the KubeletConfiguration metadata fields.
- PriorityClass descriptions implied critical pods would never be evicted. Updated wording to reflect Kubernetes eviction ordering: priority influences eviction order but does not provide an absolute guarantee.
- The ResourceQuota example allowed requests above the stated physical capacity. Adjusted the example so requests stay within the namespace's expected schedulable share while limits provide burst capacity.
- The Cluster Autoscaler section incorrectly suggested it could consider actual usage rather than requests. Updated the explanation to reflect request-based scheduling requirements and request-based node utilization, and changed the image tag from `v1.28.0` to `v1.36.0` with a note to match the Kubernetes minor version.
- The VPA example used deprecated `updateMode: "Auto"`. Changed it to `updateMode: "Recreate"` and added a note that current VPA releases should use explicit modes such as `Recreate` or `InPlaceOrRecreate`.
- The Prometheus recording rules calculated an overcommit ratio from requests and used `rate()` on `kube_pod_status_reason`, which kube-state-metrics exposes as a gauge. Changed the ratio to use limits and changed eviction monitoring to a current evicted-pod count.
- The PodDisruptionBudget text implied it limits node-pressure evictions. Updated the wording to clarify that PDBs limit voluntary disruption impact.

## Review Notes
The examples are still illustrative and should be adapted to each managed Kubernetes provider's supported kubelet configuration path, Cluster Autoscaler version, and installed observability stack.
