# Validation Summary: How to Understand the Rook Storage Architecture (Operator, CSI, Daemon Layers)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes Operators and Custom Resource Definitions (CRDs)
- RBD (RADOS Block Device)
- CephFS (Ceph Filesystem)

## Sources Consulted
- Rook official documentation — https://rook.io/docs/rook/latest/
- Rook CRD reference — https://rook.io/docs/rook/latest/CRDs/specification/
- Ceph documentation on architecture — https://docs.ceph.com/en/latest/architecture/
- Ceph CSI driver documentation — https://github.com/ceph/ceph-csi
- Kubernetes CSI specification — https://kubernetes-csi.github.io/docs/

## Issues Found

1. **"Rook-MGR" listed as a separate Ceph daemon in the architecture diagram.** The rook orchestrator module runs inside the Ceph MGR daemon; it is not a standalone daemon process. Listing it alongside MON, MGR, OSD, MDS, and RGW was misleading. Removed "Rook-MGR" from the daemon list in the diagram.

2. **Non-existent `cephosds` CRD in the `kubectl api-resources` output.** Rook does not define a `cephosds` custom resource. Replaced it with `cephnfs`, which is an actual Rook CRD (CephNFS for NFS-Ganesha gateway management).

3. **RBD driver incorrectly attributed to `librados`.** The RBD CSI driver uses `librbd` (the RADOS Block Device library), not `librados` directly. While `librbd` is built on top of `librados`, the correct library for the RBD data path is `librbd`. Changed "(librados)" to "(librbd)" in the Component Communication section.

## Review Notes
- The post states MONs use the "Paxos protocol" for quorum. While Ceph's monitor consensus is historically based on Paxos, newer Ceph versions use a modified Paxos variant. The description is acceptable but could be made more precise in a future update.
- The RBD CSI driver description mentions only `ReadWriteOnce` access mode. Newer Ceph/CSI versions also support `ReadWriteMany` for RBD in block mode (`volumeMode: Block`). This is a minor omission that does not constitute an error for a general architecture overview.
- The `kubectl api-resources` output is illustrative (showing only 5 of the many Rook CRDs). This is acceptable for a blog post but readers should be aware the full list is larger.
