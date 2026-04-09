# Validation Summary: How to Fix RBD PVC Not Binding in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD / RADOS Block Device)
- Kubernetes (PersistentVolumeClaims, StorageClasses, Secrets)
- Ceph CSI Driver (rbd provisioner and node plugin)

## Sources Consulted
- Rook official documentation: Block Storage (RBD) setup and StorageClass configuration (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Rook CephBlockPool CRD reference (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph CLI reference for `ceph osd pool ls` and `rbd ls` commands (https://docs.ceph.com/en/latest/man/)
- Kubernetes CSI external-provisioner sidecar conventions for secret parameters (https://kubernetes-csi.github.io/docs/)
- Rook CSI driver provisioner deployment labels and container naming conventions

## Issues Found
No technical issues found.

## Review Notes
- The guidance in Step 3 about recreating missing CSI secrets is slightly incomplete. The command shown (`kubectl get secret -n rook-ceph rook-ceph-admin-keyring -o yaml`) retrieves the admin keyring for inspection but does not demonstrate the full secret recreation process. In practice, restarting the Rook operator is often sufficient to regenerate the CSI secrets automatically. This is not technically incorrect, just somewhat abbreviated.
- The StorageClass example in Step 7 is comprehensive and matches the current Rook documentation, including the controller-expand secret parameters needed for volume expansion.
- All Ceph CLI commands (`ceph osd pool ls detail`, `rbd ls <pool>`) are syntactically correct.
- The CSI provisioner pod label selector (`app=csi-rbdplugin-provisioner`) and container names (`csi-provisioner`, `csi-rbdplugin`) are accurate for standard Rook deployments.
