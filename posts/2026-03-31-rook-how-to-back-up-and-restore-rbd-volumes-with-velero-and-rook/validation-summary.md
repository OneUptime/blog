# Validation Summary: How to Back Up and Restore RBD Volumes with Velero and Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero (Kubernetes backup tool)
- Rook-Ceph (RBD block storage)
- Kubernetes CSI Volume Snapshots
- kubernetes-csi/external-snapshotter
- S3-compatible object storage (via AWS plugin)

## Sources Consulted
- Velero CSI documentation: https://velero.io/docs/main/csi/
- Velero plugin for CSI GitHub repo (archived): https://github.com/vmware-tanzu/velero-plugin-for-csi
- Rook Ceph CSI snapshot documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- kubernetes-csi/external-snapshotter GitHub repo: https://github.com/kubernetes-csi/external-snapshotter
- Rook upstream VolumeSnapshotClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/snapshotclass.yaml

## Issues Found

### 1. VolumeSnapshotClass: annotation should be a label
- **What was wrong:** The `velero.io/csi-volumesnapshot-class: "true"` marker was placed under `annotations:` in the VolumeSnapshotClass metadata.
- **What was changed:** Changed `annotations:` to `labels:` and updated the explanatory text from "annotation" to "label".
- **Why:** Current Velero documentation (v1.14+) specifies that Velero identifies the VolumeSnapshotClass to use via a label, not an annotation. Using an annotation would cause Velero to not detect the snapshot class automatically.

### 2. Deprecated velero-plugin-for-csi included in install command
- **What was wrong:** The install command included `velero/velero-plugin-for-csi:v0.7.0` in the `--plugins` flag. This plugin has been deprecated and archived since Velero v1.14, as CSI snapshot support was merged into Velero core.
- **What was changed:** Removed `velero/velero-plugin-for-csi:v0.7.0` from the `--plugins` flag.
- **Why:** Including the deprecated standalone CSI plugin is unnecessary for Velero 1.14+ and could cause conflicts. The `--features=EnableCSI` flag (which was kept) is sufficient to enable CSI support in modern Velero.

### 3. Outdated velero-plugin-for-aws version
- **What was wrong:** The install command used `velero/velero-plugin-for-aws:v1.9.0`, which is outdated.
- **What was changed:** Updated to `velero/velero-plugin-for-aws:v1.10.0`.
- **Why:** v1.9.0 predates the Velero 1.14 release that integrated CSI support. v1.10.0 is the minimum compatible version for Velero 1.14+.

## Review Notes
- The external-snapshotter URLs all correctly reference the `master` branch, which is confirmed as the default branch for the kubernetes-csi/external-snapshotter repository. All five URLs return valid YAML content.
- The VolumeSnapshotClass parameters (driver name, secret name, clusterID, deletionPolicy) all match the official Rook upstream examples exactly.
- The Velero backup, restore, and schedule CLI commands are all syntactically correct with valid flags.
- The `--features=EnableCSI` flag is still required even in Velero 1.14+ where CSI is built-in — it was intentionally kept.
- For future-proofing, users may want to pin the external-snapshotter URLs to a specific release tag rather than tracking `master`.
