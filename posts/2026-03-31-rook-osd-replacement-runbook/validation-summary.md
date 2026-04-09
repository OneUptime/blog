# Validation Summary: How to Create a Ceph OSD Replacement Runbook

## Status
validated

## Post Type
Runbook / Operations Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- CRUSH map
- Kubernetes (kubectl, deployments, ConfigMaps)
- sgdisk, dd (disk wiping utilities)

## Sources Consulted
- Rook Ceph OSD Management documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook Ceph Teardown / Cleanup documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/ceph-teardown/
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Ceph Adding/Removing OSDs documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Rook source code (OSD status ConfigMap naming): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/status.go

## Issues Found

### 1. Insufficient disk wipe with `dd` (Step 5)
- **What was wrong:** The `dd` command used `bs=4096 count=100`, which only writes 400KB of zeros to the beginning of the disk. Ceph BlueStore and LVM may store metadata deeper on the disk, and this small wipe may leave old signatures intact, causing Rook to skip the device during reprovisioning.
- **What was changed:** Updated to `bs=1M count=100 oflag=direct,dsync` (100MB with direct I/O flags), which matches the Rook documentation's recommended approach for disk cleanup and ensures sufficient metadata is wiped.

### 2. Incorrect ConfigMap naming convention (Step 4)
- **What was wrong:** The blog referenced `rook-ceph-osd-5-status` (using the OSD numeric ID), but Rook's OSD status ConfigMaps are named using the node name, not the OSD ID. The naming pattern in Rook's source code is `rook-ceph-osd-%s-status` where `%s` is the Kubernetes node name or PVC name.
- **What was changed:** Updated the ConfigMap name to `rook-ceph-osd-worker-node-1-status` (using the node name from the example in Step 6) and clarified in the description that it's per-node.

## Review Notes
- The three-step OSD removal in Step 3 (`ceph osd crush remove`, `ceph auth del`, `ceph osd rm`) is correct but verbose. Modern Ceph (Luminous+) provides `ceph osd purge <id> --yes-i-really-mean-it` which combines all three operations. The Rook docs also offer `kubectl rook-ceph rook purge-osd` as a plugin command. The manual approach works but could be modernized in a future update.
- The `useAllDevices: true` combined with explicit `nodes[].devices[]` in Step 6 is somewhat contradictory — if `useAllDevices` is true, explicit device lists are redundant. The surrounding text correctly describes both options but the YAML example shows them combined.
- The Rook documentation recommends writing zeros at multiple disk offsets (0, 1GB, 10GB, 100GB, 1TB) to catch metadata stored at various locations. The fix uses a simpler single-offset approach (100MB from start) which is a significant improvement over 400KB but may still miss metadata on very large disks in edge cases.
- Using `-it` flags with `watch` in Step 2 (`watch kubectl exec -it ...`) can produce TTY warnings since `watch` runs commands non-interactively. This is a minor ergonomic issue; the command still functions correctly.
