# Validation Summary: How to Label and Taint Nodes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes node labels
- Kubernetes taints and tolerations
- Kubernetes node selectors and node affinity
- `kubectl`
- YAML Deployment manifests

## Sources Consulted
- Rancher Docs: Cluster Configuration - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration
- Rancher Docs: Nodes and Node Pools - https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/manage-clusters/nodes-and-node-pools
- Kubernetes Docs: `kubectl label` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Docs: `kubectl taint` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes Docs: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Docs: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes Docs: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The Rancher UI workflow was too generic. Rancher documents node editing through the node's `⋮` action menu, and node-editing availability varies by cluster type. I corrected the introduction and both Rancher UI procedures to reflect that.
- The taints/tolerations example used `nodeSelector: dedicated: gpu` without showing a matching node label anywhere in the example flow. I clarified that a node selector also requires a matching node label, and updated the dedicated GPU node example to add `dedicated=gpu` alongside the GPU model label.

## Review Notes
- Kubernetes v1.35 documents alpha `Gt` and `Lt` toleration operators, but the post's examples use the common stable patterns (`Equal` and `Exists`), which is acceptable here.
- The sample application images such as `analytics-app:latest` and `gpu-app:latest` are illustrative placeholders rather than official images.
