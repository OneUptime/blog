# Validation Summary: How to Deploy Rook-Ceph on SUSE Rancher

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.0)
- SUSE Rancher (Kubernetes management platform)
- RKE / RKE2 (Rancher Kubernetes Engine)
- Helm (Kubernetes package manager)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes Ingress (nginx)
- Prometheus / Grafana (monitoring via Rancher add-on)

## Sources Consulted
- Rook official documentation: Block Storage (RBD) StorageClass configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephCluster CRD specification — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Helm chart values (rook-ceph operator) — https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Ceph container image tags on quay.io — https://quay.io/repository/ceph/ceph
- Rancher documentation: Apps & Marketplace — https://ranchermanager.docs.rancher.com/
- Kubernetes StorageClass documentation — https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Ingress documentation — https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found

### 1. StorageClass missing required CSI secret parameters
**What was wrong:** The `StorageClass` in Step 4 was missing the required CSI secret reference parameters (`csi.storage.k8s.io/provisioner-secret-name`, `csi.storage.k8s.io/provisioner-secret-namespace`, `csi.storage.k8s.io/controller-expand-secret-name`, `csi.storage.k8s.io/controller-expand-secret-namespace`, `csi.storage.k8s.io/node-stage-secret-name`, `csi.storage.k8s.io/node-stage-secret-namespace`). Without these parameters, the RBD CSI driver cannot authenticate with Ceph, and PVC provisioning will fail with authentication errors.

**What was changed:** Added the six required CSI secret parameters to the StorageClass `parameters` section, referencing the `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` secrets that are automatically created by the Rook operator in the `rook-ceph` namespace.

**Why:** These parameters are mandatory per Rook's official Block Storage documentation. They tell the CSI provisioner and node plugins which Kubernetes secrets contain the Ceph authentication credentials needed to create and mount RBD images.

## Review Notes
- The `mgr.count: 1` setting is technically valid but not HA. For production deployments, `mgr.count: 2` is recommended to have a standby manager. This is not an error but a potential improvement.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is the initial Reef release. Newer patch releases (e.g., v18.2.4+) may include bug fixes. Users should check for the latest Reef point release.
- The monitoring section references a raw GitHub URL from the `master` branch. For production use, pinning to a specific Rook release tag (e.g., `release-1.14`) would be more stable.
- The step numbering transitions from "Method 1/2" to "Step 3/4/5", which is slightly inconsistent but logically conveys that Steps 3-5 follow whichever deployment method was chosen.
