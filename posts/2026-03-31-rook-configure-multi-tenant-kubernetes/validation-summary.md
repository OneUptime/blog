# Validation Summary: How to Configure Rook-Ceph for Multi-Tenant Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephBlockPool, CephFilesystemSubVolumeGroup CRDs)
- Kubernetes StorageClasses
- Kubernetes RBAC (ClusterRole, RoleBinding)
- Kubernetes ResourceQuota
- Ceph CLI tools

## Sources Consulted
- Rook-Ceph CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook-Ceph CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Ceph Logging and Debugging documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- kubernetes-csi/external-provisioner issue #213 (RBAC and StorageClass enforcement): https://github.com/kubernetes-csi/external-provisioner/issues/213

## Issues Found

### 1. CephBlockPool `quotas.maxBytes` field does not exist
**What was wrong:** The CephBlockPool YAML used `quotas.maxBytes` with raw integer byte values (e.g., `maxBytes: 10995116277760`). The correct field name is `quotas.maxSize`, which accepts a Kubernetes resource quantity string (e.g., `"10Ti"`).
**What was changed:** Replaced `maxBytes: 10995116277760` with `maxSize: "10Ti"` and `maxBytes: 5497558138880` with `maxSize: "5Ti"`.
**Why:** Per the official Rook CephBlockPool CRD documentation, the `quotas` section supports `maxSize` (string) and `maxObjects` (integer), not `maxBytes`.

### 2. RBAC comment overstated StorageClass access restriction
**What was wrong:** The YAML comment stated "Allow only tenant-a namespace to use tenant-a storage class". In Kubernetes, RBAC on StorageClass `get`/`list` verbs does NOT prevent users from creating PVCs that reference that StorageClass. The PVC creation check only validates the user's ability to create PVC resources, not their access to the StorageClass object.
**What was changed:** Updated the comment to "Restrict visibility of tenant-a storage class (use with ResourceQuota or an admission controller like OPA Gatekeeper to enforce usage)" to accurately reflect what RBAC achieves here.
**Why:** This is a documented limitation in Kubernetes. True StorageClass usage enforcement requires admission controllers (OPA Gatekeeper, Kyverno) or ResourceQuotas, not just RBAC on StorageClass objects.

### 3. CephFilesystemSubVolumeGroup `quota` field structure was incorrect
**What was wrong:** The YAML used a nested `quota` object with `maxBytes: 1073741824000` and `maxFiles: 1000000`. The CephFilesystemSubVolumeGroup CRD uses a flat `quota` field that accepts a single Kubernetes resource quantity string. Additionally, the value 1,073,741,824,000 bytes equals 1000 GiB, not "1 TB" as the comment stated (1 TiB = 1,099,511,627,776 bytes).
**What was changed:** Replaced the nested `quota` object with `quota: "1Ti"`.
**Why:** Per the official Rook CephFilesystemSubVolumeGroup CRD documentation, `quota` is a flat field accepting a resource quantity, not a nested object with `maxBytes`/`maxFiles` sub-fields.

### 4. Audit section used invalid Ceph config option and irrelevant RGW references
**What was wrong:** The audit commands used `ceph config set global debug_rgw_access 1` (not a valid Ceph config key) and checked RGW deployment logs (`rook-ceph-rgw-my-store`). RGW (RADOS Gateway) is for S3/Swift object storage and is irrelevant to block storage (RBD) and CephFS multi-tenancy, which is the topic of this post.
**What was changed:** Replaced with appropriate commands: `ceph osd pool get-quota` to check pool quota enforcement, `ceph osd pool stats` to monitor per-tenant pool usage, and `ceph auth ls` to review Ceph auth capabilities for tenant isolation.
**Why:** The valid Ceph debug subsystem for RGW is `debug_rgw`, not `debug_rgw_access`. More importantly, RGW is not relevant to this post's block/CephFS multi-tenancy topic — pool stats and auth capabilities are the correct things to audit.

## Review Notes
- The post's approach of combining RBAC (for visibility restriction), ResourceQuota (for enforcement), and per-tenant Ceph pools is a sound multi-tenancy strategy. For stricter StorageClass enforcement, an admission controller (OPA Gatekeeper or Kyverno) would complement this setup.
- The StorageClass YAML omits `reclaimPolicy` (defaults to `Delete`) and `imageFormat`/`imageFeatures` parameters, which is acceptable as Rook provides sensible defaults.
- No specific Rook version is mentioned. The `quotas` field on CephBlockPool and `quota` on CephFilesystemSubVolumeGroup require Rook v1.7+.
