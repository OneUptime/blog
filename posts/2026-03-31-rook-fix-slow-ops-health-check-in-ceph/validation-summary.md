# Validation Summary: How to Fix SLOW_OPS Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (RADOS / OSD subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, pod resource management)
- BlueStore (Ceph storage backend)

## Sources Consulted
- Ceph Health Checks documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/ (SLOW_OPS and BLUESTORE_SLOW_OP_ALERT sections)
- Ceph OSD Config Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/ (osd_op_complaint_time, osd_max_backfills, osd_recovery_max_active, osd_recovery_op_priority)
- Ceph BlueStore Config Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/ (osd_memory_target)
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-osd/ (dump_ops_in_flight)
- Rook CephCluster example: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml (spec.resources.osd)
- Rook OSD source code: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/osd.go (app=rook-ceph-osd label)

## Issues Found
- **`osd_memory_target` set to default value**: The blog said "Increase OSD memory target" but used the value `4294967296` (4GB), which is the documented default for `osd_memory_target`. This would have no effect unless the value was previously lowered. Changed to `8589934592` (8GB) to provide an actual increase as the text implies.

## Review Notes
- The recovery throttling commands (`osd_max_backfills 1` and `osd_recovery_op_priority 3`) set values to their documented defaults (1 and 3 respectively). These commands are useful for restoring conservative settings if they were previously increased, but would be no-ops on a fresh cluster. This is acceptable as-is since the blog presents them as ensuring throttling is in place.
- `osd_recovery_max_active` has been split into `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10) in newer Ceph versions (Reef+). The unified `osd_recovery_max_active` still works (default 0 defers to the device-class-specific variants), so setting it to 1 effectively throttles recovery on both device types. This is correct but version-sensitive.
- The `BLUESTORE_SLOW_OP_ALERT` distinction is verified as accurate per official Ceph health checks documentation.
- All CLI commands (`ceph health detail`, `ceph tell osd.* dump_ops_in_flight`, `ceph config set`, `iostat`, `kubectl top pods`) are syntactically correct and appropriate for their stated purpose.
- The CephCluster CR YAML is correct: `ceph.rook.io/v1` apiVersion and `spec.resources.osd` path are verified against official Rook examples.
