# Validation Summary: How to Manage Device Discovery for Ceph OSDs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSD (Object Storage Daemon)
- Kubernetes (kubectl, ConfigMaps, DaemonSets, pod debugging)
- Linux device management (lsblk, parted)

## Sources Consulted
- Rook official documentation: CephCluster storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook documentation: OSD device management and discovery (https://rook.io/docs/rook/latest/Storage-Configuration/ceph-cluster/ceph-osd-mgmt/)
- Kubernetes documentation: kubectl debug (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- Ceph documentation: OSD metadata command (https://docs.ceph.com/en/latest/man/8/ceph/)

## Issues Found
1. **`kubectl debug` command missing required flags** — The command `kubectl -n rook-ceph debug node/worker-1 -- chroot /host lsblk -f` was missing the required `--image` flag (no default image is provided for node debugging) and the `-it` flags for interactive terminal allocation. Also removed the `-n rook-ceph` namespace flag since it is unnecessary for node debugging. Fixed to: `kubectl debug node/worker-1 -it --image=busybox -- chroot /host lsblk -f`. Since the command uses `chroot /host`, the host's binaries are used regardless of the debug container image, so `busybox` (a lightweight image) is sufficient.

## Review Notes
- The ConfigMap name `rook-ceph-osd-worker-1` used to check discovered devices may not match the standard Rook naming pattern for discovery result ConfigMaps. The naming has varied across Rook versions. The discover pod logs approach (`kubectl -n rook-ceph logs -l app=rook-discover`) documented immediately below is the more reliable and commonly documented method for checking discovery results.
- All CephCluster spec fields (`deviceFilter`, `useAllDevices`, `useAllNodes`, `nodes`, `devices`, `config.deviceClass`) are accurate and correctly structured.
- The operator ConfigMap settings (`ROOK_DISCOVER_DEVICES_INTERVAL`, `ROOK_ENABLE_DISCOVERY_DAEMON`) are valid configuration options.
- The `parted /dev/sdb mklabel gpt` technique for preventing device discovery is a valid approach, as adding a partition table makes the device ineligible for automatic OSD provisioning.
