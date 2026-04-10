# Validation Summary: How to Compare Ceph vs Longhorn for Kubernetes Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system)
- Longhorn (Kubernetes-native block storage)
- Kubernetes persistent storage (PVCs, StorageClasses)
- Helm (package manager for Kubernetes)
- fio (flexible I/O tester)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Rook GitHub releases: https://github.com/rook/rook/releases
- Longhorn official documentation: https://longhorn.io/docs/
- Longhorn RWX volumes documentation: https://longhorn.io/docs/1.7.0/nodes-and-volumes/volumes/rwx-volumes/
- CNCF project listing for Rook: https://www.cncf.io/projects/rook/
- CNCF project listing for Longhorn: https://www.cncf.io/projects/longhorn/
- fio documentation: https://fio.readthedocs.io/

## Issues Found
1. **Longhorn RWX support incorrectly listed as "No"**: The feature comparison table stated Longhorn does not support shared file storage (RWX). This is incorrect -- Longhorn has supported RWX volumes via NFSv4 share-manager pods since v1.1.0. Changed "No" to "Yes (NFS)" in the feature table.

## Review Notes
- The Rook version used in the installation example (v1.14.0) is not the latest release but the installation steps are correct for that version. Future updates may want to bump to the latest stable release.
- The fio benchmark commands are syntactically correct and use appropriate parameters for storage benchmarking.
- The CNCF statuses are accurate: Rook is Graduated, Longhorn is Incubating.
- The Rook/Ceph installation path `rook/deploy/examples` and the manifest file names (crds.yaml, common.yaml, operator.yaml, cluster.yaml) are correct for v1.14.0.
- The Longhorn Helm chart repository URL (`https://charts.longhorn.io`) and installation commands are correct.
- The CRUSH algorithm reference for Ceph auto-rebalancing is accurate.
