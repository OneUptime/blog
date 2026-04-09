# Validation Summary: How to Plan Capacity for Rook Stretch Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Ceph stretch clusters (multi-site replication)
- CRUSH (Ceph's data placement algorithm)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph Stretch Mode documentation: https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Ceph Monitor/OSD Interaction configuration: https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/
- Ceph OSD Config Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Monitor Config Reference: https://docs.ceph.com/en/reef/rados/configuration/mon-config-ref/
- Rook Stretch Storage Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/

## Issues Found

1. **`mon_cap_warn_space_ratio` does not exist (critical)**: The command `ceph config set global mon_cap_warn_space_ratio 0.30` used a non-existent Ceph configuration option. This command would fail or be silently ignored. Replaced with `ceph config set global mon_osd_nearfull_ratio 0.70` which is the correct option for setting an early capacity warning threshold. The second command setting `mon_osd_nearfull_ratio 0.75` was replaced with `mon_osd_backfillfull_ratio 0.80` to provide a complementary threshold (stop backfill at 80%, lower than the default 90%).

2. **"Ceph's default target utilization of 80%" was misleading**: Ceph's actual default thresholds are nearfull at 85%, backfillfull at 90%, and full at 95%. The 80% figure is a community best practice, not a Ceph default. Updated the text to say "recommended target utilization of 80%" and clarified that Ceph's default nearfull ratio is 85%.

3. **"Rook recommends" misattribution**: The claim that "Rook recommends at least 3 nodes per zone" is not directly stated in Rook's documentation. This is a general Ceph best practice. Changed to "it is recommended" to avoid false attribution.

4. **`ceph osd pool stats` shows I/O stats, not capacity**: In a capacity planning context, `ceph osd pool stats` is misleading since it shows client I/O throughput rather than capacity usage. Replaced with `rados df` which shows per-pool capacity usage, which is more relevant.

5. **`osd_max_backfills 1` is already the default**: The comment "Limit backfill operations during expansion" implied this was reducing from a higher default. Updated comments to clarify that `osd_max_backfills` defaults to 1, and that `osd_recovery_max_active` defaults to 3 for HDDs and 10 for SSDs, so setting it to 1 is a meaningful throttle.

## Review Notes
- The replication factor of 4 (2 copies per site) for stretch clusters is correctly stated and matches official Ceph documentation.
- The capacity formulas and math are correct.
- The symmetric zone sizing explanation is accurate — CRUSH does constrain effective capacity to the smaller site.
- All kubectl command patterns using `deploy/rook-ceph-tools` are the standard Rook approach.
- The `ceph osd tree`, `ceph df`, `ceph osd df tree`, and `ceph df detail` commands are all valid.
