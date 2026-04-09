# Validation Summary: How to Fix 'no osds' Error When Deploying Rook-Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- LVM (Logical Volume Manager)
- BlueStore (Ceph OSD backend)

## Sources Consulted
- Rook official documentation — CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation — OSD management and device discovery (https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/)
- Ceph official documentation — OSD troubleshooting (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- LVM man pages — lvremove(8), vgremove(8), pvremove(8)
- Kubernetes documentation — kubectl reference (https://kubernetes.io/docs/reference/kubectl/)

## Issues Found
1. **Step 8 — Incorrect `lvremove` syntax**: The command `sudo lvremove /dev/sdb` is invalid. `lvremove` requires a logical volume path (e.g., `/dev/vg_name/lv_name`), not a raw block device path. Fixed to `sudo lvremove /dev/vg_name/lv_name`.
2. **Step 8 — Wrong LVM removal order**: The original sequence was PV → LV → VG (`pvremove` first, then `lvremove`, then `vgremove`). LVM structures must be removed top-down: logical volumes first, then volume groups, then physical volumes. Fixed the order to LV → VG → PV.

## Review Notes
- The ConfigMap name pattern in Step 6 (`rook-ceph-osd-<node-name>`) may vary across Rook versions. In some versions, device discovery results are stored in ConfigMaps named `local-device-<node-name>`. The general guidance to check the discovery ConfigMap is correct, but users may need to adjust the name for their specific Rook version.
- The post references "Nautilus+" in Step 8. Ceph Nautilus (v14.x) is EOL. The guidance about BlueStore and LVM metadata still applies to current Ceph versions (Reef, Squid), but the Nautilus reference is dated.
- All kubectl commands, YAML configuration snippets, and the general troubleshooting flow are accurate and follow current Rook-Ceph best practices.
