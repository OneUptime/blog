# Validation Summary: How to Use Node Feature Discovery to Label Nodes by Hardware Capabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Node Feature Discovery
- Helm
- Kustomize
- Kubernetes node labels, nodeSelector, and node affinity
- NodeFeatureRule custom resources
- NFD Topology Updater

## Sources Consulted
- Node Feature Discovery v0.18 Helm deployment documentation: https://release-0-18--kubernetes-sigs-nfd.netlify.app/deployment/helm
- Node Feature Discovery v0.18 quick start and Kustomize deployment documentation: https://kubernetes-sigs.github.io/node-feature-discovery/v0.18/get-started/
- Node Feature Discovery v0.18 feature labels documentation: https://kubernetes-sigs.github.io/node-feature-discovery/v0.18/usage/features.html
- Node Feature Discovery worker configuration reference: https://kubernetes-sigs.github.io/node-feature-discovery/master/reference/worker-configuration-reference.html
- Node Feature Discovery customization guide and NodeFeatureRule format: https://kubernetes-sigs.github.io/node-feature-discovery/master/usage/customization-guide.html
- Node Feature Discovery v0.18 topology updater documentation: https://kubernetes-sigs.github.io/node-feature-discovery/v0.18/usage/nfd-topology-updater.html
- Kubernetes official documentation for assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The installation examples used older NFD deployment patterns and pinned the manifest overlay to `v0.15.0`, which is no longer a supported NFD release. Updated the Helm example to the current OCI chart form and pinned both Helm and Kustomize examples to `v0.18.3`.
- The RDMA scheduling example used `feature.node.kubernetes.io/network-rdma.available`, which is not a documented NFD label. Updated it to the documented built-in custom source label `feature.node.kubernetes.io/custom-rdma.capable`.
- The custom worker configuration used the removed legacy `matchOn` rule format and did not define labels for the custom rules. Replaced it with current `matchFeatures` and `matchAny` syntax and explicit labels.
- The kernel scheduling example described kernel modules while selecting kernel config and kernel version labels. Updated the comment to match the actual labels.
- The custom feature rules example used a standalone ConfigMap with `custom-rules`, which would not be consumed as a NodeFeatureRule CRD. Converted it to a `NodeFeatureRule` resource with `apiVersion: nfd.k8s-sigs.io/v1alpha1`, `kind: NodeFeatureRule`, and `spec.rules`.
- The high-memory custom rule attempted to compare `memory.nv.present`, which is not a documented feature attribute. Replaced that matcher with documented `memory.numa.is_numa` and `memory.hugepages.enabled` feature attributes.
- The topology updater example hand-authored an incomplete DaemonSet using the old `k8s.gcr.io` image path and omitted required deployment/RBAC/CRD considerations. Replaced it with official Helm and Kustomize enablement commands.

## Review Notes
All YAML snippets parse successfully after the fixes. The RDMA resource request `rdma/hca` assumes a separate RDMA device plugin or equivalent extended resource provider; NFD supplies labels and feature data but is not a replacement for device plugins.
