# Validation Summary: How to Throttle Recovery to Minimize Impact in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster recovery subsystem)
- Rook (Ceph operator for Kubernetes)
- mClock I/O scheduler
- Bash scripting / cron scheduling

## Sources Consulted
- Ceph official documentation: OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: mClock scheduler (https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/)
- Ceph source code configuration defaults for recovery-related options

## Issues Found
1. **`osd_max_recovery_bandwidth` does not exist.** The "Bandwidth Limiting" section referenced `osd_max_recovery_bandwidth` as a Ceph config option to cap recovery bandwidth per OSD. This option does not exist in Ceph. Recovery throughput is controlled indirectly through sleep intervals (`osd_recovery_sleep`), concurrency limits (`osd_max_backfills`, `osd_recovery_max_active`), and the mClock I/O scheduler — all of which are already covered in other sections of the post. **Fix:** Removed the entire "Bandwidth Limiting" section and updated the description and summary paragraph to reference concurrency limits instead of bandwidth caps.

## Review Notes
- All other config options (`osd_recovery_sleep`, `osd_recovery_sleep_hdd`, `osd_recovery_sleep_ssd`, `osd_max_backfills`, `osd_recovery_max_active`, `osd_recovery_max_active_hdd`, `osd_recovery_max_active_ssd`, `osd_op_queue`, `osd_mclock_profile`) are valid Ceph configuration options.
- The mClock profiles listed (`high_client_ops`, `high_recovery_ops`, `balanced`, `custom`) are accurate for Ceph Pacific and later.
- The shell script logic for time-based throttle scheduling is correct.
- The monitoring commands using `ceph -s`, `ceph osd perf`, and `ceph config get` are all valid.
