# Validation Summary: How to Configure Topology-Aware Provisioning with Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (topology labels, StorageClass, PVC/PV)
- CSI (Container Storage Interface) topology support

## Sources Consulted
- Rook documentation on topology-aware placement: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#topology-aware-placement
- Kubernetes documentation on topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation on StorageClass volumeBindingMode: https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode
- Kubernetes well-known labels and annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Rook CSI driver configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/

## Issues Found
- **Misleading section title and description for CRUSH map configuration**: The section titled "Configuring the CRUSH Map for Topology" showed `topologySpreadConstraints` configuration and implied it configures the CRUSH map. In reality, `topologySpreadConstraints` is a Kubernetes scheduling feature that spreads pods across topology domains. Rook builds the CRUSH map automatically from node topology labels — no explicit CRUSH configuration is needed. Fixed the section title to "Spreading OSDs Across Topology Zones" and clarified the explanation to distinguish between CRUSH map construction (automatic from labels) and pod scheduling spread (the topologySpreadConstraints shown).

## Review Notes
- The OSD topology labels verification command (`jq '.items[].spec.nodeSelector'`) may return null for some deployments where Rook uses `nodeAffinity` instead of `nodeSelector`. This is not incorrect but could be supplemented with a nodeAffinity check.
- All Kubernetes API fields (StorageClass, allowedTopologies, matchLabelExpressions) are current and correct.
- The CSI configuration keys (`CSI_ENABLE_TOPOLOGY`, `CSI_TOPOLOGY_DOMAIN_LABELS`) are valid Rook operator ConfigMap settings.
- The `rook-ceph.rbd.csi.ceph.com` provisioner name is correct for Rook-managed Ceph RBD CSI.
