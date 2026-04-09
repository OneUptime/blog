# Validation Summary: How to Handle Disk Identifier Changes in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, OSDs)
- Kubernetes (kubectl, CRDs, node debugging)
- Linux device management (udev rules, persistent device paths, /dev/disk/by-id, /dev/disk/by-path)

## Sources Consulted
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook OSD configuration documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- Linux udev rules documentation (man 7 udev)
- Linux persistent device naming: https://wiki.archlinux.org/title/Persistent_block_device_naming

## Issues Found
1. **Missing `--image` flag on `kubectl debug node/` commands**: Two `kubectl debug node/worker-1` commands were missing the required `--image` flag. The `kubectl debug node/` subcommand has no default image and will fail without `--image` being specified. Fixed both instances by adding `--image=busybox` (busybox is sufficient since the commands use `chroot /host` to run host binaries). Also removed the unnecessary `-n rook-ceph` namespace flag since node debug pods don't need to be in the Rook namespace, and added the `-it` flag which is standard practice for interactive debug sessions.

## Review Notes
- The `rook.io/do-reconcile=true` annotation shown in Step 4 is not an officially documented Rook annotation. However, the technique works in practice because any modification to the CephCluster CR (including annotation changes) triggers the Rook operator's reconciliation loop. This is a common community pattern.
- The `ceph_daemon_type=osd` label selector used in Step 3 is valid for recent Rook versions (1.12+). Older versions may use different label schemes (e.g., `app=rook-ceph-osd`).
- The udev rule in Step 5 is syntactically correct and would create functional stable symlinks. Readers should be aware they also need to run `udevadm control --reload-rules && udevadm trigger` after creating the rules file for it to take effect.
- The CephCluster YAML spec correctly shows the `storage.nodes[].devices[].name` field accepting persistent device paths, which is documented in Rook's official CRD reference.
