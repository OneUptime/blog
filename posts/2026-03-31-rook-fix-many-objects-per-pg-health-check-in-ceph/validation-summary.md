# Validation Summary: How to Fix MANY_OBJECTS_PER_PG Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs) — Ceph's data distribution primitive
- PG Autoscaler (Ceph manager module)
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph configuration reference for `mon_pg_warn_max_object_skew`: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph PG Autoscaler module documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups

## Issues Found
- **Option 4 — Wrong config option for adjusting warning threshold (line 103):**
  - **What was wrong:** The command `ceph config set osd osd_pg_stat_report_interval 20` was used to adjust the MANY_OBJECTS_PER_PG warning threshold. `osd_pg_stat_report_interval` controls how frequently (in seconds) OSDs report PG statistics to the monitor — it has no effect on the MANY_OBJECTS_PER_PG warning.
  - **What was changed:** Replaced with `ceph config set global mon_pg_warn_max_object_skew 20`. The `mon_pg_warn_max_object_skew` option (default: 10) is the correct setting that controls the ratio threshold at which the MANY_OBJECTS_PER_PG warning fires. Setting it to 20 means a PG must have >20x the average object count before the warning triggers.
  - **Why:** Using the wrong config option would not suppress the warning and could cause unexpected changes to PG stat reporting frequency.

## Review Notes
- In Ceph Nautilus (v14.2+) and later, setting `pg_num` automatically adjusts `pgp_num` to match, so the separate `pgp_num` step in Option 1 is unnecessary on modern clusters. However, it is not harmful and remains correct for pre-Nautilus clusters, so no change was made.
- The `pg_autoscaler` module is enabled by default in Nautilus and later. The `ceph mgr module enable pg_autoscaler` command in Option 2 is still valid for re-enabling it if disabled, so no change was needed.
- The `ceph pg dump` column numbers referenced in awk commands ($12 for object count) can vary across Ceph versions. The commands are approximately correct for recent releases but readers should verify column positions for their specific version.
