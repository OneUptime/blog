# Validation Summary: How to Use Rook-Ceph with Velero for Kubernetes Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD and CephFS storage, RGW object store)
- Velero (Kubernetes backup and restore)
- Velero AWS plugin (S3-compatible backend)
- Kubernetes CSI volume snapshots
- Restic/Kopia (file-level pod volume backup)

## Sources Consulted
- Velero official documentation: https://velero.io/docs/
- Velero CSI snapshot support documentation: https://velero.io/docs/main/csi/
- Velero AWS plugin releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- Rook-Ceph documentation on snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshotClass API reference: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Velero backup reference: https://velero.io/docs/main/backup-reference/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found
1. **Outdated `--features=EnableCSI` flag in Velero install command (Step 2)**: The `--features=EnableCSI` flag was a beta feature gate that became GA in Velero 1.12. Since the post uses `velero-plugin-for-aws:v1.10.0` (corresponding to Velero 1.14.x), this flag is no longer recognized and could produce a warning or error. Removed the flag from the install command. CSI snapshot support is now enabled by default when `--use-volume-snapshots=true` is set.

2. **Outdated reference in Summary section**: The Summary paragraph referenced `--features=EnableCSI` as a required installation step. Updated to reference `--use-volume-snapshots=true` instead, which is the current correct flag.

## Review Notes
- The mermaid diagram shows an arrow from "PV Data (Ceph RBD Snapshots)" to "Rook-Ceph RGW (Backup Storage)". In practice, CSI snapshots remain as Ceph-level snapshots on the storage cluster — they are not automatically transferred to RGW. Only backup metadata is stored in the S3 bucket. For actual snapshot data movement to object storage, Velero's Data Mover feature (introduced in 1.12) would be needed. The diagram is a simplification but could be misleading to advanced users.
- The `radosgw-admin user create` command uses hardcoded access/secret keys for demonstration purposes. In production, these should be auto-generated or managed via secrets.
- The credentials file is written in plaintext. A production guide would recommend using Kubernetes secrets directly.
- All VolumeSnapshotClass YAML, Velero CLI commands, and Kubernetes resource definitions are syntactically correct and use current API versions.
