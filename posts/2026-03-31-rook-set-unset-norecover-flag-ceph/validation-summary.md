# Validation Summary: How to Set and Unset the norecover Flag in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSD flags (`norecover`, `nobackfill`)
- Ceph CLI (`ceph osd set/unset`, `ceph config set`, `ceph pg stat`, `ceph status`)
- Ceph recovery and backfill mechanisms

## Sources Consulted
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph official documentation on recovery tuning: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on placement groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/

## Issues Found
No technical issues found.

All commands are syntactically correct and use current Ceph CLI conventions:
- `ceph osd set norecover` / `ceph osd unset norecover` are the correct commands for toggling the flag.
- `ceph osd dump | grep flags` correctly displays active OSD flags.
- `ceph config set osd osd_recovery_max_active 1` and related tuning parameters are valid configuration options.
- `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` are the device-class-specific variants introduced in Nautilus and still current.
- `osd_recovery_op_priority` is a valid tuning parameter (range 1-63, lower = lower priority).
- The distinction between recovery (updating stale replicas) and backfill (populating new/empty OSDs) is accurate.
- The HEALTH_WARN message format for the norecover flag is correct.

## Review Notes
- The `osd_recovery_max_active` parameter (used in the "multiple failures" example) was superseded by the HDD/SSD-specific variants (`osd_recovery_max_active_hdd`, `osd_recovery_max_active_ssd`) starting in Nautilus. It still functions as a fallback, and both forms appear in the post, so this is not an error—but readers on newer clusters should prefer the device-class-specific options shown in the "Recovery Tuning Parameters" section.
- The post could mention `noout` as a complementary flag often used alongside `norecover` during maintenance windows, but this is a content suggestion, not a technical error.
