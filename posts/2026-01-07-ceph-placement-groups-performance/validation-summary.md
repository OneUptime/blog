# Validation Summary: How to Configure Ceph Placement Groups for Optimal Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph RADOS
- Ceph placement groups
- Ceph OSDs
- Ceph pools
- Ceph PG autoscaler
- Ceph CLI
- Prometheus manager module

## Sources Consulted
- Ceph Documentation - Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph Documentation - Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Documentation - Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- Ceph Documentation - OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Documentation - Monitor Command API: https://docs.ceph.com/en/latest/api/mon_command_api/
- Ceph Documentation - Prometheus Module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Documentation - Health Checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/

## Issues Found
- The post described `pgp_num` as something that should be manually updated after PG changes. Current Ceph documentation states that in Nautilus and later Ceph generally adjusts `pgp_num` automatically after `pg_num` changes. Updated the relevant manual configuration, splitting, and merging examples to make manual `pgp_num` changes version-conditional.
- The PG bounds section described only `mon_max_pg_per_osd` as the maximum PG boundary. Added the pool-level `pg_num_max` setting and clarified that `mon_max_pg_per_osd` is a global per-OSD failsafe.
- The "Controlling Split Rate" section incorrectly used `osd_max_pg_per_osd_hard_ratio` as if it controlled concurrent PG splitting. Replaced it with verified autoscaler controls: `mon_target_pg_per_osd` and the autoscaler `threshold`.
- The pool scrub example used a positional pool name. Updated it to the documented `ceph osd pool scrub --who=<pool-name>` form.
- The recovery tuning comments described `osd_recovery_max_single_start` as a byte-per-second I/O limiter. Corrected the explanation to state that it limits newly started recovery operations per OSD.
- The monitoring section used `mgr/prometheus/rbd_stats_pools` as "detailed PG statistics." That option is for RBD per-image I/O statistics. Replaced it with enabling the Prometheus manager module for Ceph metric export.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Some recommendations, such as exact PG counts for workload classes, remain intentionally high-level and should be treated as starting points rather than universal tuning rules.
