# Validation Summary: How to Set Up Ceph Storage for Kubernetes with Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph
- Rook
- Kubernetes
- Helm
- Ceph RBD
- CephFS
- Kubernetes CSI StorageClasses and PersistentVolumeClaims

## Sources Consulted
- Rook Ceph Quickstart: https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Rook Ceph Operator Helm Chart: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph upgrade and supported versions: https://rook.io/docs/rook/latest-release/Upgrade/ceph-upgrade/
- Rook Block Storage RBD documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephFS filesystem storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFilesystem CRD: https://rook.github.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Ceph release index: https://docs.ceph.com/en/latest/releases/index.html
- Rook prerequisites: https://rook.github.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/

## Issues Found
- The CephCluster example used `quay.io/ceph/ceph:v18.2` with a comment saying it was the latest stable release. As of this review, Ceph Reef 18.2 is past its estimated EOL and Rook's current docs show Squid and Tentacle as supported. Changed the example to `quay.io/ceph/ceph:v19.2.3` and changed the comment to "supported stable Ceph release."
- The RBD StorageClass enabled volume expansion but omitted the CSI controller expand secret fields shown in the official Rook RBD StorageClass example. Added `controller-expand` and `controller-publish` secret parameters for the RBD provisioner.
- The CephFS section created a `CephFilesystem` but did not create a CephFS StorageClass, so Kubernetes could not dynamically provision shared CephFS PVCs from that filesystem. Added a CephFS StorageClass using the correct provisioner, generated data pool name, and CSI secret parameters.
- The CephFS section did not include an apply command for the filesystem manifest. Added `kubectl apply -f cephfs.yaml`.
- The toolbox command referenced the older Rook `release-1.14` example manifest. Updated it to `release-1.19` to align with current Rook documentation.

## Review Notes
The YAML snippets were parsed locally with PyYAML and are syntactically valid. The guide remains a simplified deployment path; production users should still pin exact Rook chart versions, confirm Rook/Ceph/Kubernetes compatibility for their cluster, and size Ceph resources and failure domains according to workload requirements.
