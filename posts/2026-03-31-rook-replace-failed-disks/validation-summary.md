# Validation Summary: How to Replace Failed Disks in a Rook-Ceph Cluster

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Kubernetes (kubectl CLI)
- Linux disk utilities (smartctl, sgdisk, blkdiscard, partprobe, lsblk)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook OSD management documentation: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/
- Ceph documentation on OSD removal: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph CLI reference for `ceph osd` commands: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

1. **Incorrect annotation for triggering OSD reprovisioning (Step 5)**: The post used `rook.io/force-delete-storage-config` as an annotation to trigger device re-evaluation. This is not a documented Rook annotation for this purpose. Replaced with the standard approach of restarting the Rook operator pod (`kubectl delete pod -l app=rook-ceph-operator`) to force an immediate reconciliation and device re-scan.

2. **`-it` flags with `watch` command (Step 1)**: The `watch` command was wrapping `kubectl exec -it`, but `watch` does not allocate a TTY, making the `-t` flag problematic and potentially causing warnings or failures. Removed `-it` flags from the `kubectl exec` call inside `watch`.

## Review Notes
- The OSD removal order (crush remove → auth del → osd rm) is correct per Ceph documentation.
- All Ceph CLI commands (`ceph osd out`, `ceph osd tree`, `ceph health detail`, etc.) are valid and current.
- The disk wiping commands (`sgdisk --zap-all`, `blkdiscard`, `partprobe`) are the standard recommended approach for preparing disks for Rook.
- The post correctly emphasizes waiting for `active+clean` PG state before proceeding with physical disk replacement, which is critical for data safety.
