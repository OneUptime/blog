# Validation Summary: How to Handle Node Maintenance During Rook Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl drain, cordon, uncordon)
- Bash scripting (maintenance automation with trap)

## Sources Consulted
- Ceph documentation: Monitor/OSD Interaction configuration — https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph documentation: Monitoring OSDs — https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Kubernetes documentation: kubectl drain reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Rook documentation: OSD Management — https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook design doc: Dedicated OSD Pod — https://github.com/rook/rook/blob/master/design/ceph/dedicated-osd-pod.md
- Rook source code: OSD AppName label — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/osd.go

## Issues Found
1. **Incorrect `ceph osd dump | grep flags` example output**: The example showed `osd_epoch: 42` and `osd_mkfs_uuid: ...` lines alongside `flags noout`. Since the command pipes through `grep flags`, only lines containing "flags" would appear. Fixed to show the realistic single-line output: `flags sortbitwise,recovery_deletes,purged_snapdirs,pglog_hardlimit,noout`.

2. **Incorrect `ceph osd tree` example output**: The example included a non-existent `[offline]` tag after each down OSD entry and showed `0.0` for PRI-AFF (primary affinity). Standard `ceph osd tree` output does not include an `[offline]` tag — it simply shows `down` in the STATUS column. PRI-AFF defaults to `1.00000`. Fixed to show accurate column headers and standard output format.

## Review Notes
- The automation script only sets/unsets the `noout` flag, while the manual procedure also covers `norebalance` and `norecover`. This is a deliberate simplification for the script, not an error, but users following the full manual procedure should adapt the script to include all three flags.
- All Ceph configuration defaults (`osd_heartbeat_grace` = 20s, `mon_osd_down_out_interval` = 600s) verified correct against current Ceph documentation.
- The `--delete-emptydir-data` flag is the current correct flag (replacing the deprecated `--delete-local-data`).
- OSD pods being managed by Deployments (not DaemonSets) is confirmed correct for modern Rook versions.
- The `app=rook-ceph-osd` label selector is confirmed correct per Rook source code.
