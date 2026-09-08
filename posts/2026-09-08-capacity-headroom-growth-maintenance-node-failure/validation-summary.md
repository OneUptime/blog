# Validation Summary: How to Set Headroom for Growth, Maintenance, and One-Node Failure

## Status
validated

## Post Type
Technical capacity-planning guide with worked calculations and illustrative YAML metadata.

## Technologies Covered
- Service capacity planning, demand forecasting, SLOs, and load testing
- Node and zone failure domains, maintenance reserves, and load balancing
- Kubernetes scheduling, topology spread constraints, and PodDisruptionBudgets
- Kubernetes pod priority/preemption and Cluster Autoscaler overprovisioning
- YAML

## Sources Consulted
- Google SRE Book: Production Services Best Practices — https://sre.google/sre-book/service-best-practices/
- Google SRE Book: The Production Environment at Google — https://sre.google/sre-book/production-environment/
- Google SRE Book: Introduction, Demand Forecasting and Capacity Planning — https://sre.google/sre-book/introduction/
- Kubernetes Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: Specifying a Disruption Budget for your Application — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes: Disruptions — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Cluster Autoscaler FAQ: overprovisioning and priority cutoff — https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler
- Author profile link checked — https://github.com/nawazdhandala

## Issues Found
1. The example moved from 32 available slots to 24 surviving service instances without specifying that the slots were occupied. Clarified that all 32 instances must be ready before the event for this particular survivor count; empty slots need scheduling and startup before serving traffic.
2. The node-headroom formula ambiguously subtracted “nodes needed after policy losses” from the initial ready-node count. Replaced it with an explicit subtraction of policy loss nodes and rounded demand-node requirements. For the uniform-node example, this gives 8 - 2 - ceil(21 / 4) = 0 spare whole nodes beyond the policy requirement.
3. The overprovisioning description omitted the Cluster Autoscaler priority cutoff. Clarified that replacement placeholder pods must have priority at or above the configured cutoff (default -10), while remaining below service-pod priority. Pods below the cutoff do not trigger scale-up.

## Review Notes
- Independently recalculated compounded demand: 14,500 × 1.15 × 1.08 = 18,009 RPS; ceil(18,009 / 900) = 21 instances; 21 + 4 + 4 = 29 instances; ceil(29 / 4) = 8 nodes. With 24 ready survivors, the mean load is 750.375 RPS and service headroom is 3,591 RPS.
- The Google production-environment chapter explicitly describes a task update coinciding with a machine failure. Its production best-practices appendix also supports simultaneous planned/unplanned outage reserves and load-tested capacity.
- Node-count arithmetic assumes homogeneous nodes and four usable service slots per node. The stated eight-instance zone loss is an illustrative topology input that must be checked against actual placement; for 32 evenly placed replicas it requires at least four zones. Recompute loss sizes when topology changes.
- PodDisruptionBudgets constrain voluntary eviction; they cannot prevent machine failures or guarantee application SLOs. The post correctly treats disruption behavior as something to verify during an exercise.
- The 900 RPS capacity and five-minute scaling delay are example assumptions, not measured results or platform guarantees. Actual balancing, shared dependencies, readiness, quotas, and recovery need environment-specific validation.
- The YAML block is planning metadata, not a Kubernetes manifest or a standardized configuration schema. Its keys and values are internally consistent. No executable commands or version-specific application APIs are present.
- All referenced documentation URLs resolved to the intended resources. The Cluster Autoscaler master FAQ is mutable and contains historical examples; only its relevant current behavior was used for this review.
- Review covered documentation, arithmetic, and snippet syntax. No live load test, drain, failure injection, or autoscaling experiment was performed.
