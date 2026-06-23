# Validation Summary: How to Troubleshoot Ceph OSD Failures and Recovery

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ceph OSD
- Ceph RADOS placement groups
- BlueStore
- ceph CLI
- ceph-volume
- Rook-Ceph
- Linux systemd and block-device utilities

## Sources Consulted
- Ceph Documentation: Troubleshooting OSDs - https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Documentation: Monitoring OSDs and PGs - https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Documentation: Monitor command API - https://docs.ceph.com/en/latest/api/mon_command_api/
- Ceph Documentation: OSD Config Reference - https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Documentation: Health Checks - https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Documentation: Monitor Config Reference - https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Documentation: ceph-bluestore-tool manual - https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Ceph Documentation: ceph-volume LVM prepare/create behavior - https://docs.ceph.com/en/reef/ceph-volume/lvm/prepare/

## Issues Found
- Corrected the OSD architecture description to note that an OSD generally has one primary data device and may also use separate DB/WAL devices. This avoids implying every OSD maps to exactly one block device in all BlueStore layouts.
- Corrected the `ceph osd find` explanation. The command returns placement and endpoint information, while detailed metadata is available through `ceph osd metadata <osd-id>`.
- Replaced `ceph pg <pg-id> query` with the documented `ceph tell <pg-id> query` form.
- Changed `ceph pg ls-by-osd <id>` to `ceph pg ls-by-osd osd.<id>` to match the documented OSD-name argument form.
- Fixed recovery tuning comments: `osd_recovery_op_priority` uses higher values to favor recovery, not lower values, and `osd_recovery_max_single_start` / `osd_max_backfills` tune concurrency rather than byte-per-second bandwidth.
- Clarified that setting pool `recovery_priority` to `0` lowers priority; it does not pause recovery for that pool.
- Replaced `ceph config set global mon_osd_full_ratio` and `mon_osd_nearfull_ratio` with the documented OSDMap commands `ceph osd set-full-ratio` and `ceph osd set-nearfull-ratio`.
- Corrected the `mon_osd_down_out_interval` description to say it controls how long a down OSD remains down before being marked out, not an alert threshold.
- Replaced the outdated/incorrect `osd_scrub_interval` setting with `osd_scrub_min_interval`.
- Corrected the primary-affinity emergency example from `0` to `1.0`; setting `0` disables primary selection for that OSD rather than resetting it.
- Corrected the label for `ceph pg cancel-force-recovery` and `ceph pg cancel-force-backfill`; these cancel forced recovery/backfill priority, not scrub operations.

## Review Notes
The guide is broadly accurate for modern Ceph, but several operational examples depend on deployment style. For example, systemd unit names and log paths can differ in cephadm or Rook-managed clusters, and recovery tuning behavior can be affected by the mClock scheduler in recent Ceph releases.
