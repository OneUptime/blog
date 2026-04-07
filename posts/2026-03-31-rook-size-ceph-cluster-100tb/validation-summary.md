# Validation Summary: How to Size a Ceph Cluster for 100TB Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Erasure coding (EC 4+2 profile)
- Kubernetes (kubectl, CRDs)
- CephBlockPool CRD (ceph.rook.io/v1)
- Ceph PG autoscaler

## Sources Consulted
- Ceph documentation on erasure coding profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph documentation on pool creation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook documentation on CephCluster network configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook documentation on CephBlockPool erasure coding: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation on PG autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph hardware recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/

## Issues Found
- **Inconsistent drive size in section headings**: Option A heading stated "12 nodes with 16TB drives" and Option B stated "8 nodes with 16TB drives", but the calculations in both sections used 8TB drives (e.g., `12 nodes * 8 drives * 8TB = 768TB`). Changed both headings to say "8TB drives" to match the calculations.

## Review Notes
- All capacity calculations are mathematically correct: 3x replication with 20% buffer yields 375TB raw, EC 4+2 (1.5x overhead) with 20% buffer yields 188TB raw.
- The EC 4+2 overhead factor of 1.5x is correct: (k+m)/k = (4+2)/4 = 1.5.
- The Rook CephCluster network selector configuration with `public` and `cluster` keys is correct for host networking with separate storage networks.
- The `ceph osd erasure-code-profile set` command syntax and the `ceph osd pool create` command for erasure-coded pools are correct.
- The CephBlockPool CRD YAML uses the correct fields (`erasureCoded.dataChunks`, `erasureCoded.codingChunks`, `failureDomain`).
- Monitor count of 5 and manager count of 2 are appropriate recommendations for a cluster of this size.
- The PG autoscaler commands are correct. The recommended target of 100-200 PGs per OSD aligns with Ceph best practices.
- Hardware recommendations (16-24 cores, 64-128GB RAM, 25GbE networking) are reasonable for this cluster scale.
