# Validation Summary: How to Troubleshoot Multisite Sync Lag in Ceph RGW

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite Replication
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- kubectl

## Sources Consulted
- Ceph official documentation on RGW multisite sync: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph configuration reference for `mon_clock_drift_allowed` (default 0.05s): https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph RGW configuration reference for `rgw_data_sync_spawn_window`: https://docs.ceph.com/en/latest/radosgw/config-ref/
- radosgw-admin man page for sync subcommands: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
- **Clock skew threshold was incorrect**: The post stated "Maximum acceptable clock skew is 5 minutes," which is dangerously misleading. Ceph monitors default to a `mon_clock_drift_allowed` of 0.05 seconds (50ms), and RGW multisite sync relies on accurate timestamps for conflict resolution. Changed to recommend sub-second accuracy via NTP or chrony, consistent with Ceph best practices.

## Review Notes
- All `radosgw-admin` subcommands used (`sync status`, `data sync status`, `sync error list`, `sync error trim`, `data sync run`) are valid.
- The `rgw_data_sync_spawn_window` config option is correctly used to tune sync parallelism.
- The `sync error trim` command correctly uses `--start-time` and `--end-time` flags.
- The kubectl commands and Rook namespace conventions are correct.
- The `iperf3` tool is unlikely to be available in the Ceph tools pod by default, but mentioning it as a diagnostic approach is reasonable since operators can install it.
