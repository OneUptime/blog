# Validation Summary: How to Schedule Pods to Specific Availability Zones with Node Labels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Kubernetes node labels
- Kubernetes node selectors and node affinity
- Kubernetes topology spread constraints
- Kubernetes Services and Topology Aware Routing
- Kubernetes StatefulSets and PodDisruptionBudgets
- kubectl
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes assigning Pods to nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Topology Aware Routing: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Service internal traffic policy: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- Kubernetes disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The introductory availability claim was too absolute. Distributing workloads across zones improves resilience, but does not by itself guarantee availability during a full zone failure. Changed "ensures" to "helps".
- The topology spread example claimed exactly 4 pods per zone without caveats. Added the requirement that all three zones have enough schedulable capacity.
- The preferred-zone Deployment had a selector but no matching pod-template labels, which would be rejected by the `apps/v1` Deployment API. Added `template.metadata.labels.app: preferred-zone-app`.
- The Service example used the pre-Kubernetes 1.27 `service.kubernetes.io/topology-aware-hints` annotation and also set `internalTrafficPolicy: Local`, which disables Topology Aware Hints/Routing for that Service. Updated the annotation to `service.kubernetes.io/topology-mode: Auto`, removed `internalTrafficPolicy: Local`, and changed the wording from local-zone routing to same-zone preference.
- The multi-region Deployment had a selector but no matching pod-template labels, which would be rejected by the `apps/v1` Deployment API. Added `template.metadata.labels.app: global-app`.
- The PodDisruptionBudget section described zone failures. PDBs limit voluntary disruptions, not involuntary zone outages. Updated the heading and description to maintenance / voluntary disruptions.
- The Prometheus alert grouped `kube_pod_info` by `zone`, but `kube_pod_info` exposes the assigned node, not a zone label. Rewrote the query to join `kube_pod_info` with `kube_node_labels` on `node` and group by `label_topology_kubernetes_io_zone`.

## Review Notes
The remaining examples use current Kubernetes APIs and well-known topology labels. A live server-side dry run was not possible because `kubectl` was not installed in the local environment, so validation was performed against the current official Kubernetes documentation and kube-state-metrics metric references.
