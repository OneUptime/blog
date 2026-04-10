# Validation Summary: How to Calculate the Correct Number of PGs for a Ceph Pool

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (Placement Groups, OSD management, pool configuration)
- Rook (CephBlockPool CRD, Kubernetes operator for Ceph)
- Kubernetes (kubectl commands for Rook toolbox)

## Sources Consulted
- Ceph Placement Groups documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/reef/rados/configuration/pool-pg-config-ref/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Red Hat Ceph Storage - Placement Groups: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/storage_strategies_guide/placement_groups_pgs
- Ceph Monitoring documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

1. **Per-PG memory estimate was too low (line 13)**: The post claimed "each PG consumes roughly 10 KB of RAM per OSD." Community sources and a sibling post in this blog cite ~100 KB or more per PG per OSD, depending on workload. Changed "10 KB" to "100 KB or more" with a workload qualification.

2. **Incorrect awk field in `ceph osd df` command (line 103)**: The command `ceph osd df | awk '{print $1, $14}'` was wrong because `ceph osd df` output includes size units (GiB, MiB, KiB) as separate awk fields, making the PGS column appear at a much higher field number than $14. The exact field position also varies by Ceph version (whether OMAP/META columns are present). Replaced the fragile awk parsing with a simple `ceph osd df` command and instructions to check the PGS column directly.

3. **PGs per OSD range was misleading (line 99)**: The post said "100-250 PGs per OSD" as the recommended range. In reality, 100 is the target (`mon_target_pg_per_osd` default) and 250 is the hard warning threshold (`mon_max_pg_per_osd` default), not the upper end of a recommended operating range. Reworded to clarify the target is 100 and the warning fires above 250.

## Review Notes
- The PG calculation formula `(OSDs * 100) / replication_factor` is the traditional formula and is correct. Since Ceph Nautilus (14.x), PG counts no longer strictly require powers of 2, but rounding to a power of 2 is still common practice.
- Since Nautilus, the `pgp_num` argument in `ceph osd pool create` is automatically set to match `pg_num`, so the third positional argument (pgp_num) is optional. The post's usage is not wrong but readers should know it's no longer required.
- PG autoscaling (enabled by default since Nautilus) is the recommended approach for most deployments, and the post correctly highlights this. The manual formula is still useful for planning and understanding.
