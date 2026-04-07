# Validation Summary: How to Troubleshoot Slow Snapshot Trimming in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- RBD (RADOS Block Device) snapshots
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on snapshot trimming: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph configuration option reference for OSD snap trim settings
- Ceph admin command reference for `ceph pg dump`, `ceph health detail`, `ceph config`
- Ceph source code references for `osd_pg_max_concurrent_snap_trims` and `osd_snap_trim_sleep` options

## Issues Found

1. **Invalid config option `osd_snap_trim_max`**: The post recommended `ceph config set osd osd_snap_trim_max 100` to increase the number of objects trimmed per operation. This config option does not exist in Ceph. Replaced with `osd_pg_max_concurrent_snap_trims` (default 2), which controls how many PGs on an OSD can be concurrently snap-trimmed. Set to 4 as a reasonable increase.

2. **Fabricated command `ceph tell osd.0 snap_trim_force <pgid>`**: There is no `snap_trim_force` subcommand available via `ceph tell osd.*`. This command would fail with an unrecognized command error. Replaced the entire Step 8 with guidance on verifying snap trimming is not disabled by checking and resetting the `osd_snap_trim_sleep` value.

3. **Incorrect command `ceph osd pool stats mypool | grep "snaptrim"`**: The `ceph osd pool stats` command outputs client I/O rates and recovery statistics, not snaptrim information. Grepping for "snaptrim" would return no results. Replaced with `ceph pg dump pgs_brief | grep snaptrim` which correctly shows PGs in snaptrim-related states.

## Review Notes
- The `osd_snap_trim_sleep_hdd` default of 5 seconds is version-dependent. In some Ceph releases the default may differ. The post does not specify a Ceph version, which is acceptable for a general troubleshooting guide but readers should verify defaults for their specific version.
- The `ceph pg dump_stuck` command referenced in the original Step 2 has limited categories (inactive, unclean, stale, undersized, degraded) and does not include snaptrim as a stuck category, so it was also replaced.
- The batch snapshot deletion script is syntactically correct and is a reasonable operational practice.
