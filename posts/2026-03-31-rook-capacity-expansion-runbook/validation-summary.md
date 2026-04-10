# Validation Summary: How to Create a Ceph Capacity Expansion Runbook

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CephCluster CRD (Custom Resource Definition)
- StorageClassDeviceSets (PVC-based OSD provisioning)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook storage configuration documentation (node/device specs, storageClassDeviceSets, placement settings)
- Ceph CLI reference for `ceph osd reweight-by-utilization`, `ceph df`, `ceph osd tree`, `ceph osd stat`, `ceph status`

## Issues Found
1. **Incorrect `watch` command with pipe**: The command `watch kubectl -n rook-ceph get pods | grep osd` does not work as intended. The shell parses the pipe operator before `watch` sees it, so `grep` receives the ncurses terminal output of `watch` (effectively nothing useful) instead of the kubectl output. Fixed to `watch "kubectl -n rook-ceph get pods | grep osd"` so the entire pipeline is quoted and re-executed by `watch` on each interval.

## Review Notes
- The `spec.placement.all.nodeAffinity` combined with `storage.useAllNodes: true` (Option 2) works correctly for host-based OSD configurations. For PVC-based configurations (Option 3), placement must be specified within each `storageClassDeviceSet` entry, as global placement settings are ignored for device sets. The post correctly keeps these as separate options, so no change needed.
- The 70% usage threshold recommendation is conservative but reasonable for a runbook — Ceph's default `nearfull` ratio is 0.85 (85%), so triggering expansion at 70% provides good headroom.
- The `ceph osd reweight-by-utilization` command accepts optional parameters (overload threshold, max weight change, max OSDs) that could be useful in practice but are not strictly necessary for the runbook.
