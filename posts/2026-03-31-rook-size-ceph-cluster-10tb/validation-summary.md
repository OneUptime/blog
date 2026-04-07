# Validation Summary: How to Size a Ceph Cluster for 10TB Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (container orchestration)
- CephCluster CRD (Rook custom resource)

## Sources Consulted
- Ceph official documentation: hardware recommendations (https://docs.ceph.com/en/latest/start/hardware-recommendations/)
- Rook documentation: CephCluster CRD spec (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph documentation: OSD memory target and resource requirements (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph documentation: pool creation and PG configuration (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
- **Incorrect safety buffer math in OSD Sizing Options**: Both Option A and Option B used `/ 1.2` to account for the 20% safety buffer. Dividing by 1.2 removes approximately 16.7%, not 20%, making it inconsistent with the correct initial capacity calculation which uses `/ 0.8`. Fixed Option A from `48 / 3 / 1.2 = ~13TB` to `48 / 3 * 0.8 = ~12.8TB`, and Option B from `45 / 3 / 1.2 = ~12.5TB` to `45 / 3 * 0.8 = ~12TB`. Both options still comfortably exceed the 10TB usable target, so no other text changes were needed.

## Review Notes
- The `ceph osd pool create replicapool 64 64 replicated` command specifies both `pg_num` and `pgp_num` explicitly. Since Ceph Nautilus (14.x) and later, `pgp_num` automatically tracks `pg_num`, so the second `64` is redundant but not incorrect. Newer Ceph versions also support PG autoscaling, which may be preferable.
- The CephCluster YAML is valid for the Rook `ceph.rook.io/v1` API. The `resources` block is nested directly under `spec` rather than under `spec.storage`, which works but applies to all OSDs globally. This is fine for the example shown.
- Hardware recommendations (2 cores per OSD, 4-8GB RAM per OSD, 10GbE networking) align with Ceph's official hardware guidance.
- The 70% utilization expansion threshold is conservative; Ceph's default `mon_osd_nearfull_ratio` is 0.85 (85%). Planning at 70% gives good runway.
