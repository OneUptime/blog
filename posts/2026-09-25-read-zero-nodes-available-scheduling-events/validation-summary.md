# Validation Summary: How to Read “0/n Nodes Are Available” Events and Pinpoint Every Failed Scheduling Reason

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and scheduler implementation references.

## Technologies Covered
- Kubernetes scheduler, FailedScheduling events, and pod lifecycle
- kubectl and the core Event API
- Resource requests, init containers, sidecars, pod overhead, and pod-level resources
- Node and pod affinity, taints and tolerations, and topology spread constraints
- PersistentVolume topology, extended resources, and pod priority/preemption
- Bash and jq

## Sources Consulted
- [kubectl events reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/); also checked local `kubectl events --help`, `kubectl get --help`, and `kubectl describe --help`.
- [Debug Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/)
- [Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes v1.34.0 FitError implementation](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/types.go)
- [Kubernetes v1.34.0 filter execution](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/runtime/framework.go)
- [Kubernetes v1.34.0 NodeResourcesFit implementation](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.34.0/pkg/scheduler/framework/plugins/noderesources/fit.go)
- [Kubernetes v1.34.0 preemption implementation](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.34.0/pkg/scheduler/framework/preemption/preemption.go)
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [jq manual](https://jqlang.org/manual/)

## Issues Found
- The instruction to investigate preemption only after satisfying non-resource constraints was too broad. Some pod anti-affinity conflicts can be resolved by preempting lower-priority pods on the candidate node. Replaced that instruction with a distinction between constraints eviction cannot fix (such as node labels and volume topology) and anti-affinity conflicts it can resolve. Retained the reference to cross-node preemption limitations. No other technical corrections were needed.

## Review Notes
- Confirmed that FitError counts recorded reasons, allowing CPU and memory failures to overlap on the same node. Filter execution returns after a rejecting plugin, so events do not provide an exhaustive per-node constraint inventory.
- Verified namespace and resource filtering, Warning event filtering, JSON/YAML output, JSONPath UID extraction, label columns, and describe command forms. The Event field selectors `involvedObject.uid` and `reason` are supported.
- All three Bash blocks passed `bash -n`. Both jq expressions executed successfully against representative JSON fixtures. No live Kubernetes cluster was used; actual placement and event output were verified through documentation and scheduler source rather than an end-to-end cluster test.
- Confirmed requests-based resource fit, pod-slot and extended-resource checks, the placement constraints in the table, and the distinction between node assignment and application readiness.
- The v1.34.0 source links resolve and substantiate the cited implementation behavior; they are version-pinned examples, not a claim that v1.34 is the latest release. Event wording and enabled plugins can differ across clusters, as the post states.
- Pod-level resources depend on cluster version and feature configuration; the post correctly qualifies their use. Optional fields in the jq projections can be null. Event series metadata may be useful for detailed recurrence timing, but its omission does not invalidate the failure-message extraction.
- The example namespace, pod, and node names must correspond to real cluster objects. jq must be installed, and kubectl requires appropriate cluster access.
- All technical links in the post resolved to the intended official documentation or upstream source files.
