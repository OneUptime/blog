# Validation Summary: How to Configure Ceph for Disaggregated Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (node labels, taints, tolerations, affinity, StorageClass)
- Host networking with CIDR-based network separation

## Sources Consulted
- Rook official documentation on CephCluster network providers: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Kubernetes documentation on node affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation on taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Rook CephCluster CRD placement documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI RBD StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
1. **Network configuration used incorrect `selectors` field with `provider: host`**: The original configuration used `spec.network.selectors` with bare interface names (`"eth1"`, `"eth2"`) under `provider: host`. The `selectors` field is only valid with `provider: multus` and expects NetworkAttachmentDefinition references (not interface names). Fixed by replacing `selectors` with `addressRanges` using CIDR ranges, which is the correct mechanism for specifying separate public and cluster networks when using host networking. Ceph matches these CIDRs against IPs on the node's interfaces to determine which NIC to bind for each network plane.

## Review Notes
- The StorageClass example is simplified and omits some parameters that would be needed in production (e.g., `csi.storage.k8s.io/node-stage-secret-name`, `csi.storage.k8s.io/node-stage-secret-namespace` for mounting, and `csi.storage.k8s.io/controller-expand-secret-name`/namespace for volume expansion). This is acceptable for a conceptual tutorial but readers should consult the full Rook RBD StorageClass docs for production use.
- The claim that "Rook will automatically discover and use the new node" when scaling is true when `useAllNodes: true` is set in the CephCluster storage config, which is a common default. Readers with custom OSD configurations may need additional steps.
- The `addressRanges` CIDRs in the fix (`10.10.1.0/24`, `10.10.2.0/24`) are example values; readers should substitute their actual network CIDRs.
