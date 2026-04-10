# Validation Summary: How to Balance Recovery Speed vs Normal Operations in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD recovery tuning parameters
- mClock I/O scheduler
- WPQ (Weighted Priority Queue)
- Cron-based scheduling

## Sources Consulted
- Ceph Reef OSD Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph mClock documentation: https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Ceph CLI reference for `ceph osd set/unset` flags
- Ceph `ceph osd perf` output format documentation

## Issues Found

1. **`osd_recovery_sleep_ssd` default value was wrong**: The post claimed a default of `0.01`, but the actual Ceph default is `0.0` (zero). Fixed the value in the Key Tuning Parameters code block.

2. **`osd_max_recovery_bandwidth` does not exist**: This is not a real Ceph configuration option. Recovery throughput in Ceph is controlled indirectly through `osd_recovery_max_active`, `osd_recovery_max_chunk`, `osd_recovery_sleep`, and `osd_max_backfills` — or via mClock QoS profiles. Removed the fabricated option and its comment from the Key Tuning Parameters section.

3. **`osd_op_queue_mclock_profile` is the wrong option name**: The correct Ceph config option is `osd_mclock_profile`, not `osd_op_queue_mclock_profile`. Fixed the option name in the Client Priority Settings section.

4. **Client Priority Settings section was contradictory**: The original code set the mClock profile and then immediately switched `osd_op_queue` to `wpq`, which made the mClock profile setting irrelevant (mClock profiles only take effect when `osd_op_queue` is set to `mclock_scheduler`). Restructured the section to present WPQ and mClock as separate alternatives, with the mClock profile correctly set after enabling the mClock scheduler.

5. **Alerting script used wrong column for commit latency**: The `ceph osd perf` output has columns: `$1` = OSD ID, `$2` = commit_latency(ms), `$3` = apply_latency(ms). The script used `$3` but the alert message referenced "commit latency". Changed `$3` to `$2` to match the stated intent.

## Review Notes
- When the mClock scheduler is active, several legacy recovery tuning options (`osd_recovery_max_active_*`, `osd_max_backfills`, `osd_recovery_sleep_*`) are automatically overridden by mClock. The post does not mention this caveat, which could be confusing for users who set both mClock and legacy options. This is not an error but could be improved in a future revision.
- In modern Ceph versions (Quincy+), `mclock_scheduler` is the default `osd_op_queue` value, and WPQ is considered legacy. The post doesn't note this, which could be added in a future update.
