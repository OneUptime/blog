# Validation Summary: How to Calculate Erasure Coding Overhead Factor in Ceph

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (erasure coding, OSD management, pool statistics)
- Rook (CephBlockPool CRD, Kubernetes operator for Ceph)
- Kubernetes (CRD API patterns)

## Sources Consulted
- Ceph official documentation on erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph CLI reference for `ceph df`, `ceph osd pool stats`, `ceph osd erasure-code-profile`, `ceph osd tree`: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Erasure coding theory (Reed-Solomon): overhead factor = (k + m) / k is the standard formula

## Issues Found
No technical issues found.

All arithmetic in the overhead factor table is correct. All Ceph CLI commands use valid syntax and flags. The Rook CephBlockPool YAML uses the correct `ceph.rook.io/v1` API with valid field names (`spec.erasureCoded.dataChunks`, `spec.erasureCoded.codingChunks`). The fault tolerance claims (m failures tolerated for EC, size-1 failures for replication) are accurate. The capacity planning calculations are mathematically correct.

## Review Notes
- The table column header `Profile (k=m)` is slightly ambiguous — it could be read as "k equals m," but it appears to be showing the format of column entries (k=value, m=value). Not a technical error, but `Profile (k, m)` would be clearer.
- The post correctly notes that EC requires at least k+m OSDs across failure domains, which is an important operational detail often overlooked.
- The comparison of k=4, m=2 EC vs 3-way replication (same 2-failure tolerance at half the storage cost) is accurate and well-presented.
