# Validation Summary: How to Configure Topology Provisioning in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (operator Helm chart, CSI topology feature)
- Kubernetes (StorageClass, CSINode, PersistentVolumes, topology labels)
- Helm (chart upgrade, values files)
- Ceph RBD CSI driver

## Sources Consulted
- Rook official documentation on CSI topology: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/#topology-based-provisioning
- Rook operator Helm chart values reference: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes StorageClass API documentation (allowedTopologies, volumeBindingMode): https://kubernetes.io/docs/concepts/storage/storage-classes/#allowed-topologies
- Kubernetes well-known labels (topology.kubernetes.io/zone, topology.kubernetes.io/region): https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes CSINode resource documentation: https://kubernetes.io/docs/concepts/storage/volumes/#csi
- Cross-referenced with other validated Rook posts in this blog repository (rook-topology-aware-provisioning-ceph, rook-csi-provisioner-secrets, rook-csi-rbd-node-stage-secret, kubernetes-csi-drivers-guide)

## Issues Found
No technical issues found.

## Review Notes
- The Helm chart values structure (`csi.topology.enabled`, `csi.topology.domainLabels`) correctly maps to the Rook operator ConfigMap settings `CSI_ENABLE_TOPOLOGY` and `CSI_TOPOLOGY_DOMAIN_LABELS`.
- The provisioner name `rook-ceph.rbd.csi.ceph.com` is the standard Rook-Ceph RBD CSI provisioner name, confirmed across multiple sources.
- The CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) are the default secret names created by Rook during cluster setup.
- The Helm repo name `rook-release` with chart `rook-ceph` is correct per `helm repo add rook-release https://charts.rook.io/release`.
- The `WaitForFirstConsumer` volume binding mode is correctly recommended for topology-aware provisioning, as it delays volume binding until a pod is scheduled.
- The `allowedTopologies` with `matchLabelExpressions` follows the correct Kubernetes StorageClass API structure.
- The `topology.kubernetes.io/zone` and `topology.kubernetes.io/region` are the standard Kubernetes well-known topology labels (replacing the deprecated `failure-domain.beta.kubernetes.io/*` labels).
