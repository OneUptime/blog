# Validation Summary: How to Implement Storage Quotas Per Namespace with Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes ResourceQuota
- CephBlockPool CRD (ceph.rook.io/v1)
- CephFilesystemSubVolumeGroup CRD (ceph.rook.io/v1)
- Ceph MGR Prometheus module metrics
- OPA/Gatekeeper admission controller

## Sources Consulted
- Rook CephBlockPool CRD source code and examples (GitHub: rook/rook, `pkg/apis/ceph.rook.io/v1/types.go`, `deploy/examples/pool.yaml`)
- Rook CephFilesystemSubVolumeGroup CRD source code and examples (GitHub: rook/rook, `deploy/examples/subvolumegroup.yaml`)
- Kubernetes ResourceQuota documentation (https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- Kubernetes Quantity API reference (https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/quantity/)
- Ceph MGR Prometheus module metric definitions
- Ceph CLI documentation for `ceph osd pool set-quota` and `ceph osd pool get-quota`

## Issues Found

### 1. CephBlockPool `quotas.maxBytes` is deprecated
**What was wrong:** The CephBlockPool YAML used `maxBytes: 1099511627776` under `quotas`. The `maxBytes` field is deprecated in the Rook CRD in favor of `maxSize`, which accepts human-readable Kubernetes quantity strings.
**What was changed:** Replaced `maxBytes: 1099511627776    # 1 TB` with `maxSize: "1Ti"`.
**Why:** The official Rook examples and CRD source show `maxSize` as the preferred field. Using the deprecated `maxBytes` field may stop working in future Rook releases.

### 2. CephFilesystemSubVolumeGroup `quota` field structure is incorrect
**What was wrong:** The YAML showed `quota` as a nested object with `maxBytes` and `maxFiles` sub-fields. In the actual Rook CRD, `quota` is a scalar `resource.Quantity` value (e.g., `"500Gi"`), not an object. The `maxFiles` sub-field does not exist in the CRD.
**What was changed:** Replaced the nested `quota:` object with the scalar `quota: "500Gi"`. Removed the `maxFiles` field since the Rook CRD does not expose file/inode count quotas for CephFS subvolume groups.
**Why:** The original YAML would fail validation against the Rook CRD. The correct format is documented in the Rook example at `deploy/examples/subvolumegroup.yaml`.

### 3. Prometheus metric names are incorrect
**What was wrong:** The Prometheus alerting rule comment used `ceph_pool_quota_bytes_used / ceph_pool_quota_max_bytes > 0.85`. Neither `ceph_pool_quota_bytes_used` nor `ceph_pool_quota_max_bytes` are real Ceph MGR Prometheus metrics.
**What was changed:** Replaced with `ceph_pool_stored_raw / ceph_pool_quota_bytes > 0.85`.
**Why:** The correct metrics exported by the Ceph MGR Prometheus module are `ceph_pool_stored_raw` (raw bytes stored including replication overhead) and `ceph_pool_quota_bytes` (configured byte quota for the pool).

## Review Notes
- The Gatekeeper constraint `K8sStorageQuotaLimit` is presented as an example custom constraint template. This is not a built-in Gatekeeper template, but the blog appropriately frames it as something users would create themselves.
- The byte value comments in the Ceph CLI section say "1 TB" but the value 1099511627776 is technically 1 TiB (tebibyte). This is an extremely common informal usage and was not changed, but readers should be aware of the distinction.
- The Kubernetes ResourceQuota YAML is fully correct, including the per-StorageClass quota syntax and quantity formats.
- The Rook CRD does not support setting file/inode count quotas on CephFS subvolume groups. Users who need file count quotas would need to set them directly via Ceph CLI (`ceph fs subvolumegroup quota` commands or CephFS xattrs).
