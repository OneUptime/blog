# Validation Summary: How to Deploy a Rook-Ceph Cluster from Scratch on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.14.0)
- Ceph (v18.2.0 Reef)
- Kubernetes
- Helm 3.x
- CSI (Container Storage Interface) for RBD block storage

## Sources Consulted
- Rook GitHub releases: https://github.com/rook/rook/releases/tag/v1.14.0
- Rook Helm Charts documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/helm-charts/
- Rook Operator Helm Chart: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook Ceph Cluster Helm Chart: https://rook.io/docs/rook/latest-release/Helm-Charts/ceph-cluster-chart/
- CephCluster CRD specification: https://rook.io/docs/rook/v1.14/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI Drivers documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook example StorageClass: https://github.com/rook/rook/blob/release-1.14/deploy/examples/csi/rbd/storageclass.yaml
- Rook Toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph v18.2.0 Reef release: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Quay.io Ceph container images: https://quay.io/repository/ceph/ceph

## Issues Found
1. **Incorrect Kubernetes minimum version**: The post stated "Kubernetes 1.22 or later" in the prerequisites. Rook v1.14 requires Kubernetes v1.25 as the minimum supported version (supporting v1.25 through v1.29). Changed "Kubernetes 1.22 or later" to "Kubernetes 1.25 or later".

## Review Notes
- Rook v1.14.0 is a legitimate but older release. The latest stable Rook version is v1.19.3. The post is valid for the version it targets, but readers should be aware newer versions exist.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is valid but not the latest Reef patch release (v18.2.5+ exists). This is acceptable for a tutorial pinning a specific version.
- The `pg_autoscaler` module is enabled by default since Ceph Octopus (v15.2.x), so explicitly enabling it in the CR is redundant but harmless and good for clarity.
- The `requireMsgr2: true` setting requires kernel 5.11+ or CentOS 8.4+ on nodes, which is not mentioned in the prerequisites. This could trip up users on older kernels.
- The post presents both the Helm-based cluster install (Step 2) and a manual CephCluster CR (Step 3) without clarifying that these are alternative approaches — using both would create a conflict. Readers should choose one or the other.
