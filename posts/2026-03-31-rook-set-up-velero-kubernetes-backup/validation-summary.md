# Validation Summary: How to Set Up Rook-Ceph with Velero for Kubernetes Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD storage, RGW object store)
- Velero v1.12+
- Kubernetes CSI Volume Snapshots
- external-snapshotter v6.3.0
- VolumeSnapshotClass API (snapshot.storage.k8s.io/v1)
- radosgw-admin CLI

## Sources Consulted
- Velero v1.12 CSI documentation: https://velero.io/docs/v1.12/csi/
- Velero v1.12 restore reference: https://velero.io/docs/v1.12/restore-reference/
- Velero v1.12 backup reference: https://velero.io/docs/v1.12/backup-reference/
- Velero main branch CSI documentation: https://velero.io/docs/main/csi/
- kubernetes-csi/external-snapshotter v6.3.0 repository: https://github.com/kubernetes-csi/external-snapshotter/tree/v6.3.0/deploy/kubernetes/snapshot-controller

## Issues Found

1. **Incorrect CSI plugin version for Velero v1.12**: The post used `velero/velero-plugin-for-csi:v0.7.0`, but the Velero v1.12 documentation specifies `v0.6.0` as the matching CSI plugin version. Changed to `v0.6.0`.

2. **Invalid `--restore-volumes=true` flag**: The `velero restore create` command included `--restore-volumes=true`, which is not a valid Velero CLI flag. Velero automatically restores volumes from snapshots when they are present in the backup. Removed the invalid flag.

3. **Incorrect consistency claim in summary**: The summary stated Velero with CSI snapshots provides "application-consistent backups." CSI volume snapshots are crash-consistent by default, not application-consistent. Application consistency requires configuring Velero pre/post execution hooks. Changed to "crash-consistent backups."

## Review Notes
- The CSI snapshot controller installation URLs for external-snapshotter v6.3.0 were verified to exist at the specified paths, including `setup-snapshot-controller.yaml`.
- Starting with Velero 1.14, the CSI plugin was merged into Velero core. Users upgrading beyond v1.13 should remove the separate CSI plugin from the `--plugins` flag. The post targets v1.12+ so the separate plugin is still appropriate, but this may become outdated.
- The `velero-plugin-for-aws:v1.9.0` version is typically paired with Velero 1.13, not 1.12. This was not changed as it may still function, but users on strict v1.12 should verify compatibility (v1.8.x is the typical pairing for Velero 1.12).
- Step 3 title says "Set Up RGW Object Store User" but also includes the full Velero installation command. The step covers more than the title suggests.
- For true application-consistent backups, users should configure Velero pre/post hooks to quiesce applications before snapshotting.
