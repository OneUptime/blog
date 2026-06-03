# Validation Summary: How to Implement Spread Scheduling for High Availability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Topology spread constraints
- Node affinity
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The multiple-constraint explanation implied an ordered "first, then" scheduling process. Kubernetes evaluates all topology spread constraints together, so I updated the comments and explanation to describe strict zone enforcement plus relaxed hostname scoring.
- The cluster-level defaults section said defaults apply to all pods unless they define their own constraints. Kubernetes only applies default topology spread constraints to pods with no explicit constraints that belong to a Service, ReplicaSet, StatefulSet, or ReplicationController, so I corrected the statement.
- The zone monitoring command used the NODE column from `kubectl get pods -o wide`, so it counted nodes rather than zones. I replaced it with a command that resolves each pod's node and reads the node's `topology.kubernetes.io/zone` label.
- The troubleshooting example claimed that 10 replicas across 3 zones with `maxSkew: 1` would leave pods unscheduled. That distribution can satisfy skew as 4/3/3, so I replaced it with a correct eligible-domain/resource/affinity caveat.

## Review Notes
The YAML examples use current Kubernetes API versions and valid topology spread constraint fields. The post intentionally keeps examples generic; real clusters should verify that nodes have the expected topology labels and that default scheduler configuration is actually managed by the cluster operator.
