# Validation Summary: Why Lower Pod Requests May Not Lower Your Cloud Bill

## Status
validated

## Post Type
Technical guide. The post contains scheduling implementation details, resource calculations, and operational guidance, so it qualifies for technical validation despite having no executable code.

## Technologies Covered
- Kubernetes resource requests, node allocatable, and scheduling
- Node autoscaling and consolidation
- PodDisruptionBudgets, affinity, taints, and storage constraints
- NodeResourcesFit bin packing and Kubernetes Descheduler
- Cloud compute billing, GKE Autopilot, and spending commitments

## Sources Consulted
- Kubernetes node autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes resource bin packing: https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes system reservations and allocatable: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node assignment: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes storage classes and topology: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes volume attachment limits: https://kubernetes.io/docs/concepts/storage/storage-limits/
- Kubernetes DaemonSets: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Cluster Autoscaler FAQ: https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/FAQ.md
- Kubernetes Descheduler, including HighNodeUtilization: https://github.com/kubernetes-sigs/descheduler
- GKE pricing and request-based Autopilot billing: https://cloud.google.com/kubernetes-engine/pricing
- Amazon EKS IP address utilization: https://docs.aws.amazon.com/eks/latest/best-practices/ip-opt.html
- AWS Savings Plans commitments: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. The node-removal savings chain was presented without clearly limiting it to node-based billing. Clarified that request-based pod billing can decrease when effective requests decrease, without removing nodes; provider minimums and resource ratios still apply.
2. The chain said all pods move elsewhere. Changed this to movable workload pods being recreated elsewhere, consistent with termination/recreation during consolidation and the separate treatment of DaemonSet and static pods.
3. Singleton pods were listed as unconditional consolidation blockers. Qualified this to singleton workloads whose disruption budgets prevent eviction. A controller-managed workload with one replica is not inherently exempt from eviction.
4. A unique taint was listed as restricting a pod to its current node. Replaced this with untolerated taints on destination nodes. Tolerations permit placement but do not require placement on the tainted node.
5. The example labeled three nodes' total allocatable resources as capacity to free, which could imply that requests must decrease by that entire amount. Relabeled it as allocatable capacity removed and explained that required request reductions depend on existing spare capacity and retained headroom.

## Review Notes
- Verified the example arithmetic: three nodes at 7.2 CPU and 28Gi each represent 21.6 CPU and 84Gi. The 512Mi pod cannot fit in 300Mi, and aggregate memory alone does not establish placement feasibility.
- Confirmed the two NodeResourcesFit strategy names and the distinction between requested resources and runtime consumption.
- Confirmed the documented empty-node treatment for DaemonSet/static pods, while retaining the implementation-specific caveat.
- Allocatable accounts for configured system reservations and eviction reservations; agents deployed as pods consume part of allocatable through their requests. Request accounting should use effective pod requests, including applicable init-container and pod overhead rules.
- Multiple node shapes must follow the selected autoscaler's requirements. Cluster Autoscaler generally expects equivalent capacity within each node group; different shapes can be offered through separate groups.
- DaemonSets consume resources on each eligible node, which can be a subset of the cluster. Descheduler eviction requires suitable scheduling behavior and does not itself terminate cloud instances.
- Billing savings depend on the actual billing model and commitments. No specific price, discount percentage, or billing interval was asserted or tested.
- All four official documentation links and the author profile resolved to their intended resources.
- There are no executable examples, terminal commands, deployable configuration snippets, or version-specific API declarations to run. Validation consisted of documentation review and arithmetic checks; no cluster experiment or billing measurement was performed.
