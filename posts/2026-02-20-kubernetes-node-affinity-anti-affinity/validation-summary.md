# Validation Summary: How to Use Kubernetes Node Affinity and Anti-Affinity Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Node affinity and node selector terms
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes API reference: Pod v1: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes API reference: NodeSelectorTerm v1: https://kubernetes.io/docs/reference/kubernetes-api/definitions/node-selector-term-v1/
- Kubernetes API reference: ResourceSlice v1 common NodeSelectorRequirement definition: https://kubernetes.io/docs/reference/kubernetes-api/resource/resource-slice-v1/
- Kubernetes kubectl reference: kubectl label: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl reference: kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: Node Labels Populated By The Kubelet: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found
No technical issues found.

## Review Notes
The YAML snippets parse successfully. The scheduler explanation is correct at guide level: preferred node affinity weights are added to the scheduler's other node scores, so the final selected node is the highest-scoring feasible node after all scheduling requirements are considered. The local workspace did not have `kubectl` installed, so kubectl command validation was performed against the official Kubernetes kubectl reference instead of local `--help` output.
