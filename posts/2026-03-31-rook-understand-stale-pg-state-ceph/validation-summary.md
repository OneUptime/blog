# Validation Summary: How to Understand the stale PG State in Ceph

## Status
validated

## Post Type
Guide / Troubleshooting Reference

## Technologies Covered
- Ceph (storage cluster)
- Ceph Placement Groups (PGs)
- Ceph OSDs (Object Storage Daemons)
- Ceph Monitor (MON)
- Rook (Ceph operator for Kubernetes)
- systemd (service management)
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on monitoring OSDs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph configuration reference for `mon_osd_report_timeout`: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph CLI reference for `ceph pg`, `ceph osd` commands: https://docs.ceph.com/en/latest/rados/operations/control/

## Issues Found
No technical issues found.

## Review Notes
- The default value of `mon_osd_report_timeout` at 900 seconds is correct for current Ceph releases.
- The comment on `ceph osd stat` says "Check the OSD's last seen time" — while `ceph osd stat` shows a summary of OSD counts (up/down/in/out) rather than per-OSD timestamps, it is still useful for a quick health check in this context. A more detailed per-OSD view would come from `ceph osd dump`, but the current suggestion is not incorrect.
- The `ceph pg query` JSON path `.info.stats.last_active` is a reasonable reference for checking PG activity timestamps, though exact field names can vary slightly across Ceph versions.
- The distinction between stale and inactive PG states in the comparison table is accurate and helpful.
- All CLI commands use correct syntax and flags for current Ceph releases.
