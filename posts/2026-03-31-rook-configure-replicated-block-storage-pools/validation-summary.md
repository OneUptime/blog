# Validation Summary: How to Configure Replicated Block Storage Pools in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- CephBlockPool CRD (ceph.rook.io/v1)
- Kubernetes
- CRUSH failure domains and placement policies

## Sources Consulted
- Rook official documentation for CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph official documentation for pool configuration (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph CLI reference for `ceph osd pool get`, `ceph osd pool get-quota`, and `ceph pg stat`
- Rook source code for QuotaSpec struct (maxBytes as uint64 vs maxSize as resource.Quantity string)
- Cross-referenced with validated Rook blog posts in this repository (rook-create-cephblockpool-crd, rook-storage-quotas-per-namespace, rook-how-to-set-failure-domain-for-block-pools-in-rook, rook-configure-compression-modes-ceph)

## Issues Found
- **`quotas.maxBytes` field with string value**: The post used `maxBytes: 500Gi` in the quotas section. The `maxBytes` field in the Rook CephBlockPool CRD is typed as `uint64` and expects a raw byte count (e.g., `536870912000`), not a Kubernetes quantity string. The correct field for human-readable quantity strings like `"500Gi"` is `maxSize`. Changed `maxBytes: 500Gi` to `maxSize: "500Gi"`.

## Review Notes
- All YAML configuration snippets use the correct `apiVersion: ceph.rook.io/v1` and `kind: CephBlockPool`.
- The `spec.replicated.size`, `requireSafeReplicaSize`, `replicasPerFailureDomain`, `subFailureDomain`, `deviceClass`, and `parameters` fields are all correctly named and used.
- All CLI commands (`ceph osd pool get`, `ceph osd pool get-quota`, `ceph pg stat`) use correct syntax.
- The explanation that `size` controls total copy count (primary plus replicas) is accurate for Ceph replication semantics.
- The note about needing at least three hosts for `size: 3` with `failureDomain: host` is correct and helpful.
- The `requireSafeReplicaSize: false` used with `size: 2` is correctly shown as necessary to allow a two-replica pool, since the safe minimum default enforces `size >= 2` (preventing `min_size` from dropping below safe thresholds).
