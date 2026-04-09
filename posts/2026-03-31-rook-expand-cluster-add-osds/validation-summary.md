# Validation Summary: How to Expand a Rook-Ceph Cluster by Adding OSDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, specifically OSD management)
- Kubernetes (kubectl, CRDs, pod/job management)
- Linux disk utilities (wipefs, sgdisk, lsblk)

## Sources Consulted
- Rook official documentation on CephCluster CRD storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- Ceph official documentation on OSD management and CRUSH: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph CLI reference for `ceph osd` subcommands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on recovery/backfill tuning: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook documentation on OSD prepare jobs and device discovery: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/osd-management/

## Issues Found

### 1. Invalid `ceph osd set-recovery-ratio` command
- **What was wrong:** The "Controlling Rebalancing Speed" section used `ceph osd set-recovery-ratio 0.2` and `ceph osd set-recovery-ratio 1` to throttle and resume recovery. This is not a valid Ceph command — no such subcommand exists in the Ceph CLI.
- **What was changed:** Replaced with the correct approach using `ceph config set osd osd_max_backfills` and `ceph config set osd osd_recovery_max_active` to throttle recovery, and `ceph osd set norecovery`/`ceph osd set nobackfill` to pause recovery entirely. Also added commands to restore defaults (`ceph config rm`) and resume (`ceph osd unset`).
- **Why:** The original commands would fail with an unrecognized subcommand error. The correct Ceph mechanisms for controlling recovery speed are the `osd_max_backfills`, `osd_recovery_max_active` config options and the `norecovery`/`nobackfill` OSD flags.

### 2. Summary paragraph updated for consistency
- **What was wrong:** The summary referenced throttling recovery without specifying the correct mechanism.
- **What was changed:** Updated to mention the specific settings (`osd_max_backfills`, `osd_recovery_max_active`) and flags (`norecovery`/`nobackfill`).
- **Why:** Consistency with the corrected "Controlling Rebalancing Speed" section.

## Review Notes
- All kubectl commands correctly use `deploy/rook-ceph-tools` as the toolbox deployment, which is the standard Rook toolbox pattern.
- The CephCluster CR YAML snippets use correct field names and structure per the Rook CRD spec (`useAllNodes`, `useAllDevices`, `deviceFilter`, `nodes[].devices[].name`).
- The `ceph osd tree` output format is accurate and representative.
- The `ceph progress` command is available in Ceph Nautilus (14.x) and later — this is fine for any current Rook deployment.
- The OSD prepare job label selector `app=rook-ceph-osd-prepare` and OSD pod label `app=rook-ceph-osd` are correct for current Rook versions.
- The `deviceFilter: "^sd[b-z]"` regex is correct and intentionally excludes `sda` (typically the OS disk).
- The disk preparation commands (`wipefs -a`, `sgdisk --zap-all`) are the standard recommended approach per Rook documentation.
