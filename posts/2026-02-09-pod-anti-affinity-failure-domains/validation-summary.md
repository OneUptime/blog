# Validation Summary: Configure Kubernetes Pod Anti-Affinity to Spread Replicas Across Failure Domains

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes StatefulSets
- Pod anti-affinity
- Topology spread constraints
- kubectl
- PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes API reference: Pod v1 affinity and topology spread fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Metrics for Kubernetes Object States - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics node metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The zone-level anti-affinity example used `requiredDuringSchedulingIgnoredDuringExecution` with `topology.kubernetes.io/zone`. Kubernetes documents that the `LimitPodHardAntiAffinityTopology` admission controller limits hard pod anti-affinity to `kubernetes.io/hostname` unless modified or disabled. Changed the zone-level example to preferred anti-affinity and updated the explanation to say it encourages zone spreading.
- The zone-level example claimed six replicas across three zones would place two pods per zone. Pod anti-affinity does not guarantee even counts; hard anti-affinity across zones would allow at most one matching pod per zone. Updated the text to point to topology spread constraints for strict even zone distribution.
- The combined node and zone StatefulSet example used hard anti-affinity for both hostname and zone. Changed hard node anti-affinity plus preferred zone anti-affinity so the manifest remains compatible with default Kubernetes admission behavior.
- The node distribution check counted the `kubectl get pods -o wide` header as a node. Updated the `awk` command to skip the header row.
- The PromQL zone query grouped by `topology_zone`, but kube-state-metrics exposes Kubernetes node labels as `label_NODE_LABEL` labels such as `label_topology_kubernetes_io_zone`. Updated the query to derive `topology_zone` with `label_replace`.

## Review Notes
- The PromQL zone query assumes kube-state-metrics is configured to expose the `topology.kubernetes.io/zone` node label via its metric labels allowlist.
