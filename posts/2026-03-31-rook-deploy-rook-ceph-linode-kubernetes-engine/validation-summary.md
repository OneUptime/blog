# Validation Summary: How to Deploy Rook-Ceph on Linode Kubernetes Engine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.13.x)
- Ceph (Reef v18.2.x)
- Linode Kubernetes Engine (LKE)
- Linode Block Storage
- Linode CLI (`linode-cli`)
- Kubernetes (kubectl, Helm)
- Ceph CSI RBD driver

## Sources Consulted
- Rook Operator Helm Chart Docs: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook v1.13.0 Release Notes: https://github.com/rook/rook/releases/tag/v1.13.0
- Official RBD StorageClass Example (release-1.13): https://github.com/rook/rook/blob/release-1.13/deploy/examples/csi/rbd/storageclass.yaml
- CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Block Storage (RBD) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/v1.14/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook dashboard source (port constants): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/dashboard.go
- Linode CLI Block Storage volumes: https://www.linode.com/docs/products/tools/cli/guides/block-storage-volumes/
- Linode API - Create a volume: https://techdocs.akamai.com/linode-api/reference/post-volume
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- GitHub Issue #12944 (Ceph v18.2.0 reconcile loop): https://github.com/rook/rook/issues/12944

## Issues Found

### 1. Missing CSI secret parameters in StorageClass (Critical)
- **What was wrong:** The StorageClass was missing all required CSI secret parameters (`provisioner-secret-name`, `provisioner-secret-namespace`, `controller-expand-secret-name`, `controller-expand-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these, the CSI driver cannot authenticate with Ceph and PVC provisioning fails — PVCs remain in `Pending` state.
- **What was changed:** Added the six required CSI secret parameters to the StorageClass `parameters` block, referencing the `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` secrets in the `rook-ceph` namespace.
- **Why:** These parameters are present in every official Rook StorageClass example and are required for the CSI driver to create, expand, and mount RBD volumes.

### 2. Ceph image version v18.2.0 has known bug (Minor)
- **What was wrong:** The CephCluster spec referenced `quay.io/ceph/ceph:v18.2.0`, which has a known continuous-reconcile-loop issue (rook/rook#12944). The Rook v1.13 default is `v18.2.2`.
- **What was changed:** Updated the Ceph image tag from `v18.2.0` to `v18.2.2`.
- **Why:** v18.2.2 includes bug fixes for the reconcile loop issue and is the recommended Ceph Reef image for Rook v1.13.

### 3. kubectl debug command uses alpine which lacks lsblk (Minor)
- **What was wrong:** The command `kubectl debug node/lke-node-1 -it --image=alpine -- lsblk` would fail because the `alpine` image does not include `lsblk` (it requires the `util-linux` package). Additionally, the command did not use `chroot /host` to properly access the host filesystem.
- **What was changed:** Changed to `kubectl debug node/lke-node-1 -it --image=busybox -- chroot /host lsblk`, which uses `busybox` (has a built-in `lsblk` applet) and `chroot /host` for proper host access.
- **Why:** Ensures the debug command actually works for verifying block device attachment on LKE nodes.

## Review Notes
- The `deviceFilter: "^sd[c-z]$"` is appropriate for Linode Block Storage volumes which typically appear as `/dev/sdc` or similar, but users should verify the actual device names on their nodes since this can vary.
- The `imageFeatures: layering` parameter is conservative but safe. For Linux kernels 5.4+, additional features like `fast-diff,object-map,deep-flatten,exclusive-lock` could be enabled for better performance.
- Rook v1.13 is a stable release but users may want to check for newer Rook versions (v1.14+) which may offer additional features and fixes.
- The Helm chart and CephCluster configurations, Linode CLI commands, dashboard service name/port, and dashboard password secret retrieval are all correct.
