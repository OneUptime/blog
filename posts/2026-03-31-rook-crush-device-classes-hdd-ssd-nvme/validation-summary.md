# Validation Summary: How to Configure Device Classes (HDD, SSD, NVMe) in CRUSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map, device classes, OSD management, pool creation)
- Rook (CephBlockPool CRD)
- Linux kernel sysfs (rotational device detection)

## Sources Consulted
- Ceph official documentation — CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph man page — ceph(8): https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph blog — New in Luminous: CRUSH device classes: https://ceph.io/en/news/blog/2017/new-luminous-crush-device-classes/
- Rook documentation — CephBlockPool CRD: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Red Hat Ceph Storage 5 — CRUSH Administration: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/storage_strategies_guide/crush_administration

## Issues Found
1. **Misleading "Override or assign" intro text**: The "Manually Assigning Device Classes" section stated "Override or assign device classes explicitly", implying `ceph osd crush set-device-class` can override an existing class. In reality, this command fails if the OSD already has a device class assigned — you must first run `ceph osd crush rm-device-class` to remove it. Fixed the intro text and updated the inline comments to clarify this requirement.

2. **Incorrect comment on `ceph osd pool stats`**: The "Verifying Data Placement" section had the comment "Check which OSDs a pool maps to" for `ceph osd pool stats mypool`. This command shows pool I/O statistics (read/write ops, bandwidth), not OSD mappings. Fixed the comment to "Check pool I/O statistics" and added a separate descriptive comment for the `ceph osd dump` command.

## Review Notes
- The example `ceph osd tree` output shows host node-01 with weight 15.000 but only lists OSDs totaling 5.5 in weight. This is fine as an illustrative partial example, but readers should understand the output is abbreviated.
- The `ceph osd pool create ssd-pool 64 64 replicated ssd-rule` command specifies both pg_num and pgp_num explicitly. In Ceph Nautilus+ with pg_autoscaler enabled, explicit PG counts are optional. The command is still valid but readers on newer Ceph versions may want to omit the PG counts and rely on the autoscaler.
- The `ceph osd pool set ssd-pool crush_rule ssd-rule` command after `ceph osd pool create ... ssd-rule` is redundant since the rule was already specified at creation time. Not incorrect, but unnecessary.
