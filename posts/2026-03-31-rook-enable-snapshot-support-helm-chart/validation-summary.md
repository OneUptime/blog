# Validation Summary: How to Enable Snapshot Support in Rook Helm Chart

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Kubernetes VolumeSnapshots (CSI snapshot API)
- Helm (Kubernetes package manager)
- CSI external-snapshotter sidecar
- CephFS and RBD block storage drivers

## Sources Consulted
- Rook Helm chart `values.yaml` (master branch): https://raw.githubusercontent.com/rook/rook/master/deploy/charts/rook-ceph/values.yaml
- Rook Helm chart `values.yaml` (release-1.14): https://raw.githubusercontent.com/rook/rook/release-1.14/deploy/charts/rook-ceph/values.yaml
- Rook official RBD VolumeSnapshotClass example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/snapshotclass.yaml
- Kubernetes CSI external-snapshotter repository: https://github.com/kubernetes-csi/external-snapshotter

## Issues Found
- **Incorrect Helm values nesting for snapshotter image**: The post used `csi.snapshotter.image.repository` and `csi.snapshotter.image.tag` (with an extra `image:` level). The actual Rook Helm chart uses `csi.snapshotter.repository` and `csi.snapshotter.tag` directly. Fixed by removing the extra `image:` key from the YAML snippet.

## Review Notes
- The post references external-snapshotter `v6.3.0`, which is an older release. Current Rook master defaults to `v8.5.0` and release-1.14 defaults to `v7.0.2`. The CRD install URLs and snapshotter image tag are internally consistent at v6.3.0, so this is not incorrect but readers using newer Rook versions should use the matching snapshotter version.
- The `csi.enableNFSSnapshotter` value is also available in newer Rook versions but is not mentioned. This is acceptable since the post focuses on RBD and CephFS.
- All other technical content verified correct: Helm values keys (`enableRBDSnapshotter`, `enableCephfsSnapshotter`), VolumeSnapshotClass fields (driver name, deletionPolicy, secret parameters), CRD URLs, pod label selectors, and default-class annotation.
