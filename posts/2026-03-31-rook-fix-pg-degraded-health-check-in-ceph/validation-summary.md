# Validation Summary: How to Fix PG_DEGRADED Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, health checks, OSD management, recovery tuning)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook-managed OSDs)
- Placement Groups (PG states, degradation, recovery)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/#pg-degraded
- Ceph official documentation on placement groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph OSD configuration reference (recovery tuning options): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference for `ceph pg`, `ceph osd`, and `ceph config` commands: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found
No technical issues found.

## Review Notes
- The `osd_recovery_op_priority` value of 63 is the maximum priority. While technically correct for speeding up recovery, users should be aware this gives recovery operations the highest possible priority and may noticeably impact client I/O performance on busy clusters. The post does mention throttling as an alternative, which is good.
- Setting `min_size 1` (Cause 2) allows I/O to continue with only a single replica, which risks data loss if that one remaining OSD fails. This is a valid emergency measure but carries significant risk. The post could benefit from a warning about this in a future update.
- All Rook-specific commands (label selectors, deployment naming conventions) are accurate for current Rook versions.
