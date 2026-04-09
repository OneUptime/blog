# Validation Summary: How to Fix 'backfill_toofull' Preventing Recovery in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph OSD management and backfill recovery
- Ceph balancer module (upmap mode)
- RBD (RADOS Block Device) snapshot management
- RGW (RADOS Gateway) bucket management
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on backfill and recovery: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on OSD full ratios: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/#storage-capacity
- Ceph official documentation on the balancer module: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph CLI reference for `ceph osd reweight`: https://docs.ceph.com/en/latest/man/8/ceph/
- Rook documentation on CephCluster CR storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
1. **Missing kubectl exec prefix for RBD and RGW commands (Step 5):** The `rbd snap ls`, `rbd snap purge`, `radosgw-admin bucket stats`, and `radosgw-admin bucket rm` commands were missing the `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools --` prefix. Since the entire post is written in the context of a Rook-Ceph deployment where all Ceph commands are executed via the toolbox pod, these commands would fail if run directly on the host. Added the kubectl exec prefix to all four commands for consistency with the rest of the post.

## Review Notes
- The `osd_recovery_max_active` option used in Step 7 was split into `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` in newer Ceph versions (Pacific/Quincy). The generic option still works as a fallback in current versions, but users on very recent Ceph releases may want to use the type-specific variants for more granular control.
- The `osd_max_backfills` default is already 1 in Ceph, so the Step 7 command setting it to 1 is effectively a no-op unless it was previously raised. The post could note this, but it's not incorrect as written since the intent is to ensure a conservative setting during recovery.
- All other commands, flags, configuration values, and technical explanations are accurate.
