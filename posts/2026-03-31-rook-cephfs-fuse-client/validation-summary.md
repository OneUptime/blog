# Validation Summary: How to Use FUSE Client Instead of Kernel Driver for CephFS in Rook

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph CSI Driver
- CephFS (Ceph Filesystem)
- FUSE (Filesystem in Userspace)
- Kubernetes ConfigMaps, Deployments, DaemonSets

## Sources Consulted
- Rook operator.yaml reference: https://github.com/rook/rook/blob/master/deploy/examples/operator.yaml
- Rook Helm Chart values: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook Filesystem Storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CSI Common Issues: https://rook.io/docs/rook/v1.9/Troubleshooting/ceph-csi-common-issues/
- Ceph Kernel Features documentation: https://docs.ceph.com/en/reef/cephfs/kernel-features/
- Ceph Quincy OS Recommendations: https://docs.ceph.com/en/quincy/start/os-recommendations/
- Linux Kernel CephFS documentation: https://www.kernel.org/doc/html/latest/filesystems/ceph.html

## Issues Found

1. **Incorrect kernel module name** (line 13): The post referred to the in-kernel CephFS driver as the `ceph-common` kernel module. `ceph-common` is actually a userspace package providing CLI tools like `mount.ceph`. The kernel module is `ceph` (ceph.ko). Fixed to `ceph` kernel module.

2. **Wrong setting name for FUSE selection** (line 24): The post stated "The relevant setting is `csi.cephfs.kernelmountoptions`." This is not a real Rook setting name. The Helm chart value `csi.cephFSKernelMountOptions` (ConfigMap key: `CSI_CEPHFS_KERNEL_MOUNT_OPTIONS`) controls kernel mount options (like encryption mode), not FUSE vs kernel selection. The actual setting is `CSI_FORCE_CEPHFS_KERNEL_CLIENT`. Fixed to reference the correct setting.

3. **Invalid ConfigMap key** (line 38): The post included `CSI_CEPHFS_KERNELMOUNTOPTIONS: "false"` in the ConfigMap example. This key does not exist in Rook's configuration. Even the similarly-named `CSI_CEPHFS_KERNEL_MOUNT_OPTIONS` accepts mount option strings, not booleans. Only `CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"` is needed. Removed the invalid key.

4. **Misleading kernel version requirement** (line 84): The post claimed "kernel 5.4+ is generally sufficient" for Ceph Quincy. This is misleading because kernel 5.4 does not support the msgr2 protocol (requires 5.11+), async directory operations (5.8+), or delegation inodes (5.9+). Basic CephFS functionality (quotas, snapshots) works from kernel 4.17+. Fixed to clarify per-feature requirements.

## Review Notes
- The CSI pod restart commands (`csi-cephfsplugin-provisioner` deployment and `csi-cephfsplugin` daemonset) are correct.
- The FUSE verification method (`mount | grep ceph-fuse`) is correct.
- The performance trade-off discussion (10-30% lower sequential throughput, higher latency, metadata-heavy workloads more affected) is reasonable and consistent with general FUSE overhead observations, though specific numbers will vary by workload.
- The Rook documentation notes that disabling the kernel client may cause application disruption during upgrades — the post does not mention this caveat.
