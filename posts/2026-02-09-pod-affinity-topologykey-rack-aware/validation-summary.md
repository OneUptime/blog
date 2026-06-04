# Validation Summary: How to Configure Pod Affinity with TopologyKey for Rack-Aware Placement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod affinity and pod anti-affinity
- Node labels and topology keys
- Deployments
- StatefulSets
- Cassandra rack awareness
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints, comparison with pod affinity and anti-affinity - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Downward API - https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference: Deployment v1 apps - https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes API reference: StatefulSet v1 apps - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/

## Issues Found
- The post used `topology.kubernetes.io/rack` as a user-defined rack label. Kubernetes reserves the `kubernetes.io/` and `k8s.io/` prefixes for core components, and the official kubelet-populated topology labels are `topology.kubernetes.io/region` and `topology.kubernetes.io/zone`. Changed rack examples to `topology.example.com/rack`.
- Several hard pod anti-affinity examples requested more replicas than available topology domains. Hard anti-affinity with a topology key permits only one matching pod per topology domain, so 6 or 9 replicas across three racks or circuits would leave pods pending. Reduced those examples to three replicas, and adjusted the Cassandra example to a rack-specific StatefulSet pattern.
- The soft rack affinity, power circuit, and network segment Deployment examples had selectors but no matching pod template labels. Kubernetes rejects Deployments whose `.spec.selector` does not match `.spec.template.metadata.labels`. Added the required template labels.
- The Cassandra example attempted to set `CASSANDRA_RACK` from `metadata.labels['topology.kubernetes.io/rack']`. The Downward API exposes Pod labels, not Node labels, and the label was only applied to nodes. Changed the example to use a rack-specific StatefulSet with a matching `nodeSelector` and static `CASSANDRA_RACK` value.
- Monitoring and troubleshooting commands referenced the old rack label key. Updated JSONPath and jq expressions to use `topology.example.com/rack`.

## Review Notes
The examples now validate syntactically as YAML. `kubectl` was not installed in the local environment, so CLI behavior was checked against official Kubernetes documentation rather than local command help.
