# Validation Summary: Choosing CPU-Optimized or Memory-Optimized Kubernetes Nodes

## Status
validated

## Post Type
Technical guide to Kubernetes node selection and capacity planning. The resource formulas and scheduling implementation details qualify for technical review even though there are no executable code examples or terminal commands.

## Technologies Covered
- Kubernetes scheduling, resource requests, node allocatable, and resource bin packing
- DaemonSets and RuntimeClass Pod overhead
- Horizontal Pod Autoscaler (HPA), Deployments, and node autoscaling
- Taints, tolerations, affinity, and disruption planning
- Google Kubernetes Engine (GKE)
- Cloud VM compute and memory families, storage, networking, and committed use discounts

## Sources Consulted
- [GKE node sizing](https://cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes): allocatable resources, reservations, scale-up overhead, and node-size tradeoffs.
- [Kubernetes node allocatable](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/): scheduler capacity and system reservations.
- [Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/): CPU and memory units, requests, and scheduling.
- [Kubernetes resource bin packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/): resource-aware scheduling strategies.
- [RuntimeClass](https://kubernetes.io/docs/concepts/containers/runtime-class/): per-Pod runtime overhead.
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/): pending requests, placement constraints, provisioning, and consolidation.
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/): metric-driven replica scaling.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/): rolling-update surge capacity.
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/): required and preferred affinity and hardware placement.
- [Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/): voluntary and involuntary disruption scenarios.
- [EC2 compute-optimized specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html): example memory-to-vCPU ratios and size-dependent hardware, network, and storage capabilities.
- [EC2 memory-optimized specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html): example ratios and secondary resource limits.
- [Compute Engine committed use discounts](https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview): commitment coverage and charges for unused committed resources.
- [Author profile](https://github.com/nawazdhandala): verified the author link destination.

## Issues Found
1. The instruction to use taints, tolerations, and affinity only for isolation was too restrictive. Affinity also supports hardware compatibility, colocation, and preferred placement. Replaced that restriction with requirements-based guidance and distinguished soft preferences from hard requirements.
2. The packing guidance called additional replicas an “HPA surge,” conflating HPA scale-up with Deployment rollout surge. Changed the wording to explicitly account for HPA scale-up and Deployment surge as distinct scenarios.

## Review Notes
- Verified all table ratios: 1 GiB / 0.5 CPU = 2, 8 GiB / 1 CPU = 8, and 4 GiB / 2 CPUs = 2. Peak totals are 66 requested CPUs and 168 GiB, giving a weighted fleet ratio of approximately 2.55 GiB per CPU.
- The 16 GiB cache Pod is a separate fragmentation illustration, not a recalculation of the table's 8 GiB cache class. A Pod must fit on one eligible node.
- The 2 and 8 GiB-per-vCPU examples are reasonable family-selection heuristics, not universal allocatable ratios. Reservations and DaemonSet costs must still be applied to actual candidate nodes.
- The workload-budget formula is a planning calculation. A deliberate reserve is not automatically enforced by the scheduler; failure scenarios must be evaluated against surviving nodes without double-counting the same reserve.
- Pod overhead belongs in each Pod's effective request. Real packing inputs must also reflect applicable init-container, sidecar, and Pod-level resource accounting rather than blindly summing only application-container requests.
- Node provisioning and consolidation use requests and scheduling constraints; HPA can connect measured load to node demand by changing replica counts.
- Hardware performance, pod/IP limits, availability, and commercial savings remain provider-, configuration-, and workload-dependent. The post appropriately calls for candidate-specific benchmarks and operational testing instead of promising a universal winner.
- All four official documentation links and the author link resolve to their intended resources, including normal Google Cloud and GitHub redirects.
- No executable code, CLI flags, configuration manifests, pinned versions, or deprecated APIs are present. The fenced text blocks are conceptual calculations and metric labels. No live cluster benchmarks or failure tests were performed as part of this documentation review.
