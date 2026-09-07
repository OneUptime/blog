# Validation Summary: How to Measure Kubernetes Resource Fragmentation Before Changing Node Shapes

## Status
validated

## Post Type
Technical guide with kubectl commands and capacity-planning pseudocode.

## Technologies Covered
- Kubernetes scheduler, resource requests, allocatable capacity, and pod overhead
- kubectl and Kubernetes API inventories and events
- Init containers, native sidecars, and DaemonSets
- Node affinity, anti-affinity, taints, tolerations, and topology spread
- Persistent volumes, storage topology, and attachment limits
- Node autoscaling, HPA, rollout surge, and capacity planning

## Sources Consulted
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Scheduler Configuration](https://kubernetes.io/docs/reference/scheduling/config/)
- [Resource Bin Packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/)
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Node Status](https://kubernetes.io/docs/reference/node/node-status/)
- [Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Reserve Compute Resources for System Daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Node Autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Node-specific Volume Limits](https://kubernetes.io/docs/concepts/storage/storage-limits/)
- [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [kube-apiserver](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Author profile](https://github.com/nawazdhandala) — verified the author link redirects to the expected profile.

## Issues Found
1. **Hard constraints versus preferences:** The opening and conclusion implied every scheduling constraint must be satisfied. Qualified these statements and the eligibility calculation to distinguish hard filters from soft scoring preferences.
2. **Incomplete node eligibility inventory:** Added cordon status (`spec.unschedulable`), since readiness alone does not describe whether ordinary new pods can be placed.
3. **Incomplete exporter accounting caveat:** Added pod-level requests when enabled and used, plus explicit overhead accounting. Individual container totals can omit these scheduler inputs.
4. **Replica count overstatement:** Identified the formula as a resource-only upper bound. Added effective class requests, zero-request handling, the pod count limit, and negative-residual handling. Required re-evaluating placement constraints for each replica and clarified that different class counts cannot be added together because they consume the same capacity.
5. **Undefined resource ratio:** Added handling for pods with zero requested CPU; their memory-to-CPU ratio cannot be computed by division.
6. **Reservation double-counting ambiguity:** Clarified that reservations already included in allocatable must not be subtracted again when simulating candidate nodes.
7. **Topology spread reservation claim:** Replaced the claim that topology spread reserves empty slots. It constrains matching pod counts across domains and can leave capacity unused, but does not reserve resource slots.
8. **Numerical precision:** The original 6.8Gi was a valid one-decimal rounding but was not labeled approximate. Changed it to approximately 6.76Gi; the exact total is 5 + (400 + 1400) / 1024 = 6.7578125Gi. CPU totals 2.75 cores, and C alone passes the example's CPU/memory checks.

## Review Notes
- All three kubectl commands use supported syntax. `-A` selects all namespaces; `status.phase` is supported for Pods and `reason` for Events. Commands were reviewed against official documentation, not executed against a live cluster.
- Pending is broader than unschedulable: it also includes pods awaiting setup after assignment. Use scheduling conditions/events to identify scheduler failures. Events have limited retention, so pending pod-seconds require historical collection; a snapshot alone cannot supply that metric. One failure event can list multiple blockers.
- Residual vectors describe requested resources, not measured usage. Effective accounting should match the target scheduler version and enabled features, including in-place resize behavior where applicable. Exclude completed workloads from future replay demand and avoid counting DaemonSets twice.
- The pseudocode is illustrative, not an executable simulator. The CPU/memory example assumes other eligibility checks pass. Reserve subtraction is planning notation and must preserve resource dimensions and topology while avoiding overlapping reserve accounting.
- The bin-packing, ratio mismatch, arrival weighting, failure headroom, rollout surge, and real-pool validation guidance is technically sound. Relocation feasibility alone does not guarantee consolidation: disruption budgets and autoscaler-specific rules can block removal.
- The post specifies no Kubernetes version or deprecated configuration API. Feature availability and simulator behavior must match the actual cluster. All five official documentation links resolve to the intended topics.
- README changes were limited to technical corrections and directly necessary qualifications; no sections were added or reordered.
