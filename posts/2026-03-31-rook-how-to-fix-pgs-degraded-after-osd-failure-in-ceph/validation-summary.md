# Validation Summary: How to Fix 'pgs degraded' After OSD Failure in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- Ceph Placement Groups (PGs)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph official documentation on placement groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph `osd purge` command reference: https://docs.ceph.com/en/latest/man/8/ceph/#osd
- Ceph recovery tuning options (`osd_max_backfills`, `osd_recovery_max_active`, `osd_recovery_op_priority`): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook documentation on OSD management and device replacement: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook CephCluster reconcile annotation pattern: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/#force-reconcile

## Issues Found
No technical issues found.

## Review Notes
- The `ceph tell osd.* injectargs` approach works but is considered legacy. Modern Ceph versions also support `ceph config set osd <option> <value>` for persistent configuration changes. The `injectargs` method only applies at runtime and is lost on restart. This is not incorrect, just worth noting for future updates.
- The `watch` commands that wrap `kubectl exec -it` may produce TTY-related warnings since `watch` does not allocate a terminal. In practice this usually works, but using `-i` without `-t` (i.e., `kubectl exec -i`) would be cleaner inside `watch`.
- The post correctly notes waiting for data migration to complete before purging the OSD, but does not explicitly show how to verify completion (checking that all PGs return to `active+clean` via `ceph -s`). This is a minor completeness observation, not an error.
