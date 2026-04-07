# Validation Summary: How to Remove an OSD from a Rook-Ceph Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system, OSDs, CRUSH map, PGs)
- Kubernetes (kubectl, deployments, PVCs, ConfigMaps)
- Linux disk utilities (wipefs, sgdisk)

## Sources Consulted
- Rook official documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Ceph official documentation on OSD removal: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/#removing-osds-manual
- Ceph CLI reference for `ceph osd purge`: https://docs.ceph.com/en/latest/man/8/ceph/#osd
- Rook CephCluster CRD spec for device configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
- **Step 8, item 2**: The post incorrectly stated "Add a `crushDeviceClass` label to prevent auto-discovery." The `crushDeviceClass` field in Rook is used to assign a CRUSH device class to OSDs (e.g., `hdd`, `ssd`, `nvme`), not to prevent auto-discovery. Changed to "Set `useAllDevices: false` and use a `deviceFilter` to exclude the disk," which is the correct approach for preventing the Rook operator from using a specific device.

## Review Notes
- Modern Rook (v1.3+) provides a built-in OSD removal mechanism via the `removeOSDsIfOutAndSafeToRemove: true` setting in the CephCluster spec, which automates much of this process. The manual procedure described in the post still works and is valid, but readers may benefit from knowing about the automated approach.
- The ConfigMap name `rook-ceph-osd-3-metadata` in Step 6 is not a standard Rook-created resource name. However, the command is guarded with `2>/dev/null || true`, making it safe to run even if no such ConfigMap exists.
- All Ceph CLI commands (`ceph osd out`, `ceph osd down`, `ceph osd purge`, `ceph osd tree`, `ceph pg stat`, `ceph progress`) are correct and current.
- The `kubectl exec deploy/rook-ceph-tools` pattern and pod label selectors (`app=rook-ceph-osd`, `ceph-osd-id=3`) are accurate for Rook deployments.
