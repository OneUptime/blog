# Validation Summary: How to Use Kubernetes Pod Affinity and Topology Spread Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Node affinity
- Pod affinity and anti-affinity
- Pod topology spread constraints
- kubectl
- YAML Kubernetes manifests

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes kubectl reference: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl describe - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The pod placement visualization said database pods are spread across different nodes and zones, but the example uses hard anti-affinity only for nodes and soft anti-affinity for zones. Changed the wording to say database pods are spread across nodes and prefer different zones.
- The `maxSkew` parameter description was too broad. Updated it to match Kubernetes scheduler semantics for `DoNotSchedule` and `ScheduleAnyway`.
- The debugging command labeled "Check pod distribution across zones" only prints pod names and node names. Updated the comment to clarify that it maps pods to nodes before checking node zone labels.

## Review Notes
The YAML snippets are syntactically valid and use current Kubernetes API fields. The examples assume the relevant node topology labels, such as `topology.kubernetes.io/zone` and `kubernetes.io/hostname`, exist on cluster nodes. The local environment did not include `kubectl`, so command availability was checked against official Kubernetes CLI documentation rather than local help output.
