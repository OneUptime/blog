# Validation Summary: How to Use Scheduler Hints for Placement Preferences

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Kubernetes node selectors and node affinity
- Kubernetes pod affinity and anti-affinity
- Kubernetes taints and tolerations
- Kubernetes PriorityClass and preemption
- Kubernetes scheduler profiles and KubeSchedulerConfiguration
- kubectl commands

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Scheduler Configuration - https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes API reference: kube-scheduler Configuration (v1) - https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/

## Issues Found
- The pod anti-affinity example used `requiredDuringSchedulingIgnoredDuringExecution` with `topology.kubernetes.io/zone`. Kubernetes documents that the default `LimitPodHardAntiAffinityTopology` admission controller limits hard pod anti-affinity topology keys to `kubernetes.io/hostname`. I changed the example to require different nodes and prefer different zones, and updated the explanation accordingly.
- The StatefulSet example declared `podAntiAffinity` twice under the same `affinity` object. Duplicate YAML keys are invalid/ambiguous and would cause one set of rules to be lost with many parsers. I merged the required and preferred anti-affinity rules under a single `podAntiAffinity` key.
- The taints and tolerations Job example described `nodeSelector` as preferring GPU nodes. `nodeSelector` is a hard node-selection constraint, not a preference. I changed the comment to say it requires GPU nodes.
- The scheduler profile named `bin-packing-scheduler` only increased the `NodeResourcesFit` score weight. The Kubernetes scheduler documentation states that `NodeResourcesFit` defaults to `LeastAllocated`; bin-packing requires configuring the scoring strategy, such as `MostAllocated`. I added `pluginConfig` for `NodeResourcesFit` with `scoringStrategy.type: MostAllocated`.

## Review Notes
- `kubectl` is not installed in this workspace, so CLI command behavior was reviewed against official Kubernetes documentation rather than local `kubectl --help` output.
- The post remains version-neutral. The reviewed APIs use current stable Kubernetes API versions and field names as of 2026-06-03.
