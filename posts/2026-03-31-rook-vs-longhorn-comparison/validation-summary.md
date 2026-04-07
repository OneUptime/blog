# Validation Summary: How to Use Rook-Ceph with Longhorn for Comparison

## Status
validated

## Post Type
Comparison Guide / Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator for Ceph)
- Longhorn (Kubernetes-native distributed block storage)
- Kubernetes (PVCs, StorageClasses, CSI, Deployments, Pods)
- fio (flexible I/O tester for benchmarking)

## Sources Consulted
- Longhorn official documentation on RWX volumes: https://longhorn.io/docs/1.7.0/nodes-and-volumes/rwx-workloads/
- Longhorn release notes for v1.1.0 (RWX support introduction): https://github.com/longhorn/longhorn/releases
- Rook-Ceph documentation on storage types (RBD, CephFS, RGW): https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- fio documentation for benchmark parameters: https://fio.readthedocs.io/

## Issues Found
1. **Longhorn RWX support incorrectly listed as "No"**: The feature comparison table stated Longhorn does not support shared filesystem (RWX). Longhorn has supported RWX volumes via NFS since v1.1.0. Changed "No" to "Yes (NFS-based)" in the comparison table.

## Review Notes
- The Longhorn install URL references v1.7.0, which is a valid release. Readers should check for the latest version at the time of reading.
- The fio benchmarks use `--ioengine=libaio`, which is Linux-specific. This is appropriate since Kubernetes nodes are Linux-based.
- The migration approach using a copy pod is a standard and sound technique, though for very large volumes readers should consider using `rsync` instead of `cp` for better progress tracking and resume capability.
- The `nixery.dev/shell/fio` image is a convenient way to get fio in a container but may not always be available; readers could alternatively use a standard fio Docker image.
