# Validation Summary: How to Fix “Preemption Is Not Helpful for Scheduling” for a High-Priority Pod

## Status

validated

## Post Type

Technical troubleshooting guide with executable diagnostic commands.

## Technologies Covered

- Kubernetes scheduler and Pod preemption
- PriorityClass and Pod priority policies
- Node affinity, inter-Pod affinity, anti-affinity, taints, and tolerations
- CPU and memory requests, init containers, sidecars, and Pod overhead
- PersistentVolume topology and PodDisruptionBudgets
- kubectl, Bash, and jq

## Sources Consulted

- [Kubernetes: Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes: Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Sidecar Containers — resource sharing](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: Persistent Volumes — node affinity](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#node-affinity)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [jq manual](https://jqlang.org/manual/)
- [Kubernetes v1.35.0 scheduler preemption implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/scheduler/framework/preemption/preemption.go)
- [Kubernetes v1.35.0 NodeResourcesFit implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/scheduler/framework/plugins/noderesources/fit.go)

## Issues Found

No technical issues found.

## Review Notes

- The post is technically relevant and its README.md was left unchanged.
- Verified priority admission, non-preempting policy behavior, lower-priority victim eligibility, and the distinction between scheduling precedence and node eligibility. Existing Pods retain their admitted priority; workload template changes apply to newly created Pods.
- Confirmed the scheduler's preemption diagnostic and the need to inspect the complete scheduling failure. Removing Pods can free requested resources or Pod slots, but cannot itself resolve required node labels, blocking taints, or incompatible volume topology.
- Checked the numerical example: 8 CPU allocatable minus 6 CPU retained requests leaves 2 CPU, which cannot accommodate a 3 CPU request. Resources on separate nodes cannot be pooled to place a single Pod.
- Confirmed the affinity limitations, absence of cross-node preemption in the described default scheduler behavior, best-effort PDB handling, and the distinction between nomination and binding.
- Verified kubectl resource names, JSON output, namespace flags, all-namespace listing, and the supported spec.nodeName field selector. Both Bash examples passed bash -n. Both jq filters executed successfully against representative Pod JSON, including absent optional fields. No live-cluster scheduling or eviction experiment was performed.
- The examples inspect resource inputs rather than calculate effective requests. Pod-level spec.resources depends on cluster feature support; PodLevelResources became beta and enabled by default in Kubernetes v1.34. An absent field produces null in jq and does not break the command. Init containers, sidecars, and overhead must still be included when calculating fit, as the post advises.
- All three technical documentation links in the post resolved to the intended official Kubernetes resources. The author profile link is attribution rather than technical evidence.
- The commands require installed kubectl and jq, appropriate cluster credentials and read permissions, and replacement of the illustrative namespace, Pod, and node names. No deprecated command flags or APIs were identified.
