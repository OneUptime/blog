# Validation Summary: How to Set Up Kubernetes Topology Spread Constraints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments and StatefulSets
- Kubernetes topology spread constraints
- Kubernetes scheduler configuration
- Node affinity, taints, and pod anti-affinity
- kubectl troubleshooting commands
- Prometheus and kube-state-metrics queries

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: Pod v1 topologySpreadConstraints - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes scheduler configuration API reference - https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes node labels reference - https://kubernetes.io/docs/reference/node/node-labels/
- kube-state-metrics documentation - https://github.com/kubernetes/kube-state-metrics

## Issues Found
- Corrected the `maxSkew: 2` example. `4-2-0` across three eligible domains has a skew of 4, not 2, so it is not valid for `maxSkew: 2`; changed the valid example to `3-2-1`.
- Updated the `minDomains` version note. The field is generally available in Kubernetes 1.30+, while Kubernetes 1.28-1.29 require the `MinDomainsInPodTopologySpread` feature gate to be enabled.
- Corrected the `nodeTaintsPolicy` default. Kubernetes treats a null value as `Ignore`, not `Honor`.
- Reworded the mixed constraints comment from "Must have at least 1 pod per zone" to "Limit skew across zones" because `maxSkew` alone is a skew rule, not a direct per-zone minimum guarantee.
- Fixed the PromQL examples to derive a `zone` label from kube-state-metrics' converted Kubernetes label `label_topology_kubernetes_io_zone` before grouping by `zone`.

## Review Notes
The Kubernetes manifests use current stable API versions and valid topology spread constraint fields. The examples assume nodes are consistently labeled with the referenced topology keys; this matches Kubernetes documentation requirements for topology spread constraints.
